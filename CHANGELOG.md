# Changelog

All notable changes to `@moreflow/meetings` are documented in this file.

## Unreleased

## 0.2.1

- Docs: browser clients call `https://api.moreflow.io` directly with no API token; the API answers CORS preflights from any origin, so no same-origin proxy or `baseUrl: ''` forwarding is required. An optional proxy is only for a strict Content Security Policy.

## 0.2.0

- **Breaking — requires the next minor release:** replace `apiBaseUrl` with `baseUrl` and `trackingOptions` with `trackingCapture`. `trackingCapture` accepts built-in capture options or the existing callback returning booking tracking values, and always obeys `acquisitionTracking`. No old option aliases remain.

- Export `isMoreflowError(error)` using the shared `Symbol.for('moreflow.error')` brand. Migrate catch handlers that need common fields across separately bundled public SDKs from package-specific `instanceof` checks to this guard. Package-specific error classes remain available; document the common error table, now also used by `@moreflow/api`.

These unreleased changes include breaking changes and require the next minor release.

- Resume holds after reload with `meetings.createReservationFlow({ reservationId })` or `createMeetingReservationFlow(operations, { reservationId })`; `refresh()` checks the saved id. New `restoring` and `resumed` states avoid inventing a full reservation response after reload.
- Add stable `flow.getSnapshot()` and `flow.subscribe()` for React `useSyncExternalStore`, with App Router and Pages Router examples and a complete error recovery table.
- Re-reserving releases the current hold before requesting the replacement. A failed cancellation preserves the old hold; a failed replacement leaves it released and retains the creation retry key. Serialize lifecycle actions to prevent concurrent hold leaks and stale refresh writes.

- Breaking (next minor): all typed method arguments now use camelCase only. Migrate `account_id` → `accountId`, `meeting_type_id` → `meetingTypeId`, `calendar_id` → `calendarId`, `reservation_id` → `reservationId`, and booking `dateTime: { start, end }` → `startsAt`/`endsAt`. Remove imports of `PublicBookingLegacySlot`, `PublicReservationLegacySlot`, and `LegacyMeetingTypeInput`.
- Migrate booking guest `first_name`/`last_name`/`phone_number` → `firstName`/`lastName`/`phoneNumber`; reservation `guest_email`/`guest_first_name`/`guest_last_name`/`guest_phone`/`additional_guests` → `guestEmail`/`guestFirstName`/`guestLastName`/`guestPhone`/`additionalGuests`.
- Migrate `location_type`, `location_address`, `billing_address`, `payment_id`, `provider_payment_id`, `payment_status`, `payment_method`, `amount_paid`, `custom_checkboxes`, `privacy_consent`, `marketing_consent`, and `checkout_verification_token` to their camelCase equivalents. Checkout uses `customerDetails` with camelCase names and an address `{ street, postal, city, state?, country }`. Reschedule takes `startsAt`/`endsAt` instead of `newStarting`/`newEnd`. No old argument aliases remain. Raw `call()` inputs and server responses retain operation-contract casing.
- `PublicReservationStatus` exposes only `expiresAt`; migrate reads of `expires_at`. Other reservation and booking responses retain server casing.
- Add `slotRange(availability, time, meetingType)`: uses the booking timezone, rejects DST gaps, chooses the earlier instant in DST overlaps, and adds elapsed meeting duration. Type public location, payment requirement, booking checkboxes, and branding policy URLs from the server schema; booking examples no longer need casts.

- Built-in `trackingCapture` option fields you leave out follow `configureAcquisitionTracking()` from `@moreflow/tracking`, so bookings carry the landing values the page captured. Re-export `configureAcquisitionTracking`, `clearAcquisitionTracking` and the `AcquisitionTrackingConfig` type. Captured landing values stay stable across route changes, and server-side calls no longer share stored values between requests.
- Breaking: bookings no longer carry acquisition tracking on their own. Pass `acquisitionTracking: true`, or a function that returns `true` once the visitor consented, to `createMeetingClient` to capture UTM parameters, ad click ids, Meta's `_fbp`/`_fbc` cookies, referrer and page URL on every `createBooking()` and reservation-flow `book()`. Reading those cookies and writing `sessionStorage` needs consent in the EU. A `trackingCapture` override runs only while `acquisitionTracking` is on; click ids and `attribution` in the booking input are always sent. Export the `AcquisitionTrackingSetting` type. The same option exists on `@moreflow/forms` and `@moreflow/chatbots`.
- README: add Auth and CORS, Stored data, and Acquisition tracking and consent sections.
- `createReservationFlow().reserve()` no longer reuses one idempotency key for the whole flow. A retry of the same reservation payload keeps its key; a different slot gets a new one, and the key is discarded after a successful reserve, a cancel, or an expiry. An explicit `idempotencyKey` in the input is always used. Previously a second reservation sent the first key, which the server rejects as `IDEMPOTENCY_CONFLICT`.
- Breaking: removed `reconcilePaid()`, `meetingsOperationIds.bookingReconcilePaid` and the `PublicPaidBookingReconciliation*` types. `bookings.public.reconcilePaid` is a service-authenticated backend job, so the browser client could never call it.
- Requests no longer send the development-only `ngrok-skip-browser-warning` header.
- Breaking: requests go to `https://api.moreflow.io` by default. Previously the client defaulted to `location.origin`, so an embed on a customer's own site called the customer's host. Pass `baseUrl: ''` for a same-origin proxy.
- Breaking: an aborted request throws `MoreflowMeetingsError` with code `ABORTED` (not retryable) instead of a retryable `NETWORK_ERROR`.
- `baseUrl` is the only API origin option name across the Moreflow SDKs.
- Reservations, bookings and `getCalendar` take camelCase slot fields: `accountId`, `meetingTypeId`, `calendarId`, `startsAt`, `endsAt`. `createBooking` converts them to the operation's `account_id`/`meeting_type_id`/`calendar_id`/`dateTime`. The snake_case fields and `dateTime` have been removed from SDK arguments. New types: `PublicBookingSlot`, `PublicBookingDetails`, `PublicBookingFlowInput`, `PublicReservationSlot`, `MeetingTypeInput`.
- Add a script-tag build: `dist/browser.js` (also `@moreflow/meetings/browser`, and the package's jsDelivr/unpkg entry) exposes the API as `window.MoreflowMeetings`.
- `MoreflowMeetingsError` has the same shape as the `@moreflow/forms` and `@moreflow/chatbots` errors. `recovery` is typed `{ operation, args }` instead of `unknown` (`MeetingOperationRecovery` is a deprecated alias of `MoreflowErrorRecovery`), `details` is always an object and includes an operation's context, `code` is always set, and `requestId` is new. `MeetingsErrorCode` lists the known codes. A missing `fetch` throws `FETCH_UNAVAILABLE` instead of a plain `Error`. Failures the server marks retryable are `retryable`.

## 0.1.0

- Initial release: headless browser helpers for embedding the Moreflow public meeting booking flow.
- `createMeetingClient` and `createMeetingOperationTransport` covering the public discovery, availability, reservation, booking, reschedule, and cancel operations, with paid-booking checkout and OTP operations typed.
- `createMeetingReservationFlow` for the framework-free reserve → hold → book/cancel lifecycle.
- Branded id helpers (account, meeting type, reservation, booking, calendar) and typed payload shapes for the public operations.
- Acquisition tracking wired into booking creation via `withMeetingAcquisitionTracking`, backed by `@moreflow/tracking`.
