import type { MeetingOperationRequestOptions } from './index';
import type { MeetingReservationId, PublicBookingCreateInput, PublicBookingCreateOutput, PublicBookingFlowInput, PublicReservationCreateInput, PublicReservationCreateOutput, PublicReservationStatus } from './public-types';
export type MeetingReservationFlowState = {
    status: 'idle';
} | {
    status: 'restoring';
    reservationId: MeetingReservationId;
} | {
    status: 'held';
    reservation: PublicReservationCreateOutput;
} | {
    status: 'resumed';
    reservationId: MeetingReservationId;
    expiresAt?: string | undefined;
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
    createReservation(input: PublicReservationCreateInput, options?: MeetingOperationRequestOptions): Promise<PublicReservationCreateOutput>;
    getActiveReservation(input: {
        reservationId: MeetingReservationId;
    }): Promise<PublicReservationStatus>;
    cancelReservation(input: {
        reservationId: MeetingReservationId;
    }, options?: MeetingOperationRequestOptions): Promise<{
        success: true;
    }>;
    createBooking(input: PublicBookingCreateInput, options?: MeetingOperationRequestOptions): Promise<PublicBookingCreateOutput>;
}
export interface MeetingReservationFlowOptions {
    /** An opaque saved hold capability. Call refresh() to check it with the server. */
    reservationId?: MeetingReservationId | undefined;
}
export interface MeetingReservationFlow {
    getState(): MeetingReservationFlowState;
    /** Stable, cached state for React useSyncExternalStore. */
    getSnapshot(): MeetingReservationFlowState;
    subscribe(listener: () => void): () => void;
    reserve(input: PublicReservationCreateInput): Promise<PublicReservationCreateOutput>;
    refresh(): Promise<PublicReservationStatus | null>;
    book(input: PublicBookingFlowInput, options?: MeetingOperationRequestOptions): Promise<PublicBookingCreateOutput>;
    cancel(options?: MeetingOperationRequestOptions): Promise<{
        success: true;
    }>;
}
/** Framework-free client state; every hold decision still belongs to the server. */
export declare function createMeetingReservationFlow(operations: MeetingReservationFlowOperations, options?: MeetingReservationFlowOptions): MeetingReservationFlow;
