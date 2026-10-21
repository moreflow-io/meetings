// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { describe, expect, it } from 'vitest';
import {
  createMeetingClient,
  meetingAccountId,
  meetingReservationId,
  meetingTypeId
} from './index';

describe('React useSyncExternalStore', () => {
  it('renders reserve, expiry and cancel transitions, with stable unchanged snapshots', async () => {
    let active = true;
    const id = meetingReservationId('saved-hold');
    const client = createMeetingClient({
      fetchImpl: async (url) =>
        Response.json({
          success: true,
          data: String(url).endsWith('getActiveReservation')
            ? { isActive: active }
            : {
                success: true,
                reservation_id: id,
                expires_at: '2026-11-03T09:15:00.000Z',
                reservation: {}
              }
        })
    });
    const flow = client.createReservationFlow();
    const slot = {
      accountId: meetingAccountId('account'),
      meetingTypeId: meetingTypeId('type'),
      startsAt: '2026-11-03T09:00:00.000Z',
      endsAt: '2026-11-03T09:30:00.000Z'
    };
    let renders = 0;
    const { result, unmount } = renderHook(() => {
      renders += 1;
      return useSyncExternalStore(flow.subscribe, flow.getSnapshot, flow.getSnapshot);
    });
    expect(result.current.status).toBe('idle');
    await act(async () => {
      await flow.reserve(slot);
    });
    expect(result.current.status).toBe('held');
    const held = result.current;
    const before = renders;
    await act(async () => {
      await flow.refresh();
    });
    expect(result.current).toBe(held);
    expect(renders).toBe(before);
    active = false;
    await act(async () => {
      await flow.refresh();
    });
    expect(result.current).toEqual({ status: 'expired', reservationId: id });
    await act(async () => {
      await flow.reserve(slot);
      await flow.cancel();
    });
    expect(result.current).toEqual({ status: 'cancelled', reservationId: id });
    const beforeUnmount = renders;
    unmount();
    await flow.reserve(slot);
    expect(renders).toBe(beforeUnmount);
  });

  it('renders a restored hold after refresh without another reserve', async () => {
    const id = meetingReservationId('saved-hold');
    const flow = createMeetingClient({
      fetchImpl: async () =>
        Response.json({
          success: true,
          data: {
            isActive: true,
            reservation_id: id,
            expiresAt: '2026-11-03T09:15:00.000Z'
          }
        })
    }).createReservationFlow({ reservationId: id });
    const { result } = renderHook(() =>
      useSyncExternalStore(flow.subscribe, flow.getSnapshot, flow.getSnapshot)
    );
    expect(result.current.status).toBe('restoring');
    await act(async () => {
      await flow.refresh();
    });
    expect(result.current).toEqual({
      status: 'resumed',
      reservationId: id,
      expiresAt: '2026-11-03T09:15:00.000Z'
    });
  });
});
