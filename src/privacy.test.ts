import { createMemoryStorage } from '@moreflow/tracking';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type CreateMeetingClientOptions,
  createMeetingClient,
  meetingAccountId,
  meetingBookingId,
  meetingCalendarId,
  meetingReservationId,
  meetingTypeId,
  type PublicBookingCreateInput
} from './index';

const reservationId = meetingReservationId('10000000-0000-4000-8000-000000000004');

afterEach(() => {
  vi.unstubAllGlobals();
});

function bookingInput(): PublicBookingCreateInput {
  return {
    accountId: meetingAccountId('10000000-0000-4000-8000-000000000001'),
    meetingTypeId: meetingTypeId('10000000-0000-4000-8000-000000000002'),
    calendarId: meetingCalendarId('10000000-0000-4000-8000-000000000003'),
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

function stubLandingPage() {
  vi.stubGlobal('location', {
    href: 'https://example.test/book?utm_source=google',
    search: ''
  });
  vi.stubGlobal('document', { cookie: '_fbp=fb.1.123.456', referrer: '' });
  const session = createMemoryStorage();
  vi.stubGlobal('sessionStorage', session);
  return session;
}

function recordingClient(options: Partial<CreateMeetingClientOptions> = {}) {
  const bodies: Record<string, unknown>[] = [];
  const client = createMeetingClient({
    baseUrl: 'https://api.moreflow.test',
    fetchImpl: async (input, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      if (String(input).endsWith('bookings.public.create')) bodies.push(body);
      const data = String(input).endsWith('meetings.reservations.createReservation')
        ? {
            success: true,
            reservation_id: reservationId,
            expires_at: '2026-08-25T10:15:00.000Z',
            reservation: {}
          }
        : {
            success: true,
            meeting_id: meetingBookingId('10000000-0000-4000-8000-000000000005'),
            reservation_id: reservationId,
            reservation_expires_at: '2026-08-25T10:15:00.000Z',
            guest_email: 'ada@example.test',
            trace: {}
          };
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    },
    ...options
  });
  return { client, bodies };
}

describe('@moreflow/meetings acquisitionTracking', () => {
  it('adds no tracking and reads no cookies by default', async () => {
    const session = stubLandingPage();
    const { client, bodies } = recordingClient();

    await client.createBooking(bookingInput());

    expect(bodies[0]).not.toHaveProperty('attribution');
    expect(bodies[0]).not.toHaveProperty('fbp');
    expect(session.getItem('moreflow:acquisition:v1')).toBeNull();
  });

  it('captures URL parameters and Meta cookies into the booking when enabled', async () => {
    stubLandingPage();
    const { client, bodies } = recordingClient({ acquisitionTracking: true });

    await client.createBooking(bookingInput());

    expect(bodies[0]).toMatchObject({
      fbp: 'fb.1.123.456',
      attribution: { utm_source: 'google', fbp: 'fb.1.123.456' }
    });
  });

  it('asks a consent function on every booking, including reservation-flow bookings', async () => {
    stubLandingPage();
    let consented = false;
    const trackingCapture = vi.fn(() => ({ utm_source: 'override' }));
    const { client, bodies } = recordingClient({
      acquisitionTracking: () => consented,
      trackingCapture
    });

    await client.createBooking(bookingInput());
    consented = true;
    const flow = client.createReservationFlow();
    await flow.reserve({
      accountId: meetingAccountId('10000000-0000-4000-8000-000000000001'),
      meetingTypeId: meetingTypeId('10000000-0000-4000-8000-000000000002'),
      calendarId: meetingCalendarId('10000000-0000-4000-8000-000000000003'),
      startsAt: '2026-08-25T10:00:00.000Z',
      endsAt: '2026-08-25T10:30:00.000Z'
    });
    await flow.book(bookingInput());

    expect(trackingCapture).toHaveBeenCalledTimes(1);
    expect(bodies[0]).not.toHaveProperty('attribution');
    expect(bodies[1]).toMatchObject({
      attribution: { utm_source: 'override' }
    });
  });
});
