import { describe, expect, it } from 'vitest';
import {
  createMeetingClient,
  createMeetingOperationTransport,
  createMeetingReservationFlow,
  meetingAccountId,
  meetingBookingId,
  meetingCalendarId,
  meetingReservationId,
  meetingTypeId,
  meetingsOperationIds,
  MoreflowMeetingsError,
  type MeetingsOperationId,
  type PublicBookingCreateInput
} from './index';

const accountId = meetingAccountId('10000000-0000-4000-8000-000000000001');
const meetingType = meetingTypeId('10000000-0000-4000-8000-000000000002');
const calendarId = meetingCalendarId('10000000-0000-4000-8000-000000000003');
const reservationId = meetingReservationId('10000000-0000-4000-8000-000000000004');

function operationResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function bookingInput(): PublicBookingCreateInput {
  return {
    account_id: accountId,
    meeting_type_id: meetingType,
    calendar_id: calendarId,
    guest: { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.test' },
    dateTime: { start: '2026-08-25T10:00:00.000Z', end: '2026-08-25T10:30:00.000Z' },
    timezone: 'Europe/Berlin'
  };
}

describe('@moreflow/meetings', () => {
  it('covers every public meeting operation id', () => {
    expect(Object.values(meetingsOperationIds)).toEqual([
      'company.branding.getPublicBySlug',
      'meetings.types.listPublicBySlug',
      'meetings.types.getPublicBySlugs',
      'meetings.availability.getPublicSlots',
      'calendars.availability.getPublicByMeetingType',
      'calendars.index.getPublicByMeetingType',
      'meetings.reservations.createReservation',
      'meetings.reservations.getActiveReservation',
      'meetings.reservations.cancel',
      'bookings.public.create',
      'meetings.checkout.createStripePaymentIntent',
      'bookings.public.finalizePaid',
      'bookings.public.reconcilePaid',
      'clients.checkoutOtp.requestPublic',
      'clients.checkoutOtp.verifyPublic',
      'meetings.reschedule.validateReschedule',
      'meetings.reschedule.publicReschedule',
      'meetings.cancel.publicCancel'
    ] satisfies MeetingsOperationId[]);
  });

  it('calls public operations through the typed transport and forwards idempotency keys', async () => {
    const requests: Request[] = [];
    const transport = createMeetingOperationTransport({
      apiBaseUrl: 'https://api.moreflow.test/',
      fetchImpl: async (input, init) => {
        requests.push(new Request(input, init));
        return operationResponse({ success: true });
      }
    });

    await transport.getBranding({ slug: 'alpha' });
    await transport.getSlots({ meetingTypeId: meetingType, date: '2026-08-25' });
    await transport.createReservation(
      {
        account_id: accountId,
        meeting_type_id: meetingType,
        calendar_id: calendarId,
        startsAt: '2026-08-25T10:00:00.000Z',
        endsAt: '2026-08-25T10:30:00.000Z'
      },
      { idempotencyKey: 'reservation-attempt' }
    );
    await transport.createBooking(bookingInput(), { idempotencyKey: 'booking-attempt' });
    await transport.reschedule(
      {
        token: 'manage-token',
        newStarting: '2026-08-26T10:00:00.000Z',
        newEnd: '2026-08-26T10:30:00.000Z'
      },
      { idempotencyKey: 'reschedule-attempt' }
    );

    expect(requests.map((request) => request.url)).toEqual([
      'https://api.moreflow.test/api/v1/operations/company.branding.getPublicBySlug',
      'https://api.moreflow.test/api/v1/operations/meetings.availability.getPublicSlots',
      'https://api.moreflow.test/api/v1/operations/meetings.reservations.createReservation',
      'https://api.moreflow.test/api/v1/operations/bookings.public.create',
      'https://api.moreflow.test/api/v1/operations/meetings.reschedule.publicReschedule'
    ]);
    expect(requests[2]?.headers.get('idempotency-key')).toBe('reservation-attempt');
    expect(requests[3]?.headers.get('idempotency-key')).toBe('booking-attempt');
    expect(await requests[2]?.json()).toMatchObject({ idempotencyKey: 'reservation-attempt' });
  });

  it('captures acquisition tracking into booking payloads with caller precedence', async () => {
    let body: Record<string, unknown> | undefined;
    const meetings = createMeetingClient({
      apiBaseUrl: 'https://api.moreflow.test',
      trackingCapture: () => ({
        gclid: 'captured-click',
        fbclid: 'captured-meta',
        utm_source: 'newsletter',
        page_url: 'https://customer.example/book'
      }),
      fetchImpl: async (_input, init) => {
        body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return operationResponse({
          success: true,
          meeting_id: meetingBookingId('10000000-0000-4000-8000-000000000005'),
          reservation_id: reservationId,
          reservation_expires_at: '2026-08-25T10:15:00.000Z',
          guest_email: 'ada@example.test',
          trace: {}
        });
      }
    });

    await meetings.createBooking({ ...bookingInput(), gclid: 'caller-click' });

    expect(body).toMatchObject({
      gclid: 'caller-click',
      fbclid: 'captured-meta',
      attribution: {
        gclid: 'captured-click',
        utm_source: 'newsletter',
        page_url: 'https://customer.example/book'
      }
    });
  });

  it('retains structured error recovery without rewriting it', async () => {
    const recovery = {
      operation: 'meetings.availability.getPublicSlots',
      args: { meetingTypeId: meetingType }
    };
    const transport = createMeetingOperationTransport({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'CONFLICT', message: 'Slot is unavailable.', recovery }
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
    });

    await expect(
      transport.getSlots({ meetingTypeId: meetingType, date: '2026-08-25' })
    ).rejects.toMatchObject({
      name: 'MoreflowMeetingsError',
      code: 'CONFLICT',
      recovery,
      operationFailure: { code: 'CONFLICT', message: 'Slot is unavailable.', recovery }
    });
  });

  it('composes server reservation, booking, and cancellation operations without UI state', async () => {
    const calls: string[] = [];
    const reservation = {
      success: true as const,
      reservation_id: reservationId,
      expires_at: '2026-08-25T10:15:00.000Z',
      reservation: {}
    };
    const flow = createMeetingReservationFlow({
      createReservation: async () => {
        calls.push('reserve');
        return reservation;
      },
      getActiveReservation: async () => ({ isActive: true, reservation_id: reservationId }),
      cancelReservation: async () => {
        calls.push('cancel');
        return { success: true as const };
      },
      createBooking: async (input) => {
        calls.push('book');
        expect(input.reservation_id).toBe(reservationId);
        return {
          success: true,
          meeting_id: meetingBookingId('10000000-0000-4000-8000-000000000005'),
          reservation_id: reservationId,
          reservation_expires_at: reservation.expires_at,
          guest_email: 'ada@example.test',
          trace: {}
        };
      }
    });

    await flow.reserve({
      account_id: accountId,
      meeting_type_id: meetingType,
      calendar_id: calendarId,
      startsAt: '2026-08-25T10:00:00.000Z',
      endsAt: '2026-08-25T10:30:00.000Z'
    });
    await flow.book(bookingInput());
    expect(flow.getState().status).toBe('booked');
    expect(calls).toEqual(['reserve', 'book']);

    const cancellable = createMeetingReservationFlow({
      ...{
        createReservation: async () => reservation,
        getActiveReservation: async () => ({ isActive: true, reservation_id: reservationId }),
        createBooking: async () => {
          throw new Error('not reached');
        }
      },
      cancelReservation: async () => ({ success: true as const })
    });
    await cancellable.reserve({
      account_id: accountId,
      meeting_type_id: meetingType,
      startsAt: '2026-08-25T10:00:00.000Z',
      endsAt: '2026-08-25T10:30:00.000Z'
    });
    await cancellable.cancel();
    expect(cancellable.getState()).toEqual({ status: 'cancelled', reservationId });

    await expect(
      createMeetingReservationFlow({
        createReservation: async () => reservation,
        getActiveReservation: async () => ({ isActive: true }),
        cancelReservation: async () => ({ success: true as const }),
        createBooking: async () => {
          throw new Error('not reached');
        }
      }).book(bookingInput())
    ).rejects.toBeInstanceOf(MoreflowMeetingsError);
  });
});
