import { describe, expect, it, vi } from 'vitest';
import {
  createMeetingClient,
  createMeetingReservationFlow,
  type MeetingReservationFlowOperations,
  MoreflowMeetingsError,
  meetingAccountId,
  meetingBookingId,
  meetingCalendarId,
  meetingReservationId,
  meetingTypeId,
  type PublicReservationCreateOutput
} from './index';

const reservationId = meetingReservationId('hold-1');
const nextId = meetingReservationId('hold-2');
const slot = {
  accountId: meetingAccountId('account'),
  meetingTypeId: meetingTypeId('type'),
  calendarId: meetingCalendarId('calendar'),
  startsAt: '2026-11-03T09:00:00.000Z',
  endsAt: '2026-11-03T09:30:00.000Z'
};
const bookingInput = {
  ...slot,
  timezone: 'Europe/Berlin',
  guest: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test' }
};
const hold = (id = reservationId): PublicReservationCreateOutput => ({
  success: true,
  reservation_id: id,
  expires_at: '2026-11-03T09:15:00.000Z',
  reservation: {}
});
const booking = {
  success: true as const,
  meeting_id: meetingBookingId('booking'),
  reservation_id: reservationId,
  reservation_expires_at: hold().expires_at,
  guest_email: 'ada@example.test',
  trace: {}
};

function fixture(overrides: Partial<MeetingReservationFlowOperations> = {}) {
  return {
    createReservation: vi.fn<MeetingReservationFlowOperations['createReservation']>(
      overrides.createReservation ?? (async () => hold())
    ),
    getActiveReservation: vi.fn<MeetingReservationFlowOperations['getActiveReservation']>(
      overrides.getActiveReservation ??
        (async () => ({
          isActive: true,
          reservation_id: reservationId,
          expiresAt: hold().expires_at
        }))
    ),
    cancelReservation: vi.fn<MeetingReservationFlowOperations['cancelReservation']>(
      overrides.cancelReservation ?? (async () => ({ success: true }))
    ),
    createBooking: vi.fn<MeetingReservationFlowOperations['createBooking']>(
      overrides.createBooking ?? (async () => booking)
    )
  };
}

