import { MoreflowMeetingsError } from './errors';
import type { MeetingOperationRequestOptions } from './index';
import { createRandomId, isRecord } from './internal/values';
import type {
  MeetingReservationId,
  PublicBookingCreateInput,
  PublicBookingCreateOutput,
  PublicBookingFlowInput,
  PublicReservationCreateInput,
  PublicReservationCreateOutput,
  PublicReservationStatus
} from './public-types';

export type MeetingReservationFlowState =
  | { status: 'idle' }
  | { status: 'restoring'; reservationId: MeetingReservationId }
  | { status: 'held'; reservation: PublicReservationCreateOutput }
  | { status: 'resumed'; reservationId: MeetingReservationId; expiresAt?: string | undefined }
  | { status: 'expired'; reservationId: MeetingReservationId }
  | { status: 'booked'; booking: PublicBookingCreateOutput }
  | { status: 'cancelled'; reservationId: MeetingReservationId };

export interface MeetingReservationFlowOperations {
  createReservation(
    input: PublicReservationCreateInput,
    options?: MeetingOperationRequestOptions
  ): Promise<PublicReservationCreateOutput>;
  getActiveReservation(input: {
    reservationId: MeetingReservationId;
  }): Promise<PublicReservationStatus>;
  cancelReservation(
    input: { reservationId: MeetingReservationId },
    options?: MeetingOperationRequestOptions
  ): Promise<{ success: true }>;
  createBooking(
    input: PublicBookingCreateInput,
    options?: MeetingOperationRequestOptions
  ): Promise<PublicBookingCreateOutput>;
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
  book(
    input: PublicBookingFlowInput,
    options?: MeetingOperationRequestOptions
  ): Promise<PublicBookingCreateOutput>;
  cancel(options?: MeetingOperationRequestOptions): Promise<{ success: true }>;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Framework-free client state; every hold decision still belongs to the server. */
export function createMeetingReservationFlow(
  operations: MeetingReservationFlowOperations,
  options: MeetingReservationFlowOptions = {}
): MeetingReservationFlow {
  let state: MeetingReservationFlowState = options.reservationId
    ? { status: 'restoring', reservationId: options.reservationId }
    : { status: 'idle' };
  let reservationAttempt: { fingerprint: string; key: string } | undefined;
  let bookingAttemptKey: string | undefined;
  const listeners = new Set<() => void>();
  let pending = Promise.resolve();

  function update(next: MeetingReservationFlowState) {
    state = next;
    for (const listener of listeners) listener();
  }
  // Serialize lifecycle actions: a slow refresh must not overwrite a newer hold,
  // and overlapping reserve calls must not leak reservations.
  function enqueue<T>(action: () => Promise<T>): Promise<T> {
    const result = pending.then(action);
    pending = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }
  function heldReservationId(): MeetingReservationId | undefined {
    if (state.status === 'held') return state.reservation.reservation_id;
    return state.status === 'restoring' || state.status === 'resumed'
      ? state.reservationId
      : undefined;
  }

  return {
    getState: () => state,
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reserve: (input) =>
      enqueue(async () => {
        const { idempotencyKey: explicitKey, ...payload } = input;
        const fingerprint = canonicalJson(payload);
        if (explicitKey) reservationAttempt = { fingerprint, key: explicitKey };
        else if (reservationAttempt?.fingerprint !== fingerprint) {
          reservationAttempt = { fingerprint, key: createRandomId() };
        }
        const previousId = heldReservationId();
        if (previousId) {
          // The backend only expires elapsed holds; it does not replace a visitor's
          // previous hold. Release first so an overlapping replacement can succeed.
          await operations.cancelReservation({ reservationId: previousId });
          bookingAttemptKey = undefined;
          update({ status: 'cancelled', reservationId: previousId });
        }
        const reservation = await operations.createReservation(input, {
          idempotencyKey: reservationAttempt.key
        });
        reservationAttempt = undefined;
        bookingAttemptKey = undefined;
        update({ status: 'held', reservation });
        return reservation;
      }),
    refresh: () =>
      enqueue(async () => {
        const reservationId = heldReservationId();
        if (!reservationId) return null;
        const result = await operations.getActiveReservation({ reservationId });
        if (!result.isActive) {
          reservationAttempt = undefined;
          update({ status: 'expired', reservationId });
        } else if (
          state.status === 'restoring' ||
          (state.status === 'resumed' && state.expiresAt !== result.expiresAt)
        ) {
          update({ status: 'resumed', reservationId, expiresAt: result.expiresAt });
        }
        return result;
      }),
    book: (input, requestOptions = {}) =>
      enqueue(async () => {
        const reservationId = heldReservationId();
        if (!reservationId)
          throw new MoreflowMeetingsError({
            message: 'An active meeting reservation is required before booking.',
            code: 'RESERVATION_REQUIRED',
            recovery: { operation: 'meetings.reservations.createReservation' }
          });
        bookingAttemptKey ??= requestOptions.idempotencyKey ?? createRandomId();
        const booking = await operations.createBooking(
          { ...input, reservationId },
          {
            ...requestOptions,
            idempotencyKey: bookingAttemptKey
          }
        );
        update({ status: 'booked', booking });
        return booking;
      }),
    cancel: (requestOptions = {}) =>
      enqueue(async () => {
        const reservationId = heldReservationId();
        if (!reservationId)
          throw new MoreflowMeetingsError({
            message: 'An active meeting reservation is required before cancellation.',
            code: 'RESERVATION_REQUIRED'
          });
        const result = await operations.cancelReservation({ reservationId }, requestOptions);
        reservationAttempt = undefined;
        bookingAttemptKey = undefined;
        update({ status: 'cancelled', reservationId });
        return result;
      })
  };
}
