import { type AcquisitionTracking, type TrackingCaptureOptions } from '@moreflow/tracking';
import { type AcquisitionTrackingSetting } from './internal/acquisition-tracking';
import { type BaseUrlOptions } from './internal/http';
import { type MeetingReservationFlow, type MeetingReservationFlowOptions } from './reservation-flow';
export { type AcquisitionTracking, type AcquisitionTrackingConfig, captureAcquisitionTracking, clearAcquisitionTracking, configureAcquisitionTracking, createMemoryStorage, type StorageLike, type TrackingCaptureOptions } from '@moreflow/tracking';
export type { MeetingOperationRecovery, MeetingsErrorCode, MoreflowClientErrorCode, MoreflowErrorRecovery, MoreflowMeetingsErrorInit } from './errors';
export { MoreflowMeetingsError } from './errors';
export { isMoreflowError } from './internal/errors';
export type { AcquisitionTrackingSetting };
export declare const meetingsOperationIds: {
    readonly brandingGetBySlug: 'company.branding.getPublicBySlug';
    readonly meetingTypesListBySlug: 'meetings.types.listPublicBySlug';
    readonly meetingTypeGetBySlugs: 'meetings.types.getPublicBySlugs';
    readonly availabilityGetSlots: 'meetings.availability.getPublicSlots';
    readonly availabilityGetByMeetingType: 'calendars.availability.getPublicByMeetingType';
    readonly calendarGetByMeetingType: 'calendars.index.getPublicByMeetingType';
    readonly reservationCreate: 'meetings.reservations.createReservation';
    readonly reservationGetActive: 'meetings.reservations.getActiveReservation';
    readonly reservationCancel: 'meetings.reservations.cancel';
    readonly bookingCreate: 'bookings.public.create';
    readonly checkoutCreateStripePaymentIntent: 'meetings.checkout.createStripePaymentIntent';
    readonly bookingFinalizePaid: 'bookings.public.finalizePaid';
    readonly checkoutOtpRequest: 'clients.checkoutOtp.requestPublic';
    readonly checkoutOtpVerify: 'clients.checkoutOtp.verifyPublic';
    readonly rescheduleValidate: 'meetings.reschedule.validateReschedule';
    readonly reschedulePublic: 'meetings.reschedule.publicReschedule';
    readonly cancelPublic: 'meetings.cancel.publicCancel';
};
export type MeetingsOperationId = (typeof meetingsOperationIds)[keyof typeof meetingsOperationIds];
import type { MeetingReservationId, MeetingTypeId, PublicBookingCreateInput, PublicBookingCreateOutput, PublicCancelInput, PublicCheckoutOtpRequestInput, PublicCheckoutOtpRequestOutput, PublicCheckoutOtpVerifyInput, PublicCheckoutOtpVerifyOutput, PublicManageMeetingOutput, PublicMeetingAvailability, PublicMeetingBranding, PublicMeetingCalendar, PublicMeetingSlots, PublicMeetingType, PublicPaidBookingFinalizeInput, PublicRescheduleInput, PublicRescheduleValidation, PublicReservationCreateInput, PublicReservationCreateOutput, PublicReservationStatus, PublicStripePaymentIntentInput, PublicStripePaymentIntentOutput } from './public-types';
export * from './public-types';
export { slotRange } from './slot-range';
/** Return operation data while retaining server failures without reshaping them. */
export declare function normalizeMeetingOperationPayload<T = unknown>(payload: unknown): T;
export declare function createMeetingRandomId(): string;
export type MeetingTypeInput = {
    meetingTypeId: MeetingTypeId;
};
export interface MeetingOperationRequestOptions {
    idempotencyKey?: string | undefined;
    signal?: AbortSignal | undefined;
}
export interface CreateMeetingOperationTransportOptions extends BaseUrlOptions {
    fetchImpl?: typeof fetch | undefined;
}
export interface MeetingOperationTransport {
    call<T = unknown>(operationId: MeetingsOperationId, input: object, options?: MeetingOperationRequestOptions | undefined): Promise<T>;
    getBranding(input: {
        slug: string;
    }): Promise<PublicMeetingBranding | null>;
    listMeetingTypes(input: {
        slug: string;
    }): Promise<PublicMeetingType[]>;
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
    createReservation(input: PublicReservationCreateInput, options?: MeetingOperationRequestOptions | undefined): Promise<PublicReservationCreateOutput>;
    getActiveReservation(input: {
        reservationId: MeetingReservationId;
    }): Promise<PublicReservationStatus>;
    cancelReservation(input: {
        reservationId: MeetingReservationId;
    }, options?: MeetingOperationRequestOptions | undefined): Promise<{
        success: true;
    }>;
    createBooking(input: PublicBookingCreateInput, options?: MeetingOperationRequestOptions | undefined): Promise<PublicBookingCreateOutput>;
    createStripePaymentIntent(input: PublicStripePaymentIntentInput, options?: MeetingOperationRequestOptions | undefined): Promise<PublicStripePaymentIntentOutput>;
    finalizePaid(input: PublicPaidBookingFinalizeInput, options?: MeetingOperationRequestOptions | undefined): Promise<PublicBookingCreateOutput>;
    requestCheckoutOtp(input: PublicCheckoutOtpRequestInput): Promise<PublicCheckoutOtpRequestOutput>;
    verifyCheckoutOtp(input: PublicCheckoutOtpVerifyInput): Promise<PublicCheckoutOtpVerifyOutput>;
    validateReschedule(input: {
        token: string;
    }): Promise<PublicRescheduleValidation>;
    reschedule(input: PublicRescheduleInput, options?: MeetingOperationRequestOptions | undefined): Promise<PublicManageMeetingOutput>;
    cancel(input: PublicCancelInput, options?: MeetingOperationRequestOptions | undefined): Promise<PublicManageMeetingOutput>;
}
export declare function createMeetingOperationTransport(options?: CreateMeetingOperationTransportOptions): MeetingOperationTransport;
/** Merge canonical acquisition capture into the booking contract with caller precedence. */
export declare function withMeetingAcquisitionTracking(input: PublicBookingCreateInput, tracking: AcquisitionTracking | undefined): PublicBookingCreateInput;
export type { MeetingReservationFlow, MeetingReservationFlowOperations, MeetingReservationFlowOptions, MeetingReservationFlowState } from './reservation-flow';
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
export declare function createMeetingClient(options?: CreateMeetingClientOptions): MeetingClient;
