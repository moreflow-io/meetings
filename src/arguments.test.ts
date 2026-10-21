import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  createMeetingOperationTransport,
  meetingAccountId,
  meetingCalendarId,
  meetingReservationId,
  meetingTypeId,
  type PublicBookingCreateInput,
  type PublicMeetingBranding,
  type PublicMeetingType,
  type PublicReservationCreateInput,
  type PublicReservationStatus
} from './index';

const accountId = meetingAccountId('account');
const typeId = meetingTypeId('type');
const reservationId = meetingReservationId('reservation');

// Response fields follow backend/operations/public/public-legacy-output-shapes.ts.
expectTypeOf<PublicMeetingType['payment_required']>().toEqualTypeOf<boolean>();
expectTypeOf<PublicMeetingType['custom_booking_checkboxes'][number]>().toEqualTypeOf<{
  id: string;
  required: boolean;
  text: { en: string; de: string };
}>();
expectTypeOf<PublicMeetingBranding['data_privacy_url']>().toEqualTypeOf<string | null>();
expectTypeOf<
  Extract<keyof PublicReservationCreateInput, `${string}_${string}`>
>().toEqualTypeOf<never>();
expectTypeOf<
  Extract<keyof PublicBookingCreateInput, `${string}_${string}`>
>().toEqualTypeOf<never>();
expectTypeOf<Extract<keyof PublicReservationStatus, 'expires_at'>>().toEqualTypeOf<never>();

describe('camelCase arguments', () => {
  it('maps booking, reservation lifecycle, paid finalization and reschedule to server contracts', async () => {
    const requests: Array<{ id: string; body: unknown }> = [];
    const client = createMeetingOperationTransport({
      fetchImpl: async (url, init) => {
        requests.push({
          id: String(url).split('/').at(-1) ?? '',
          body: JSON.parse(String(init?.body))
        });
        return Response.json({
          success: true,
          data: {
            isActive: true,
            reservation_id: reservationId,
            expires_at: '2026-11-03T10:15:00.000Z',
            expiresAt: '2026-11-03T10:15:00.000Z'
          }
        });
      }
    });
    await client.createBooking({
      accountId,
      meetingTypeId: typeId,
      calendarId: meetingCalendarId('calendar'),
      reservationId,
      startsAt: '2026-11-03T10:00:00.000Z',
      endsAt: '2026-11-03T10:30:00.000Z',
      guest: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.test',
        phoneNumber: '+4915112345678'
      },
      timezone: 'Europe/Berlin',
      locationType: 'phone',
      locationAddress: { street: '', postal: '', city: '', country: 'DE' },
      billingAddress: { street: '', postal: '', city: '', country: 'DE' },
      paymentId: 'payment',
      paymentStatus: 'paid',
      paymentMethod: 'card',
      amountPaid: 120,
      privacyConsent: true,
      customCheckboxes: [],
      checkoutVerificationToken: 'proof'
    });
    expect(requests[0]?.body).toEqual({
      account_id: accountId,
      meeting_type_id: typeId,
      calendar_id: 'calendar',
      reservation_id: reservationId,
      dateTime: {
        start: '2026-11-03T10:00:00.000Z',
        end: '2026-11-03T10:30:00.000Z'
      },
      guest: {
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.test',
        phone_number: '+4915112345678'
      },
      timezone: 'Europe/Berlin',
      location_type: 'phone',
      location_address: { street: '', postal: '', city: '', country: 'DE' },
      billing_address: { street: '', postal: '', city: '', country: 'DE' },
      payment_id: 'payment',
      payment_status: 'paid',
      payment_method: 'card',
      amount_paid: 120,
      privacy_consent: true,
      custom_checkboxes: [],
      checkout_verification_token: 'proof'
    });
    expect(await client.getActiveReservation({ reservationId })).toEqual({
      isActive: true,
      reservation_id: reservationId,
      expiresAt: '2026-11-03T10:15:00.000Z'
    });
    await client.cancelReservation({ reservationId });
    await client.finalizePaid({
      accountId,
      reservationId,
      paymentId: 'payment',
      providerPaymentId: 'stripe'
    });
    await client.reschedule({
      token: 'token',
      startsAt: 'start',
      endsAt: 'end'
    });
    await client.createStripePaymentIntent({
      accountId,
      meetingTypeId: typeId,
      reservationId,
      customerDetails: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.test'
      }
    });
    await client.createReservation({
      accountId,
      meetingTypeId: typeId,
      startsAt: 'start',
      endsAt: 'end',
      guestEmail: 'ada@example.test',
      guestFirstName: 'Ada',
      guestLastName: 'Lovelace',
      guestPhone: '+49'
    });
    expect(requests.slice(1).map(({ body }) => body)).toEqual([
      { reservation_id: reservationId },
      { reservation_id: reservationId },
      {
        account_id: accountId,
        reservation_id: reservationId,
        payment_id: 'payment',
        provider_payment_id: 'stripe'
      },
      { token: 'token', newStarting: 'start', newEnd: 'end' },
      {
        accountId,
        meetingTypeId: typeId,
        reservationId,
        customerDetails: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.test'
        }
      },
      {
        accountId,
        meetingTypeId: typeId,
        startsAt: 'start',
        endsAt: 'end',
        guestEmail: 'ada@example.test',
        guestFirstName: 'Ada',
        guestLastName: 'Lovelace',
        guestPhone: '+49'
      }
    ]);
  });
});
