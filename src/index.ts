import {
  type AcquisitionTracking,
  captureAcquisitionTracking,
  type TrackingCaptureOptions
} from '@moreflow/tracking';
import { MoreflowMeetingsError, operationError } from './errors';
import {
  type AcquisitionTrackingSetting,
  acquisitionTrackingEnabled
} from './internal/acquisition-tracking';
import { abortedErrorInit, fetchUnavailableInit, networkErrorInit } from './internal/errors';
import {
  type BaseUrlOptions,
  readResponseBody,
  resolveBaseUrl,
  resolveFetch
} from './internal/http';
import { createRandomId, isRecord } from './internal/values';
import {
  createMeetingReservationFlow,
  type MeetingReservationFlow,
  type MeetingReservationFlowOptions
} from './reservation-flow';

export {
  type AcquisitionTracking,
  type AcquisitionTrackingConfig,
  captureAcquisitionTracking,
  clearAcquisitionTracking,
  configureAcquisitionTracking,
  createMemoryStorage,
  type StorageLike,
  type TrackingCaptureOptions
} from '@moreflow/tracking';
export type {
  MeetingOperationRecovery,
  MeetingsErrorCode,
  MoreflowClientErrorCode,
  MoreflowErrorRecovery,
  MoreflowMeetingsErrorInit
} from './errors';
export { MoreflowMeetingsError } from './errors';
export { isMoreflowError } from './internal/errors';
export type { AcquisitionTrackingSetting };

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
  checkoutOtpRequest: 'clients.checkoutOtp.requestPublic',
  checkoutOtpVerify: 'clients.checkoutOtp.verifyPublic',
  rescheduleValidate: 'meetings.reschedule.validateReschedule',
  reschedulePublic: 'meetings.reschedule.publicReschedule',
  cancelPublic: 'meetings.cancel.publicCancel'
} as const;

export type MeetingsOperationId = (typeof meetingsOperationIds)[keyof typeof meetingsOperationIds];

import type {
  MeetingReservationId,
  MeetingTypeId,
  PublicBookingCreateInput,
  PublicBookingCreateOutput,
  PublicCancelInput,
  PublicCheckoutOtpRequestInput,
  PublicCheckoutOtpRequestOutput,
  PublicCheckoutOtpVerifyInput,
  PublicCheckoutOtpVerifyOutput,
  PublicManageMeetingOutput,
  PublicMeetingAvailability,
  PublicMeetingBranding,
  PublicMeetingCalendar,
  PublicMeetingSlots,
  PublicMeetingType,
  PublicPaidBookingFinalizeInput,
  PublicRescheduleInput,
  PublicRescheduleValidation,
  PublicReservationCreateInput,
  PublicReservationCreateOutput,
  PublicReservationStatus,
  PublicStripePaymentIntentInput,
  PublicStripePaymentIntentOutput
} from './public-types';

export * from './public-types';
export { slotRange } from './slot-range';

import { operationBookingInput, operationFinalizePaidInput } from './booking-input';

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

export function createMeetingRandomId(): string {
  return createRandomId();
}

export type MeetingTypeInput = { meetingTypeId: MeetingTypeId };

export interface MeetingOperationRequestOptions {
  idempotencyKey?: string | undefined;
  signal?: AbortSignal | undefined;
}

