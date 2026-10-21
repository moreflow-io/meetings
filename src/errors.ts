import {
  type MoreflowClientErrorCode,
  type MoreflowErrorInit,
  type MoreflowErrorRecovery,
  MoreflowSdkError,
  operationErrorInit
} from './internal/errors';
import { isRecord } from './internal/values';

export type { MoreflowClientErrorCode, MoreflowErrorRecovery } from './internal/errors';

/** @deprecated Use `MoreflowErrorRecovery`. */
export type MeetingOperationRecovery = MoreflowErrorRecovery;

/**
 * Codes a `MoreflowMeetingsError` carries: the SDK's own codes and the codes the
 * public meeting operations return. A newer server may send codes not listed here.
 */
export type MeetingsErrorCode =
  | MoreflowClientErrorCode
  /** `book()` or `cancel()` on a reservation flow without a held reservation. */
  | 'RESERVATION_REQUIRED'
  /** The meeting type, account, client or meeting is not public or does not exist. */
  | 'NOT_FOUND'
  /** The slot was taken, the reservation is paid, or the meeting changed meanwhile. */
  | 'CONFLICT'
  /** The group session has no seats left. */
  | 'SESSION_FULL'
  /** The slot was booked by someone else. */
  | 'SLOT_BOOKED'
  /** The reservation no longer holds the slot; reserve again. */
  | 'RESERVATION_UNAVAILABLE'
  /** The reservation hold expired; reserve again. */
  | 'RESERVATION_EXPIRED'
  /** The reschedule or cancel token is invalid. */
  | 'FORBIDDEN'
  | 'INVALID_STATE'
  /** The external calendar could not be checked. */
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_ERROR'
  /** The account has not configured payments or branding for this. */
  | 'CONFIGURATION_ERROR'
  | 'PAYMENT_METHOD_UNAVAILABLE'
  /** No email or SMS channel can deliver a checkout code. */
  | 'NO_CHANNELS_AVAILABLE'
  /** Checkout code verification: no code was requested. */
  | 'NO_OTP'
  /** Checkout code verification: the code expired. */
  | 'EXPIRED'
  /** Checkout code verification: too many wrong codes. */
  | 'MAX_ATTEMPTS'
  /** Checkout code verification: wrong code; `details.attemptsRemaining` says how many are left. */
  | 'INVALID_CODE'
  /** Too many requests; retryable. */
  | 'RATE_LIMIT'
  | 'AUTH_ERROR'
  | 'INTERNAL_ERROR';

export interface MoreflowMeetingsErrorInit extends MoreflowErrorInit {
  operationFailure?: unknown;
}

/** The error every `@moreflow/meetings` helper throws. */
export class MoreflowMeetingsError extends MoreflowSdkError<MeetingsErrorCode> {
  /** The server's failure object (`error` of the envelope), unchanged. */
  readonly operationFailure: unknown;

  constructor(init: MoreflowMeetingsErrorInit) {
    super(init);
    this.name = 'MoreflowMeetingsError';
    this.operationFailure = init.operationFailure;
  }
}

export function operationError(input: {
  responseBody: unknown;
  status?: number | undefined;
  cause?: unknown;
}): MoreflowMeetingsError {
  const body = input.responseBody;
  return new MoreflowMeetingsError({
    ...operationErrorInit({ ...input, fallbackMessage: 'The meeting operation request failed' }),
    operationFailure: isRecord(body) && isRecord(body.error) ? body.error : body
  });
}
