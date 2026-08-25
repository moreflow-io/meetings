import {
  captureAcquisitionTracking,
  type AcquisitionTracking,
  type TrackingCaptureOptions
} from '@moreflow/tracking';

export {
  captureAcquisitionTracking,
  createMemoryStorage,
  type AcquisitionTracking,
  type StorageLike,
  type TrackingCaptureOptions
} from '@moreflow/tracking';

export const meetingsOperationIds = {
  brandingGetBySlug: 'company.branding.getPublicBySlug',
  meetingTypesListBySlug: 'meetings.types.listPublicBySlug',
  meetingTypeGetBySlugs: 'meetings.types.getPublicBySlugs',
  availabilityGetSlots: 'meetings.availability.getPublicSlots',
  availabilityGetByMeetingType: 'calendars.availability.getPublicByMeetingType',
  calendarGetByMeetingType: 'calendars.index.getPublicByMeetingType',
  reservationCreate: 'meetings.reservations.createReservation',
  reservationGetActive: 'meetings.reservations.getActiveReservation',
  reservationCancel: 'meetings.reservations.cancel',
  bookingCreate: 'bookings.public.create',
  checkoutCreateStripePaymentIntent: 'meetings.checkout.createStripePaymentIntent',
  bookingFinalizePaid: 'bookings.public.finalizePaid',
  bookingReconcilePaid: 'bookings.public.reconcilePaid',
  checkoutOtpRequest: 'clients.checkoutOtp.requestPublic',
  checkoutOtpVerify: 'clients.checkoutOtp.verifyPublic',
  rescheduleValidate: 'meetings.reschedule.validateReschedule',
  reschedulePublic: 'meetings.reschedule.publicReschedule',
  cancelPublic: 'meetings.cancel.publicCancel'
} as const;

export type MeetingsOperationId = (typeof meetingsOperationIds)[keyof typeof meetingsOperationIds];
export type MeetingRecord = Record<string, unknown>;

declare const meetingAccountIdBrand: unique symbol;
declare const meetingTypeIdBrand: unique symbol;
declare const meetingReservationIdBrand: unique symbol;
declare const meetingBookingIdBrand: unique symbol;
declare const meetingCalendarIdBrand: unique symbol;

export type MeetingAccountId = string & { readonly [meetingAccountIdBrand]: 'MeetingAccountId' };
export type MeetingTypeId = string & { readonly [meetingTypeIdBrand]: 'MeetingTypeId' };
export type MeetingReservationId = string & {
  readonly [meetingReservationIdBrand]: 'MeetingReservationId';
};
export type MeetingBookingId = string & { readonly [meetingBookingIdBrand]: 'MeetingBookingId' };
export type MeetingCalendarId = string & { readonly [meetingCalendarIdBrand]: 'MeetingCalendarId' };

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
  name?: string | undefined;
  timezone?: string | undefined;
  language?: 'de' | 'en' | undefined;
};

export type PublicMeetingType = MeetingRecord & {
  _id: MeetingTypeId;
  account_id: MeetingAccountId;
  name?: string | undefined;
  slug?: string | undefined;
  duration?: number | undefined;
  timezone?: string | undefined;
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
  availabilitySources: { externalCalendar: 'available' | 'degraded' | 'not_required' };
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

export type PublicBookingCreateInput = {
  account_id: MeetingAccountId;
  meeting_type_id: MeetingTypeId;
  calendar_id: MeetingCalendarId;
  guest: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string | undefined;
  };
  dateTime: { start: string; end: string };
  timezone: string;
  additionalGuests?: PublicBookingAdditionalGuest[] | undefined;
  meetingName?: string | undefined;
  location_type?: 'physical' | 'phone' | 'google_meet' | 'microsoft_teams' | 'fahrplan' | undefined;
  location_address?: PublicBookingAddress | undefined;
  billing_address?: PublicBookingAddress | undefined;
  payment_id?: string | undefined;
  payment_status?: string | undefined;
  payment_method?: string | undefined;
  amount_paid?: number | undefined;
  reservation_id?: MeetingReservationId | undefined;
  custom_checkboxes?: PublicBookingCustomCheckbox[] | undefined;
  privacy_consent?: boolean | undefined;
  gclid?: string | undefined;
  fbclid?: string | undefined;
  fbp?: string | undefined;
  fbc?: string | undefined;
  ttclid?: string | undefined;
  ttp?: string | undefined;
  tiktokEventId?: string | undefined;
  attribution?: MeetingRecord | undefined;
  checkout_verification_token?: string | undefined;
};

