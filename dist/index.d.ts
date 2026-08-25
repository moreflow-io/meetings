import { type AcquisitionTracking, type TrackingCaptureOptions } from '@moreflow/tracking';
export { captureAcquisitionTracking, createMemoryStorage, type AcquisitionTracking, type StorageLike, type TrackingCaptureOptions } from '@moreflow/tracking';
export declare const meetingsOperationIds: {
    readonly brandingGetBySlug: "company.branding.getPublicBySlug";
    readonly meetingTypesListBySlug: "meetings.types.listPublicBySlug";
    readonly meetingTypeGetBySlugs: "meetings.types.getPublicBySlugs";
    readonly availabilityGetSlots: "meetings.availability.getPublicSlots";
    readonly availabilityGetByMeetingType: "calendars.availability.getPublicByMeetingType";
    readonly calendarGetByMeetingType: "calendars.index.getPublicByMeetingType";
    readonly reservationCreate: "meetings.reservations.createReservation";
    readonly reservationGetActive: "meetings.reservations.getActiveReservation";
    readonly reservationCancel: "meetings.reservations.cancel";
    readonly bookingCreate: "bookings.public.create";
    readonly checkoutCreateStripePaymentIntent: "meetings.checkout.createStripePaymentIntent";
    readonly bookingFinalizePaid: "bookings.public.finalizePaid";
    readonly bookingReconcilePaid: "bookings.public.reconcilePaid";
    readonly checkoutOtpRequest: "clients.checkoutOtp.requestPublic";
    readonly checkoutOtpVerify: "clients.checkoutOtp.verifyPublic";
    readonly rescheduleValidate: "meetings.reschedule.validateReschedule";
    readonly reschedulePublic: "meetings.reschedule.publicReschedule";
    readonly cancelPublic: "meetings.cancel.publicCancel";
};
export type MeetingsOperationId = (typeof meetingsOperationIds)[keyof typeof meetingsOperationIds];
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
export declare function meetingAccountId(value: string): MeetingAccountId;
/** Brand externally supplied public meeting type ids at the package boundary. */
export declare function meetingTypeId(value: string): MeetingTypeId;
/** Brand opaque server-issued reservation bearer capabilities at the boundary. */
export declare function meetingReservationId(value: string): MeetingReservationId;
/** Brand server-issued public booking ids at the package boundary. */
export declare function meetingBookingId(value: string): MeetingBookingId;
/** Brand externally supplied public calendar ids at the package boundary. */
export declare function meetingCalendarId(value: string): MeetingCalendarId;
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
        breaks?: Array<{
            start: string;
            end: string;
        }> | undefined;
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
export type PublicBookingAdditionalGuest = {
    email: string;
    name: string;
};
export type PublicBookingCustomCheckbox = {
    id: string;
    checked: boolean;
    required: boolean;
    text: {
        en: string;
        de: string;
    };
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
    dateTime: {
        start: string;
        end: string;
    };
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
    items: Array<MeetingRecord & {
        account_id: string;
        payment_id: string;
        action: 'already_linked' | 'finalized' | 'would_finalize' | 'manual_action';
    }>;
    trace: MeetingRecord;
};
export type PublicRescheduleValidation = MeetingRecord & {
    allowed: boolean;
    reason?: string | undefined;
    meeting: MeetingRecord | null;
};
export type PublicRescheduleInput = {
    token: string;
    newStarting: string;
    newEnd: string;
};
export type PublicCancelInput = {
    token: string;
    reason?: string | undefined;
};
export type PublicManageMeetingOutput = {
    success: boolean;
    meeting: MeetingRecord | null;
};
export type MeetingOperationRecovery = unknown;
/**
 * Normalized transport failure retaining the exact server envelope, including
 * recovery-bearing fields. Consumer UI decides how to present it.
 */