export interface CreateMeetingOperationTransportOptions extends BaseUrlOptions {
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
  getCalendar(input: MeetingTypeInput): Promise<PublicMeetingCalendar | null>;
  createReservation(
    input: PublicReservationCreateInput,
    options?: MeetingOperationRequestOptions | undefined
  ): Promise<PublicReservationCreateOutput>;
  getActiveReservation(input: {
    reservationId: MeetingReservationId;
  }): Promise<PublicReservationStatus>;
  cancelReservation(
    input: { reservationId: MeetingReservationId },
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
  const baseUrl = resolveBaseUrl(options);
  const resolvedFetch = resolveFetch(options.fetchImpl);
  if (!resolvedFetch) throw new MoreflowMeetingsError(fetchUnavailableInit('@moreflow/meetings'));
  const fetchImpl: typeof fetch = resolvedFetch;

  async function call<T = unknown>(
    operationId: MeetingsOperationId,
    input: object,
    requestOptions: MeetingOperationRequestOptions = {}
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}/v1/operations/${operationId}`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'content-type': 'application/json',
          ...(requestOptions.idempotencyKey
            ? { 'idempotency-key': requestOptions.idempotencyKey }
            : {})
        },
        body: JSON.stringify(input),
        ...(requestOptions.signal ? { signal: requestOptions.signal } : {})
      });
    } catch (cause) {
      if (requestOptions.signal?.aborted) {
        throw new MoreflowMeetingsError(
          abortedErrorInit('The meeting operation request was aborted.', requestOptions.signal)
        );
      }
      throw new MoreflowMeetingsError(
        networkErrorInit('The meeting operation request could not reach the network.', cause)
      );
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
    getCalendar: (input) =>
      call(meetingsOperationIds.calendarGetByMeetingType, {
        meeting_type_id: input.meetingTypeId
      }),
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
    getActiveReservation: async (input) => {
      const { expires_at: _legacyExpiry, ...status } = await call<
        PublicReservationStatus & { expires_at?: string }
      >(meetingsOperationIds.reservationGetActive, {
        reservation_id: input.reservationId
      });
      return {
        ...status,
        ...((status.expiresAt ?? _legacyExpiry)
          ? { expiresAt: status.expiresAt ?? _legacyExpiry }
          : {})
      };
    },
    cancelReservation: (input, requestOptions) =>
      call(
        meetingsOperationIds.reservationCancel,
        { reservation_id: input.reservationId },
        requestOptions
      ),
    createBooking: (input, requestOptions) =>
      call(meetingsOperationIds.bookingCreate, operationBookingInput(input), requestOptions),
    createStripePaymentIntent: (input, requestOptions) =>
      call(meetingsOperationIds.checkoutCreateStripePaymentIntent, input, requestOptions),
    finalizePaid: (input, requestOptions) =>
      call(
        meetingsOperationIds.bookingFinalizePaid,
        operationFinalizePaidInput(input),
        requestOptions
      ),
    requestCheckoutOtp: (input) => call(meetingsOperationIds.checkoutOtpRequest, input),
    verifyCheckoutOtp: (input) => call(meetingsOperationIds.checkoutOtpVerify, input),
    validateReschedule: (input) => call(meetingsOperationIds.rescheduleValidate, input),
    reschedule: (input, requestOptions) =>
      call(
        meetingsOperationIds.reschedulePublic,
        {
          token: input.token,
          newStarting: input.startsAt,
          newEnd: input.endsAt
        },
        requestOptions
      ),
    cancel: (input, requestOptions) =>
      call(meetingsOperationIds.cancelPublic, input, requestOptions)
  };
}

/** Merge canonical acquisition capture into the booking contract with caller precedence. */
export function withMeetingAcquisitionTracking(
  input: PublicBookingCreateInput,
  tracking: AcquisitionTracking | undefined
): PublicBookingCreateInput {
  if (!tracking) return input;
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

export type {
  MeetingReservationFlow,
  MeetingReservationFlowOperations,
  MeetingReservationFlowOptions,
  MeetingReservationFlowState
} from './reservation-flow';
export { createMeetingReservationFlow } from './reservation-flow';

export interface CreateMeetingClientOptions extends CreateMeetingOperationTransportOptions {
  /**
   * Adds acquisition tracking (UTM parameters, ad click ids, Meta's `_fbp`/`_fbc`
   * cookies, referrer, page URL) to every booking. Off by default because the capture
   * reads cookies and writes browser storage, which needs consent in the EU.
   */
  acquisitionTracking?: AcquisitionTrackingSetting | undefined;
  /** Capture options or a replacement callback; used only while `acquisitionTracking` is on.
   * Unset options follow `configureAcquisitionTracking()`. */
  trackingCapture?: TrackingCaptureOptions | (() => AcquisitionTracking | undefined) | undefined;
}

export interface MeetingClient extends MeetingOperationTransport {
  createReservationFlow(options?: MeetingReservationFlowOptions): MeetingReservationFlow;
}

/** Headless client for public meeting discovery, booking, and management operations. */
export function createMeetingClient(options: CreateMeetingClientOptions = {}): MeetingClient {
  const transport = createMeetingOperationTransport(options);
  const capture = options.trackingCapture;
  const trackingCapture = typeof capture === 'function' ? capture : () => captureAcquisitionTracking(capture);
  const createBooking: MeetingOperationTransport['createBooking'] = (input, requestOptions) =>
    transport.createBooking(
      acquisitionTrackingEnabled(options.acquisitionTracking)
        ? withMeetingAcquisitionTracking(input, trackingCapture())
        : input,
      requestOptions
    );

  return {
    ...transport,
    createBooking,
    createReservationFlow(flowOptions = {}) {
      return createMeetingReservationFlow({ ...transport, createBooking }, flowOptions);
    }
  };
}
