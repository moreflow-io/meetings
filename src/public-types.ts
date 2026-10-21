export type MeetingRecord = Record<string, unknown>;

declare const meetingAccountIdBrand: unique symbol;
declare const meetingTypeIdBrand: unique symbol;
declare const meetingReservationIdBrand: unique symbol;
declare const meetingBookingIdBrand: unique symbol;
declare const meetingCalendarIdBrand: unique symbol;

export type MeetingAccountId = string & {
  readonly [meetingAccountIdBrand]: 'MeetingAccountId';
};
export type MeetingTypeId = string & {
  readonly [meetingTypeIdBrand]: 'MeetingTypeId';
};
export type MeetingReservationId = string & {
  readonly [meetingReservationIdBrand]: 'MeetingReservationId';
};
export type MeetingBookingId = string & {
  readonly [meetingBookingIdBrand]: 'MeetingBookingId';
};
export type MeetingCalendarId = string & {
  readonly [meetingCalendarIdBrand]: 'MeetingCalendarId';
};

/** Brand externally supplied public account ids at the package boundary. */
export function meetingAccountId(value: string): MeetingAccountId {
  return value as MeetingAccountId; // Public API payload boundary.
}

/** Brand externally supplied public meeting type ids at the package boundary. */
export function meetingTypeId(value: string): MeetingTypeId {
  return value as MeetingTypeId; // Public API payload boundary.
}

/** Brand opaque server-issued reservation bearer capabilities at the boundary. */
export function meetingReservationId(value: string): MeetingReservationId {
  return value as MeetingReservationId; // Public API payload boundary.
}

/** Brand server-issued public booking ids at the package boundary. */
export function meetingBookingId(value: string): MeetingBookingId {
  return value as MeetingBookingId; // Public API payload boundary.
}

/** Brand externally supplied public calendar ids at the package boundary. */
export function meetingCalendarId(value: string): MeetingCalendarId {
  return value as MeetingCalendarId; // Public API payload boundary.
}

export type PublicMeetingBranding = MeetingRecord & {
  account_id: MeetingAccountId;
  name: string;
  timezone: string;
  language: 'de' | 'en';
  logo_url: string | null;
  data_privacy_url: string | null;
  imprint_url: string | null;
  terms_of_service_url: string | null;
};

export type PublicMeetingType = MeetingRecord & {
  _id: MeetingTypeId;
  account_id: MeetingAccountId;
  name: string;
  slug: string;
  duration: number;
  timezone: string;
  description?: string | undefined;
  location?: PublicBookingDetails['locationType'] | undefined;
  payment_required: boolean;
  custom_booking_checkboxes: Array<Omit<PublicBookingCustomCheckbox, 'checked'>>;
};

export type PublicMeetingAvailability = MeetingRecord & {
  accountId: MeetingAccountId;
  meetingTypeId: MeetingTypeId;
  timezone: string;
  availability: Array<{
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    isAvailable: boolean;
    start: string;
    end: string;
    breaks?: Array<{ start: string; end: string }> | undefined;
  }>;
  bufferBefore: number;
  bufferAfter: number;
  blockAllDayEvents: boolean;
};

export type PublicMeetingSlots = {
  date: string;
  timezone: string;
  slots: string[];
  degraded: boolean;
  availabilitySources: {
    externalCalendar: 'available' | 'degraded' | 'not_required';
  };
  availabilityWindows: number;
  blockingMeetings: number;
  blockingReservations: number;
  blockingExternalEvents: number;
};

export type PublicMeetingCalendar = MeetingRecord & {
  _id: MeetingCalendarId;
  id: MeetingCalendarId;
  account_id: MeetingAccountId;
  owner_user_id: string;
  provider: string;
  name: string;
  timezone: string;
};

export type PublicBookingAddress = {
  street: string;
  postal: string;
  city: string;
  state?: string | undefined;
  country: string;
};

export type PublicBookingAdditionalGuest = { email: string; name: string };
export type PublicBookingCustomCheckbox = {
  id: string;
  checked: boolean;
  required: boolean;
  text: { en: string; de: string };
};

/** The slot a booking is for. */
export type PublicBookingSlot = {
  accountId: MeetingAccountId;
  meetingTypeId: MeetingTypeId;
  calendarId: MeetingCalendarId;
  /** ISO date-time the meeting starts. */
  startsAt: string;
  /** ISO date-time the meeting ends. */
  endsAt: string;
};