export type PublicBookingCreateOutput = {
  success: true;
  meeting_id: MeetingBookingId;
  reservation_id: MeetingReservationId;
  reservation_expires_at: string;
  guest_email: string;
  trace: MeetingRecord;
};

export type PublicReservationCreateInput = {
  account_id: MeetingAccountId;
  meeting_type_id: MeetingTypeId;
  calendar_id?: MeetingCalendarId | undefined;
  startsAt: string;
  endsAt: string;
  timezone?: string | undefined;
  guest_email?: string | undefined;
  guest_first_name?: string | undefined;
  guest_last_name?: string | undefined;
  guest_phone?: string | undefined;
  additional_guests?: string | PublicBookingAdditionalGuest[] | undefined;
  notes?: string | undefined;
  idempotencyKey?: string | undefined;
  [key: string]: unknown;
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
  expires_at?: string | undefined;
  expiresAt?: string | undefined;
  status?: string | undefined;
};

export type PublicPaidBookingFinalizeInput = {
  account_id: MeetingAccountId;
  payment_id?: string | undefined;
  provider_payment_id?: string | undefined;
  reservation_id?: MeetingReservationId | undefined;
};

export type PublicPaidBookingReconciliationInput = {
  account_id?: MeetingAccountId | undefined;
  received_after: string;
  limit?: number | undefined;
  dry_run?: boolean | undefined;
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

export type PublicStripePaymentIntentInput = MeetingRecord & {
  accountId?: MeetingAccountId | undefined;
  account_id?: MeetingAccountId | undefined;
  meetingTypeId?: MeetingTypeId | undefined;
  meeting_type_id?: MeetingTypeId | undefined;
  reservationId?: MeetingReservationId | undefined;
  reservation_id?: MeetingReservationId | undefined;
};

export type PublicStripePaymentIntentOutput = MeetingRecord & {
  success: true;
  id?: string | undefined;
  clientSecret?: string | undefined;
  paymentIntentId?: string | undefined;
};

export type PublicPaidBookingReconciliationOutput = {
  success: true;
  scanned: number;
  reconciled: number;
  manual_action_required: number;
  items: Array<
    MeetingRecord & {
      account_id: string;
      payment_id: string;
      action: 'already_linked' | 'finalized' | 'would_finalize' | 'manual_action';
    }
  >;
  trace: MeetingRecord;
};

export type PublicRescheduleValidation = MeetingRecord & {
  allowed: boolean;
  reason?: string | undefined;
  meeting: MeetingRecord | null;
};
export type PublicRescheduleInput = { token: string; newStarting: string; newEnd: string };
export type PublicCancelInput = { token: string; reason?: string | undefined };
export type PublicManageMeetingOutput = { success: boolean; meeting: MeetingRecord | null };

export type MeetingOperationRecovery = unknown;

/**
 * Normalized transport failure retaining the exact server envelope, including
 * recovery-bearing fields. Consumer UI decides how to present it.
 */
export class MoreflowMeetingsError extends Error {
  readonly status: number | undefined;
  readonly code: string | undefined;
  readonly retryable: boolean;
  readonly responseBody: unknown;
  readonly details: unknown;
  readonly recovery: MeetingOperationRecovery;
  readonly operationFailure: unknown;

  constructor(options: {
    message: string;
    status?: number | undefined;
    code?: string | undefined;
    retryable?: boolean | undefined;
    responseBody?: unknown;
    details?: unknown;
    recovery?: MeetingOperationRecovery;
    operationFailure?: unknown;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'MoreflowMeetingsError';
    this.status = options.status;
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.responseBody = options.responseBody;
    this.details = options.details;
    this.recovery = options.recovery;
    this.operationFailure = options.operationFailure;
  }
}

function isRecord(value: unknown): value is MeetingRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function retryableStatus(status: number | undefined) {
  return (
    status === 408 || status === 425 || status === 429 || (status !== undefined && status >= 500)
  );
}

function operationFailurePayload(payload: unknown): unknown {
  return isRecord(payload) && isRecord(payload.error) ? payload.error : payload;
}

function operationError(input: {
  responseBody: unknown;
  status?: number | undefined;
  cause?: unknown;
}): MoreflowMeetingsError {
  const failure = operationFailurePayload(input.responseBody);
  const record = isRecord(failure) ? failure : {};
  return new MoreflowMeetingsError({
    message:
      stringValue(record.message) ??
      (input.status
        ? `Meeting operation request failed with status ${input.status}.`
        : 'Meeting operation request failed.'),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(stringValue(record.code) ? { code: stringValue(record.code) } : {}),
    retryable: retryableStatus(input.status),
    responseBody: input.responseBody,
    ...(record.details !== undefined ? { details: record.details } : {}),
    ...(record.recovery !== undefined ? { recovery: record.recovery } : {}),
    operationFailure: failure,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

/** Return operation data while retaining server failures without reshaping them. */
export function normalizeMeetingOperationPayload<T = unknown>(payload: unknown): T {
  if (isRecord(payload) && payload.success === true && Object.hasOwn(payload, 'data')) {
    return payload.data as T;
  }
  if (isRecord(payload) && payload.success === false) {
    throw operationError({ responseBody: payload });
  }
  return payload as T;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function defaultApiBaseUrl() {
  try {
    return globalThis.location?.origin ?? '';
  } catch {
    return '';
  }
}

function normalizeApiBaseUrl(value: string | undefined) {
  return (value ?? defaultApiBaseUrl()).replace(/\/+$/u, '');
}

function resolveFetch(fetchImpl: typeof fetch | undefined): typeof fetch {
  if (fetchImpl) return fetchImpl;
  if (typeof globalThis.fetch === 'function') return globalThis.fetch.bind(globalThis);
  throw new Error('A fetch implementation is required to call Moreflow meeting operations.');
}

export function createMeetingRandomId(): string {
  try {
    const generated = globalThis.crypto?.randomUUID?.();
    if (generated) return generated;
  } catch {
    // Restricted browser contexts receive the same non-cryptographic fallback as chatbot identity.
  }
  return `mf_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export interface MeetingOperationRequestOptions {
  idempotencyKey?: string | undefined;
  signal?: AbortSignal | undefined;
}

export interface CreateMeetingOperationTransportOptions {
  apiBaseUrl?: string | undefined;
  fetchImpl?: typeof fetch | undefined;
}

export interface MeetingOperationTransport {
  call<T = unknown>(
    operationId: MeetingsOperationId,
    input: object,
    options?: MeetingOperationRequestOptions | undefined
  ): Promise<T>;
  getBranding(input: { slug: string }): Promise<PublicMeetingBranding | null>;
  listMeetingTypes(input: { slug: string }): Promise<PublicMeetingType[]>;
  getMeetingType(input: {
    accountSlug: string;
    meetingSlug: string;
  }): Promise<PublicMeetingType | null>;
  getSlots(input: {
    meetingTypeId: MeetingTypeId;
    date: string;
    mode?: 'optimized' | 'all' | undefined;
    interval?: number | undefined;
    bufferBefore?: number | undefined;
    bufferAfter?: number | undefined;
    blockAllDayEvents?: boolean | undefined;
  }): Promise<PublicMeetingSlots>;
  getAvailability(input: {
    meetingTypeId: MeetingTypeId;
  }): Promise<PublicMeetingAvailability | null>;
  getCalendar(input: { meeting_type_id: MeetingTypeId }): Promise<PublicMeetingCalendar | null>;
  createReservation(
    input: PublicReservationCreateInput,
    options?: MeetingOperationRequestOptions | undefined
  ): Promise<PublicReservationCreateOutput>;
  getActiveReservation(input: {
    reservation_id: MeetingReservationId;
  }): Promise<PublicReservationStatus>;
  cancelReservation(
    input: { reservation_id: MeetingReservationId },
    options?: MeetingOperationRequestOptions | undefined
  ): Promise<{ success: true }>;
  createBooking(
    input: PublicBookingCreateInput,
    options?: MeetingOperationRequestOptions | undefined
  ): Promise<PublicBookingCreateOutput>;
  createStripePaymentIntent(
    input: PublicStripePaymentIntentInput,
    options?: MeetingOperationRequestOptions | undefined
  ): Promise<PublicStripePaymentIntentOutput>;
  finalizePaid(
    input: PublicPaidBookingFinalizeInput,
    options?: MeetingOperationRequestOptions | undefined
  ): Promise<PublicBookingCreateOutput>;
  reconcilePaid(
    input: PublicPaidBookingReconciliationInput
  ): Promise<PublicPaidBookingReconciliationOutput>;
  requestCheckoutOtp(input: PublicCheckoutOtpRequestInput): Promise<PublicCheckoutOtpRequestOutput>;
  verifyCheckoutOtp(input: PublicCheckoutOtpVerifyInput): Promise<PublicCheckoutOtpVerifyOutput>;
  validateReschedule(input: { token: string }): Promise<PublicRescheduleValidation>;
  reschedule(
    input: PublicRescheduleInput,
    options?: MeetingOperationRequestOptions | undefined
  ): Promise<PublicManageMeetingOutput>;
  cancel(
    input: PublicCancelInput,
    options?: MeetingOperationRequestOptions | undefined
  ): Promise<PublicManageMeetingOutput>;
}

export function createMeetingOperationTransport(
  options: CreateMeetingOperationTransportOptions = {}
): MeetingOperationTransport {
  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl);
  const fetchImpl = resolveFetch(options.fetchImpl);

  async function call<T = unknown>(
    operationId: MeetingsOperationId,
    input: object,
    requestOptions: MeetingOperationRequestOptions = {}
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`${apiBaseUrl}/api/v1/operations/${operationId}`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'content-type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(requestOptions.idempotencyKey
            ? { 'idempotency-key': requestOptions.idempotencyKey }
            : {})
        },
        body: JSON.stringify(input),
        ...(requestOptions.signal ? { signal: requestOptions.signal } : {})
      });
    } catch (cause) {
      throw new MoreflowMeetingsError({
        message: 'The meeting operation request could not reach the network.',
        code: 'NETWORK_ERROR',
        retryable: true,
        responseBody: undefined,
        operationFailure: undefined,
        cause
      });
    }
    const payload = await readResponseBody(response);
    if (!response.ok) throw operationError({ responseBody: payload, status: response.status });
    return normalizeMeetingOperationPayload<T>(payload);
  }

  return {
    call,
    getBranding: (input) => call(meetingsOperationIds.brandingGetBySlug, input),
    listMeetingTypes: (input) => call(meetingsOperationIds.meetingTypesListBySlug, input),
    getMeetingType: (input) => call(meetingsOperationIds.meetingTypeGetBySlugs, input),
    getSlots: (input) => call(meetingsOperationIds.availabilityGetSlots, input),
    getAvailability: (input) => call(meetingsOperationIds.availabilityGetByMeetingType, input),
    getCalendar: (input) => call(meetingsOperationIds.calendarGetByMeetingType, input),
    createReservation: (input, requestOptions) =>
      call(
        meetingsOperationIds.reservationCreate,
        {
          ...input,
          ...(requestOptions?.idempotencyKey
            ? { idempotencyKey: requestOptions.idempotencyKey }
            : {})
        },
        requestOptions
      ),
    getActiveReservation: (input) => call(meetingsOperationIds.reservationGetActive, input),
    cancelReservation: (input, requestOptions) =>
      call(meetingsOperationIds.reservationCancel, input, requestOptions),
    createBooking: (input, requestOptions) =>
      call(meetingsOperationIds.bookingCreate, input, requestOptions),
    createStripePaymentIntent: (input, requestOptions) =>
      call(meetingsOperationIds.checkoutCreateStripePaymentIntent, input, requestOptions),
    finalizePaid: (input, requestOptions) =>
      call(meetingsOperationIds.bookingFinalizePaid, input, requestOptions),
    reconcilePaid: (input) => call(meetingsOperationIds.bookingReconcilePaid, input),
    requestCheckoutOtp: (input) => call(meetingsOperationIds.checkoutOtpRequest, input),
    verifyCheckoutOtp: (input) => call(meetingsOperationIds.checkoutOtpVerify, input),
    validateReschedule: (input) => call(meetingsOperationIds.rescheduleValidate, input),
    reschedule: (input, requestOptions) =>
      call(meetingsOperationIds.reschedulePublic, input, requestOptions),
    cancel: (input, requestOptions) =>
      call(meetingsOperationIds.cancelPublic, input, requestOptions)
  };
}

/** Merge canonical acquisition capture into the booking contract with caller precedence. */
export function withMeetingAcquisitionTracking(
  input: PublicBookingCreateInput,
  tracking: AcquisitionTracking
): PublicBookingCreateInput {
  const attribution = { ...tracking, ...(input.attribution ?? {}) };
  return {
    ...input,
    ...((input.gclid ?? tracking.gclid) ? { gclid: input.gclid ?? tracking.gclid } : {}),
    ...((input.fbclid ?? tracking.fbclid) ? { fbclid: input.fbclid ?? tracking.fbclid } : {}),
    ...((input.fbp ?? tracking.fbp) ? { fbp: input.fbp ?? tracking.fbp } : {}),
    ...((input.fbc ?? tracking.fbc) ? { fbc: input.fbc ?? tracking.fbc } : {}),
    ...((input.ttclid ?? tracking.ttclid) ? { ttclid: input.ttclid ?? tracking.ttclid } : {}),
    ...((input.ttp ?? tracking.ttp) ? { ttp: input.ttp ?? tracking.ttp } : {}),
    ...(Object.keys(attribution).length > 0 ? { attribution } : {})
  };
}

export type MeetingReservationFlowState =
  | { status: 'idle' }
  | { status: 'held'; reservation: PublicReservationCreateOutput }
  | { status: 'expired'; reservationId: MeetingReservationId }
  | { status: 'booked'; booking: PublicBookingCreateOutput }
  | { status: 'cancelled'; reservationId: MeetingReservationId };

export interface MeetingReservationFlowOperations {
  createReservation(
    input: PublicReservationCreateInput,
    options?: MeetingOperationRequestOptions | undefined
  ): Promise<PublicReservationCreateOutput>;
  getActiveReservation(input: {
    reservation_id: MeetingReservationId;
  }): Promise<PublicReservationStatus>;
  cancelReservation(
    input: { reservation_id: MeetingReservationId },
    options?: MeetingOperationRequestOptions | undefined
  ): Promise<{ success: true }>;
  createBooking(
    input: PublicBookingCreateInput,
    options?: MeetingOperationRequestOptions | undefined
  ): Promise<PublicBookingCreateOutput>;
}

export interface MeetingReservationFlow {
  getState(): MeetingReservationFlowState;
  reserve(input: PublicReservationCreateInput): Promise<PublicReservationCreateOutput>;
  refresh(): Promise<PublicReservationStatus | null>;
  book(
    input: Omit<PublicBookingCreateInput, 'reservation_id'>,
    options?: MeetingOperationRequestOptions | undefined
  ): Promise<PublicBookingCreateOutput>;
  cancel(options?: MeetingOperationRequestOptions | undefined): Promise<{ success: true }>;
}

/**
 * Framework-free client state that composes the server-owned reservation flow.
 * It never predicts availability or changes server state outside public operations.
 */
export function createMeetingReservationFlow(
  operations: MeetingReservationFlowOperations
): MeetingReservationFlow {
  let state: MeetingReservationFlowState = { status: 'idle' };
  let reservationAttemptKey: string | undefined;
  let bookingAttemptKey: string | undefined;

  function heldReservationId(): MeetingReservationId | undefined {
    return state.status === 'held' ? state.reservation.reservation_id : undefined;
  }

  return {
    getState: () => state,
    async reserve(input) {
      reservationAttemptKey ??= input.idempotencyKey ?? createMeetingRandomId();
      const reservation = await operations.createReservation(input, {
        idempotencyKey: reservationAttemptKey
      });
      state = { status: 'held', reservation };
      bookingAttemptKey = undefined;
      return reservation;
    },
    async refresh() {
      const reservationId = heldReservationId();
      if (!reservationId) return null;
      const result = await operations.getActiveReservation({ reservation_id: reservationId });
      if (!result.isActive) state = { status: 'expired', reservationId };
      return result;
    },
    async book(input, options = {}) {
      const reservationId = heldReservationId();
      if (!reservationId) {
        throw new MoreflowMeetingsError({
          message: 'An active meeting reservation is required before booking.',
          code: 'RESERVATION_REQUIRED',
          responseBody: undefined,
          operationFailure: undefined
        });
      }
      bookingAttemptKey ??= options.idempotencyKey ?? createMeetingRandomId();
      const booking = await operations.createBooking(
        { ...input, reservation_id: reservationId },
        { ...options, idempotencyKey: bookingAttemptKey }
      );
      state = { status: 'booked', booking };
      return booking;
    },
    async cancel(options = {}) {
      const reservationId = heldReservationId();
      if (!reservationId) {
        throw new MoreflowMeetingsError({
          message: 'An active meeting reservation is required before cancellation.',
          code: 'RESERVATION_REQUIRED',
          responseBody: undefined,
          operationFailure: undefined
        });
      }
      const result = await operations.cancelReservation({ reservation_id: reservationId }, options);
      state = { status: 'cancelled', reservationId };
      return result;
    }
  };
}

export interface CreateMeetingClientOptions extends CreateMeetingOperationTransportOptions {
  trackingCapture?: (() => AcquisitionTracking) | undefined;
  trackingOptions?: TrackingCaptureOptions | undefined;
}

export interface MeetingClient extends MeetingOperationTransport {
  createReservationFlow(): MeetingReservationFlow;
}

/** Headless client for public meeting discovery, booking, and management operations. */
export function createMeetingClient(options: CreateMeetingClientOptions = {}): MeetingClient {
  const transport = createMeetingOperationTransport(options);
  const trackingCapture =
    options.trackingCapture ?? (() => captureAcquisitionTracking(options.trackingOptions));

  return {
    ...transport,
    createBooking(input, requestOptions) {
      return transport.createBooking(
        withMeetingAcquisitionTracking(input, trackingCapture()),
        requestOptions
      );
    },
    createReservationFlow() {
      return createMeetingReservationFlow({
        ...transport,
        createBooking: (input, requestOptions) =>
          transport.createBooking(
            withMeetingAcquisitionTracking(input, trackingCapture()),
            requestOptions
          )
      });
    }
  };
}