describe('reservation flow resume and subscription', () => {
  it('resumes through the client after a reload, refreshes, and books the saved hold', async () => {
    const bodies: unknown[] = [];
    const meetings = createMeetingClient({
      fetchImpl: async (url, init) => {
        bodies.push(JSON.parse(String(init?.body)));
        return Response.json({
          success: true,
          data: String(url).endsWith('getActiveReservation')
            ? { isActive: true, reservation_id: reservationId, expiresAt: hold().expires_at }
            : booking
        });
      }
    });
    const flow = meetings.createReservationFlow({ reservationId });
    expect(flow.getSnapshot()).toEqual({ status: 'restoring', reservationId });
    await flow.refresh();
    expect(flow.getSnapshot()).toEqual({
      status: 'resumed',
      reservationId,
      expiresAt: hold().expires_at
    });
    await flow.book(bookingInput);
    expect(flow.getState()).toEqual({ status: 'booked', booking });
    expect(bodies[0]).toEqual({ reservation_id: reservationId });
    expect(bodies[1]).toMatchObject({ reservation_id: reservationId });
  });

  it('keeps a failed resume retryable, then exposes expired holds', async () => {
    const operations = fixture();
    operations.getActiveReservation
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ isActive: false });
    const flow = createMeetingReservationFlow(operations, { reservationId });
    const initial = flow.getSnapshot();
    await expect(flow.refresh()).rejects.toThrow('offline');
    expect(flow.getSnapshot()).toBe(initial);
    await expect(flow.refresh()).resolves.toEqual({ isActive: false });
    expect(flow.getSnapshot()).toEqual({ status: 'expired', reservationId });
    await expect(flow.book(bookingInput)).rejects.toMatchObject({ code: 'RESERVATION_REQUIRED' });
  });

  it('can cancel a saved hold without creating another reservation', async () => {
    const operations = fixture();
    const flow = createMeetingReservationFlow(operations, { reservationId });
    await flow.cancel();
    expect(operations.cancelReservation).toHaveBeenCalledWith({ reservationId }, {});
    expect(operations.createReservation).not.toHaveBeenCalled();
    expect(flow.getSnapshot()).toEqual({ status: 'cancelled', reservationId });
  });

  it('caches snapshots, notifies subscribers, and unsubscribes', async () => {
    const operations = fixture();
    const flow = createMeetingReservationFlow(operations);
    const listener = vi.fn();
    const unsubscribe = flow.subscribe(listener);
    expect(flow.getSnapshot()).toBe(flow.getSnapshot());
    const initial = flow.getSnapshot();
    await flow.reserve(slot);
    expect(flow.getSnapshot()).not.toBe(initial);
    expect(flow.getSnapshot()).toBe(flow.getState());
    expect(listener).toHaveBeenCalledTimes(1);
    await flow.refresh();
    expect(listener).toHaveBeenCalledTimes(1); // unchanged state keeps its identity
    unsubscribe();
    await flow.cancel();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('reservation replacement', () => {
  it('releases the previous hold before requesting an overlapping slot', async () => {
    const events: string[] = [];
    let active: string | undefined;
    let sequence = 0;
    const operations = fixture({
      createReservation: async () => {
        expect(active).toBeUndefined();
        active = `hold-${++sequence}`;
        events.push(`reserve:${active}`);
        return hold(meetingReservationId(active));
      },
      cancelReservation: async ({ reservationId: id }) => {
        expect(id).toBe(active);
        events.push(`cancel:${id}`);
        active = undefined;
        return { success: true };
      }
    });
    const flow = createMeetingReservationFlow(operations);
    await flow.reserve(slot);
    await flow.reserve({ ...slot, startsAt: '2026-11-03T09:15:00.000Z' });
    expect(events).toEqual(['reserve:hold-1', 'cancel:hold-1', 'reserve:hold-2']);
    expect(active).toBe(nextId);
  });

  it('retains the old hold and stops if cancellation fails', async () => {
    const operations = fixture();
    const flow = createMeetingReservationFlow(operations);
    await flow.reserve(slot);
    const previous = flow.getSnapshot();
    operations.cancelReservation.mockRejectedValueOnce(
      new MoreflowMeetingsError({ message: 'Paid hold', code: 'CONFLICT' })
    );
    await expect(flow.reserve({ ...slot, startsAt: 'later' })).rejects.toMatchObject({
      code: 'CONFLICT'
    });
    expect(flow.getSnapshot()).toBe(previous);
    expect(operations.createReservation).toHaveBeenCalledTimes(1);
  });

  it('retains the old hold on a transport failure during cancellation', async () => {
    const operations = fixture();
    const flow = createMeetingReservationFlow(operations);
    await flow.reserve(slot);
    const previous = flow.getSnapshot();
    operations.cancelReservation.mockRejectedValueOnce(
      new MoreflowMeetingsError({ message: 'Offline', code: 'NETWORK_ERROR', retryable: true })
    );
    await expect(flow.reserve({ ...slot, startsAt: 'later' })).rejects.toMatchObject({
      code: 'NETWORK_ERROR'
    });
    expect(flow.getSnapshot()).toBe(previous);
    expect(operations.createReservation).toHaveBeenCalledTimes(1);
  });

  it('reserves after refresh expires a held reservation without cancelling it again', async () => {
    const operations = fixture();
    operations.createReservation.mockResolvedValueOnce(hold()).mockResolvedValueOnce(hold(nextId));
    operations.getActiveReservation.mockResolvedValueOnce({ isActive: false });
    const flow = createMeetingReservationFlow(operations);
    await flow.reserve(slot);
    await flow.refresh();
    expect(flow.getSnapshot()).toEqual({ status: 'expired', reservationId });
    await flow.reserve(slot);
    expect(operations.cancelReservation).not.toHaveBeenCalled();
    expect(flow.getSnapshot()).toEqual({ status: 'held', reservation: hold(nextId) });
  });

  it('reports the released hold if replacement fails and reuses the creation retry key', async () => {
    const operations = fixture();
    const flow = createMeetingReservationFlow(operations, { reservationId });
    operations.createReservation
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(hold(nextId));
    await expect(flow.reserve(slot)).rejects.toThrow('offline');
    expect(flow.getSnapshot()).toEqual({ status: 'cancelled', reservationId });
    await flow.reserve(slot);
    expect(operations.cancelReservation).toHaveBeenCalledTimes(1);
    const calls = operations.createReservation.mock.calls;
    expect(calls[0]?.[1]?.idempotencyKey).toBeTruthy();
    expect(calls[1]?.[1]?.idempotencyKey).toBe(calls[0]?.[1]?.idempotencyKey);
    expect(flow.getSnapshot()).toEqual({ status: 'held', reservation: hold(nextId) });
  });

  it('serializes concurrent reserve calls so only the last hold survives', async () => {
    const pending: { complete?: (value: PublicReservationCreateOutput) => void } = {};
    const operations = fixture();
    operations.createReservation
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            pending.complete = resolve;
          })
      )
      .mockResolvedValueOnce(hold(nextId));
    const flow = createMeetingReservationFlow(operations);
    const first = flow.reserve(slot);
    const second = flow.reserve({ ...slot, startsAt: 'later' });
    await vi.waitFor(() => expect(pending.complete).toBeDefined());
    expect(operations.createReservation).toHaveBeenCalledTimes(1);
    pending.complete?.(hold());
    await Promise.all([first, second]);
    expect(operations.cancelReservation).toHaveBeenCalledExactlyOnceWith({ reservationId });
    expect(flow.getSnapshot()).toEqual({ status: 'held', reservation: hold(nextId) });
  });
});
