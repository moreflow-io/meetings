# Changelog

All notable changes to `@moreflow/meetings` are documented in this file.

## 0.1.0

- Initial release: headless browser helpers for embedding the Moreflow public meeting booking flow.
- `createMeetingClient` and `createMeetingOperationTransport` covering the public discovery, availability, reservation, booking, reschedule, and cancel operations, with paid-booking checkout and OTP operations typed.
- `createMeetingReservationFlow` for the framework-free reserve → hold → book/cancel lifecycle.
- Branded id helpers (account, meeting type, reservation, booking, calendar) and typed payload shapes for the public operations.
- Acquisition tracking wired into booking creation via `withMeetingAcquisitionTracking`, backed by `@moreflow/tracking`.
