import type { PublicBookingCreateInput, PublicPaidBookingFinalizeInput } from './public-types';

/** Adapt the SDK's camelCase arguments to the public operation's wire contract. */
export function operationBookingInput(input: PublicBookingCreateInput): object {
  const {
    accountId,
    meetingTypeId,
    calendarId,
    startsAt,
    endsAt,
    guest,
    reservationId,
    locationType,
    locationAddress,
    billingAddress,
    paymentId,
    paymentStatus,
    paymentMethod,
    amountPaid,
    customCheckboxes,
    privacyConsent,
    marketingConsent,
    checkoutVerificationToken,
    ...details
  } = input;
  return {
    ...details,
    account_id: accountId,
    meeting_type_id: meetingTypeId,
    calendar_id: calendarId,
    dateTime: { start: startsAt, end: endsAt },
    guest: {
      first_name: guest.firstName,
      last_name: guest.lastName,
      email: guest.email,
      phone_number: guest.phoneNumber
    },
    reservation_id: reservationId,
    location_type: locationType,
    location_address: locationAddress,
    billing_address: billingAddress,
    payment_id: paymentId,
    payment_status: paymentStatus,
    payment_method: paymentMethod,
    amount_paid: amountPaid,
    custom_checkboxes: customCheckboxes,
    privacy_consent: privacyConsent,
    marketing_consent: marketingConsent,
    checkout_verification_token: checkoutVerificationToken
  };
}

export function operationFinalizePaidInput(input: PublicPaidBookingFinalizeInput): object {
  return {
    account_id: input.accountId,
    payment_id: input.paymentId,
    provider_payment_id: input.providerPaymentId,
    reservation_id: input.reservationId
  };
}
