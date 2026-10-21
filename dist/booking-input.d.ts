import type { PublicBookingCreateInput, PublicPaidBookingFinalizeInput } from './public-types';
/** Adapt the SDK's camelCase arguments to the public operation's wire contract. */
export declare function operationBookingInput(input: PublicBookingCreateInput): object;
export declare function operationFinalizePaidInput(input: PublicPaidBookingFinalizeInput): object;
