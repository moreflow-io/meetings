import { describe, expect, it } from 'vitest';
import {
  createMeetingClient,
  createMeetingOperationTransport,
  createMeetingReservationFlow,
  type MeetingsOperationId,
  MoreflowMeetingsError,
  meetingAccountId,
  meetingBookingId,
  meetingCalendarId,
  meetingReservationId,
  meetingsOperationIds,
  meetingTypeId,
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
    accountId,
    meetingTypeId: meetingType,
    calendarId,
    guest: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test'
    },
    startsAt: '2026-08-25T10:00:00.000Z',
    endsAt: '2026-08-25T10:30:00.000Z',
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
      baseUrl: 'https://api.moreflow.test/',
      fetchImpl: async (input, init) => {
        requests.push(new Request(input, init));
        return operationResponse({ success: true });
      }
    });

    await transport.getBranding({ slug: 'alpha' });
    await transport.getSlots({
      meetingTypeId: meetingType,
      date: '2026-08-25'
    });
    await transport.createReservation(
      {
        accountId,
        meetingTypeId: meetingType,
        calendarId,
        startsAt: '2026-08-25T10:00:00.000Z',
        endsAt: '2026-08-25T10:30:00.000Z'
      },
      { idempotencyKey: 'reservation-attempt' }
    );
    await transport.createBooking(bookingInput(), {
      idempotencyKey: 'booking-attempt'
    });
    await transport.reschedule(
      {
        token: 'manage-token',
        startsAt: '2026-08-26T10:00:00.000Z',
        endsAt: '2026-08-26T10:30:00.000Z'
      },
      { idempotencyKey: 'reschedule-attempt' }
    );

    expect(requests.map((request) => request.url)).toEqual([
      'https://api.moreflow.test/v1/operations/company.branding.getPublicBySlug',
      'https://api.moreflow.test/v1/operations/meetings.availability.getPublicSlots',
      'https://api.moreflow.test/v1/operations/meetings.reservations.createReservation',
      'https://api.moreflow.test/v1/operations/bookings.public.create',
      'https://api.moreflow.test/v1/operations/meetings.reschedule.publicReschedule'
    ]);
    expect(requests.every((request) => !request.headers.has('ngrok-skip-browser-warning'))).toBe(
      true
    );
    expect(requests[2]?.headers.get('idempotency-key')).toBe('reservation-attempt');
    expect(requests[3]?.headers.get('idempotency-key')).toBe('booking-attempt');
    expect(await requests[2]?.json()).toMatchObject({
      idempotencyKey: 'reservation-attempt'
    });
  });

  it('captures acquisition tracking into booking payloads with caller precedence', async () => {
    let body: Record<string, unknown> | undefined;
    const meetings = createMeetingClient({
      baseUrl: 'https://api.moreflow.test',
      acquisitionTracking: true,
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
            error: {
              code: 'CONFLICT',
              message: 'Slot is unavailable.',
              recovery
            }
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
      operationFailure: {
        code: 'CONFLICT',
        message: 'Slot is unavailable.',
        recovery
      }
    });
  });

  it('does not expose the service-only paid booking reconciliation job', () => {
    const transport = createMeetingOperationTransport({
      fetchImpl: async () => operationResponse({})
    });
    expect(Object.values(meetingsOperationIds)).not.toContain('bookings.public.reconcilePaid');
    expect('reconcilePaid' in transport).toBe(false);
  });

  it('uses a fresh reservation idempotency key per slot and honours an explicit key', async () => {
    const keys: Array<string | undefined> = [];
    let active = true;
    let failNext = false;
    const flow = createMeetingReservationFlow({
      createReservation: async (_input, options) => {
        keys.push(options?.idempotencyKey);
        if (failNext) {
          failNext = false;
          throw new MoreflowMeetingsError({
            message: 'Network down.',
            retryable: true
          });
        }
        return {
          success: true as const,
          reservation_id: reservationId,
          expires_at: '2026-08-25T10:15:00.000Z',
          reservation: {}
        };
      },
      getActiveReservation: async () => ({ isActive: active }),
      cancelReservation: async () => ({ success: true as const }),
      createBooking: async () => {
        throw new Error('not reached');
      }
    });
    const slot = (startsAt: string) => ({
      accountId,
      meetingTypeId: meetingType,
      startsAt,
      endsAt: '2026-08-25T11:00:00.000Z'
    });

    await flow.reserve(slot('2026-08-25T10:00:00.000Z'));
    await flow.reserve(slot('2026-08-25T10:30:00.000Z'));
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBeTruthy();
    expect(keys[1]).not.toBe(keys[0]);

    // A failed attempt keeps its key for an identical retry; another slot rotates it.
    failNext = true;
    await expect(flow.reserve(slot('2026-08-25T11:00:00.000Z'))).rejects.toBeInstanceOf(
      MoreflowMeetingsError
    );
    await flow.reserve(slot('2026-08-25T11:00:00.000Z'));
    expect(keys[3]).toBe(keys[2]);
    failNext = true;
    await expect(flow.reserve(slot('2026-08-25T11:30:00.000Z'))).rejects.toBeInstanceOf(
      MoreflowMeetingsError
    );
    await flow.reserve(slot('2026-08-25T12:00:00.000Z'));
    expect(keys[5]).not.toBe(keys[4]);

    // An explicit key always wins, including over a pending failed attempt.
    failNext = true;
    await expect(flow.reserve(slot('2026-08-25T12:30:00.000Z'))).rejects.toBeInstanceOf(
      MoreflowMeetingsError
    );
    await flow.reserve({
      ...slot('2026-08-25T12:30:00.000Z'),
      idempotencyKey: 'caller-key'
    });
    expect(keys[7]).toBe('caller-key');

    // Cancel and expiry discard keys, even when selecting the same slot again.
    await flow.cancel();
    await flow.reserve(slot('2026-08-25T13:00:00.000Z'));
    active = false;
    await flow.refresh();
    expect(flow.getState().status).toBe('expired');
    await flow.reserve(slot('2026-08-25T13:00:00.000Z'));
    expect(keys[9]).not.toBe(keys[8]);
    expect(keys).toHaveLength(10);
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
      getActiveReservation: async () => ({
        isActive: true,
        reservation_id: reservationId
      }),
      cancelReservation: async () => {
        calls.push('cancel');
        return { success: true as const };
      },
      createBooking: async (input) => {
        calls.push('book');
        expect(input.reservationId).toBe(reservationId);
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
      accountId,
      meetingTypeId: meetingType,
      calendarId,
      startsAt: '2026-08-25T10:00:00.000Z',
      endsAt: '2026-08-25T10:30:00.000Z'
    });
    await flow.book(bookingInput());
    expect(flow.getState().status).toBe('booked');
    expect(calls).toEqual(['reserve', 'book']);

    const cancellable = createMeetingReservationFlow({
      ...{
        createReservation: async () => reservation,
        getActiveReservation: async () => ({
          isActive: true,
          reservation_id: reservationId
        }),
        createBooking: async () => {
          throw new Error('not reached');
        }
      },
      cancelReservation: async () => ({ success: true as const })
    });
    await cancellable.reserve({
      accountId,
      meetingTypeId: meetingType,
      startsAt: '2026-08-25T10:00:00.000Z',
      endsAt: '2026-08-25T10:30:00.000Z'
    });
    await cancellable.cancel();
    expect(cancellable.getState()).toEqual({
      status: 'cancelled',
      reservationId
    });

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

describe('@moreflow/meetings family conventions', () => {
  it('calls the production API by default instead of the embedding page origin', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'location');
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: {
        origin: 'https://customer.example',
        href: 'https://customer.example/book'
      }
    });
    try {
      const urls: string[] = [];
      const transport = createMeetingOperationTransport({
        fetchImpl: async (input) => {
          urls.push(String(input));
          return operationResponse(null);
        }
      });
      await transport.getCalendar({ meetingTypeId: meetingType });
      expect(urls).toEqual([
        'https://api.moreflow.io/v1/operations/calendars.index.getPublicByMeetingType'
      ]);
    } finally {
      if (original) Object.defineProperty(globalThis, 'location', original);
      else Reflect.deleteProperty(globalThis, 'location');
    }
  });

  it('maps camelCase slot fields to the booking operation contract', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const transport = createMeetingOperationTransport({
      fetchImpl: async (_input, init) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return operationResponse(null);
      }
    });

    await transport.getCalendar({ meetingTypeId: meetingType });
    await transport.createBooking({
      accountId,
      meetingTypeId: meetingType,
      calendarId,
      startsAt: '2026-08-25T10:00:00.000Z',
      endsAt: '2026-08-25T10:30:00.000Z',
      guest: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.test'
      },
      timezone: 'Europe/Berlin'
    });
    await transport.createBooking(bookingInput());

    expect(bodies[0]).toEqual({ meeting_type_id: meetingType });
    expect(bodies[1]).toEqual(bodies[2]);
    expect(bodies[1]).not.toHaveProperty('startsAt');
  });

  it('reports an aborted request as ABORTED instead of a retryable network error', async () => {
    const controller = new AbortController();
    const transport = createMeetingOperationTransport({
      fetchImpl: async () => {
        controller.abort();
        throw new DOMException('The operation was aborted.', 'AbortError');
      }
    });

    await expect(
      transport.call(
        meetingsOperationIds.brandingGetBySlug,
        { slug: 'alpha' },
        {
          signal: controller.signal
        }
      )
    ).rejects.toMatchObject({
      name: 'MoreflowMeetingsError',
      code: 'ABORTED',
      retryable: false
    });
  });

  it('types recovery and merges operation context into details', async () => {
    const transport = createMeetingOperationTransport({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            error: {
              category: 'FAILED_PRECONDITION',
              code: 'INVALID_CODE',
              message: 'The code is wrong.',
              recovery: {
                operation: 'clients.checkoutOtp.requestPublic',
                args: { accountId }
              },
              details: { attemptsRemaining: 2 },
              requestId: 'req_9'
            }
          }),
          { status: 400 }
        )
    });

    const failure = await transport
      .verifyCheckoutOtp({ accountId, otpId: 'otp-1', code: '000000' })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(MoreflowMeetingsError);
    expect(failure).toMatchObject({
      code: 'INVALID_CODE',
      status: 400,
      retryable: false,
      recovery: {
        operation: 'clients.checkoutOtp.requestPublic',
        args: { accountId }
      },
      details: { attemptsRemaining: 2 },
      requestId: 'req_9'
    });
  });
});