/** Everything a booking carries besides its slot and reservation. */
export type PublicBookingDetails = {
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string | undefined;
  };
  timezone: string;
  additionalGuests?: PublicBookingAdditionalGuest[] | undefined;
  meetingName?: string | undefined;
  locationType?: 'physical' | 'phone' | 'google_meet' | 'microsoft_teams' | 'fahrplan' | undefined;
  locationAddress?: PublicBookingAddress | undefined;
  billingAddress?: PublicBookingAddress | undefined;
  paymentId?: string | undefined;
  paymentStatus?: string | undefined;
  paymentMethod?: string | undefined;
  amountPaid?: number | undefined;
  customCheckboxes?: PublicBookingCustomCheckbox[] | undefined;
  privacyConsent?: boolean | undefined;
  marketingConsent?: boolean | undefined;
  locale?: 'de' | 'en' | undefined;
  gclid?: string | undefined;
  fbclid?: string | undefined;
  fbp?: string | undefined;
  fbc?: string | undefined;
  ttclid?: string | undefined;
  ttp?: string | undefined;
  tiktokEventId?: string | undefined;
  attribution?: MeetingRecord | undefined;
  checkoutVerificationToken?: string | undefined;
};

/** A booking for a reservation flow, which adds the held reservation itself. */
export type PublicBookingFlowInput = PublicBookingDetails & PublicBookingSlot;

export type PublicBookingCreateInput = PublicBookingFlowInput & {
  reservationId?: MeetingReservationId | undefined;
};

export type PublicBookingCreateOutput = {
  success: true;
  meeting_id: MeetingBookingId;
  reservation_id: MeetingReservationId;
  reservation_expires_at: string;
  guest_email: string;
  trace: MeetingRecord;
};

/** The slot a reservation holds. */
export type PublicReservationSlot = {
  accountId: MeetingAccountId;
  meetingTypeId: MeetingTypeId;
  calendarId?: MeetingCalendarId | undefined;
  startsAt: string;
  endsAt: string;
};

export type PublicReservationCreateInput = PublicReservationSlot &
  Omit<Partial<PublicBookingDetails>, 'guest' | 'additionalGuests'> & {
    timezone?: string | undefined;
    guestEmail?: string | undefined;
    guestFirstName?: string | undefined;
    guestLastName?: string | undefined;
    guestPhone?: string | undefined;
    additionalGuests?: string | PublicBookingAdditionalGuest[] | undefined;
    notes?: string | undefined;
    idempotencyKey?: string | undefined;
  };

export type PublicReservationCreateOutput = {
  success: true;
  reservation_id: MeetingReservationId;
  expires_at: string;
  reservation: MeetingRecord;
};

export type PublicReservationStatus = {
  isActive: boolean;
  reservation_id?: MeetingReservationId | undefined;
  expiresAt?: string | undefined;
  status?: string | undefined;
};

export type PublicPaidBookingFinalizeInput = {
  accountId: MeetingAccountId;
  paymentId?: string | undefined;
  providerPaymentId?: string | undefined;
  reservationId?: MeetingReservationId | undefined;
};

export type PublicCheckoutOtpRequestInput = {
  accountId: MeetingAccountId;
  email: string;
  preferredChannel?: 'email' | 'sms' | undefined;
};

export type PublicCheckoutOtpRequestOutput = {
  success: true;
  otpId: string;
  channel: 'email' | 'sms';
  channelHint?: string | undefined;
  hasAlternativeChannel: boolean;
  trace: MeetingRecord;
};

export type PublicCheckoutOtpVerifyInput = {
  accountId: MeetingAccountId;
  otpId: string;
  code: string;
};
export type PublicCheckoutOtpVerifyOutput = {
  success: true;
  checkoutVerificationToken: string;
  clientData: {
    firstName: string;
    lastName: string;
    phone?: string | undefined;
    company?: string | undefined;
    address?: Partial<PublicBookingAddress> | undefined;
  };
  trace: MeetingRecord;
};

export type PublicStripePaymentIntentInput = {
  accountId: MeetingAccountId;
  meetingTypeId: MeetingTypeId;
  reservationId: MeetingReservationId;
  paymentMethod?: 'card' | 'klarna' | undefined;
  idempotencyKey?: string | undefined;
  customerDetails?:
    | {
        firstName?: string | undefined;
        lastName?: string | undefined;
        email?: string | undefined;
        phone?: string | undefined;
        address?: PublicBookingAddress | undefined;
      }
    | undefined;
};

export type PublicStripePaymentIntentOutput = MeetingRecord & {
  success: true;
  id?: string | undefined;
  clientSecret?: string | undefined;
  paymentIntentId?: string | undefined;
};

export type PublicRescheduleValidation = MeetingRecord & {
  allowed: boolean;
  reason?: string | undefined;
  meeting: MeetingRecord | null;
};
export type PublicRescheduleInput = {
  token: string;
  startsAt: string;
  endsAt: string;
};
export type PublicCancelInput = { token: string; reason?: string | undefined };
export type PublicManageMeetingOutput = {
  success: boolean;
  meeting: MeetingRecord | null;
};