export declare class MoreflowMeetingsError extends Error {
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
    });
}
/** Return operation data while retaining server failures without reshaping them. */
export declare function normalizeMeetingOperationPayload<T = unknown>(payload: unknown): T;
export declare function createMeetingRandomId(): string;
export interface MeetingOperationRequestOptions {
    idempotencyKey?: string | undefined;
    signal?: AbortSignal | undefined;
}
export interface CreateMeetingOperationTransportOptions {
    apiBaseUrl?: string | undefined;
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
    getCalendar(input: {
        meeting_type_id: MeetingTypeId;
    }): Promise<PublicMeetingCalendar | null>;
    createReservation(input: PublicReservationCreateInput, options?: MeetingOperationRequestOptions | undefined): Promise<PublicReservationCreateOutput>;
    getActiveReservation(input: {
        reservation_id: MeetingReservationId;
    }): Promise<PublicReservationStatus>;
    cancelReservation(input: {
        reservation_id: MeetingReservationId;
    }, options?: MeetingOperationRequestOptions | undefined): Promise<{
        success: true;
    }>;
    createBooking(input: PublicBookingCreateInput, options?: MeetingOperationRequestOptions | undefined): Promise<PublicBookingCreateOutput>;
    createStripePaymentIntent(input: PublicStripePaymentIntentInput, options?: MeetingOperationRequestOptions | undefined): Promise<PublicStripePaymentIntentOutput>;
    finalizePaid(input: PublicPaidBookingFinalizeInput, options?: MeetingOperationRequestOptions | undefined): Promise<PublicBookingCreateOutput>;
    reconcilePaid(input: PublicPaidBookingReconciliationInput): Promise<PublicPaidBookingReconciliationOutput>;
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
export declare function withMeetingAcquisitionTracking(input: PublicBookingCreateInput, tracking: AcquisitionTracking): PublicBookingCreateInput;
export type MeetingReservationFlowState = {
    status: 'idle';
} | {
    status: 'held';
    reservation: PublicReservationCreateOutput;
} | {
    status: 'expired';
    reservationId: MeetingReservationId;
} | {
    status: 'booked';
    booking: PublicBookingCreateOutput;
} | {
    status: 'cancelled';
    reservationId: MeetingReservationId;
};
export interface MeetingReservationFlowOperations {
    createReservation(input: PublicReservationCreateInput, options?: MeetingOperationRequestOptions | undefined): Promise<PublicReservationCreateOutput>;
    getActiveReservation(input: {
        reservation_id: MeetingReservationId;
    }): Promise<PublicReservationStatus>;
    cancelReservation(input: {
        reservation_id: MeetingReservationId;
    }, options?: MeetingOperationRequestOptions | undefined): Promise<{
        success: true;
    }>;
    createBooking(input: PublicBookingCreateInput, options?: MeetingOperationRequestOptions | undefined): Promise<PublicBookingCreateOutput>;
}
export interface MeetingReservationFlow {
    getState(): MeetingReservationFlowState;
    reserve(input: PublicReservationCreateInput): Promise<PublicReservationCreateOutput>;
    refresh(): Promise<PublicReservationStatus | null>;
    book(input: Omit<PublicBookingCreateInput, 'reservation_id'>, options?: MeetingOperationRequestOptions | undefined): Promise<PublicBookingCreateOutput>;
    cancel(options?: MeetingOperationRequestOptions | undefined): Promise<{
        success: true;
    }>;
}
/**
 * Framework-free client state that composes the server-owned reservation flow.
 * It never predicts availability or changes server state outside public operations.
 */
export declare function createMeetingReservationFlow(operations: MeetingReservationFlowOperations): MeetingReservationFlow;
export interface CreateMeetingClientOptions extends CreateMeetingOperationTransportOptions {
    trackingCapture?: (() => AcquisitionTracking) | undefined;
    trackingOptions?: TrackingCaptureOptions | undefined;
}
export interface MeetingClient extends MeetingOperationTransport {
    createReservationFlow(): MeetingReservationFlow;
}
/** Headless client for public meeting discovery, booking, and management operations. */
export declare function createMeetingClient(options?: CreateMeetingClientOptions): MeetingClient;
