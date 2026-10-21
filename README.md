# `@moreflow/meetings`

Headless browser protocol helpers for native Moreflow public meeting booking
embeds. The package contains no UI, React, styles, or business logic: you
render the booking page, and every availability, reservation, and booking
decision stays on the Moreflow server.

```bash
npm install @moreflow/meetings
```

The other public SDKs, the agent plugins, and the HTTP API are listed in the
[Moreflow SDK overview](https://api.moreflow.io/v1/operations/docs/guide#sdks).

Requests go to `https://api.moreflow.io` unless you pass `baseUrl` (for example
`https://dev-api.moreflow.io`, or `''` behind a same-origin proxy). The page's
own origin is never used by default.

Reservations and bookings take the same slot fields (`accountId`,
`meetingTypeId`, `calendarId`, `startsAt`, `endsAt`), and `getCalendar`,
`getSlots` and `getAvailability` take `meetingTypeId`; the client converts them
to each operation's contract. All SDK call arguments use camelCase, including
`guest.firstName`, `reservationId`, `locationType`, and `privacyConsent`.
Response payloads keep the server's field names, except reservation status
exposes only `expiresAt` for the expiry. The low-level `call()` takes raw
operation-contract arguments.

## Book a meeting end to end

You need two public values from the booking link
`https://app.moreflow.io/<account-slug>/m/<meeting-slug>`: the account slug and
the meeting slug. Everything else comes from the API.

### 1. Load branding, the meeting type, and its calendar

```ts
import {
  createMeetingClient,
  MoreflowMeetingsError,
  slotRange,
  meetingReservationId
} from '@moreflow/meetings';

const meetings = createMeetingClient();

const accountSlug = 'acme';
const meetingSlug = 'intro-call';

const branding = await meetings.getBranding({ slug: accountSlug });
const meetingType = await meetings.getMeetingType({ accountSlug, meetingSlug });
if (!branding || !meetingType) throw new Error('This booking page is not public.');

// Paid meeting types use the checkout operations (see "Paid meetings" below).
if (meetingType.payment_required === true) throw new Error('Use the paid checkout flow.');

const calendar = await meetings.getCalendar({ meetingTypeId: meetingType._id });
if (!calendar) throw new Error('This meeting type has no bookable calendar.');
```

- `branding` carries the display name (`name`), `logo_url`, `language`
  (`'de' | 'en'`), `timezone`, and the account's `data_privacy_url`,
  `imprint_url`, and `terms_of_service_url` for the consent text.
- `meetingType` carries `_id`, `account_id`, `name`, `description`, `duration`
  (minutes), `timezone`, `location` (`physical`, `phone`, `google_meet`,
  `microsoft_teams`, or `fahrplan`), `payment_required`, and
  `custom_booking_checkboxes` (see step 4).
- `calendar` carries the `id` you pass as `calendarId` when reserving and
  booking. `meetingType.account_id` is the `accountId` for both calls.

### 2. Read the slots of a day

```ts
const availability = await meetings.getSlots({
  meetingTypeId: meetingType._id,
  date: '2026-11-03'
});
// {
//   date: '2026-11-03',
//   timezone: 'Europe/Berlin',
//   slots: ['09:00', '09:30', '10:00', ...],
//   degraded: false,
//   ...
// }
```

- `date` is a calendar day (`YYYY-MM-DD`) in the meeting's **booking time
  zone**, which the response returns as `timezone` (the availability rule's
  zone, else the meeting type's). It is not the visitor's local day.
- Each slot is a 24-hour wall-clock start time `HH:mm` in that same
  `timezone`. A slot lasts `meetingType.duration` minutes.
- `degraded: true` means an external calendar could not be read. Moreflow then
  returns no slots instead of guessing free time; show a "try again later"
  state.

Convert a slot to the UTC instants the reservation and booking expect:

```ts
const [slot] = availability.slots; // the slot the guest picked
if (!slot) throw new Error('No free slots on this day.');
const { startsAt, endsAt } = slotRange(availability, slot, meetingType);
// 09:00 on 2026-11-03 in Europe/Berlin starts at '2026-11-03T08:00:00.000Z'.
```

`slotRange` uses the availability response's booking `timezone`, including
when it differs from the meeting type or visitor's zone. During a spring-forward
gap, a nonexistent local time throws `MoreflowMeetingsError` with code
`VALIDATION_ERROR`; reload availability. During a fall-back overlap, the
helper chooses the **earlier** instant (02:30 in Berlin on 2026-10-25 means
00:30 UTC). Duration is elapsed minutes, so a meeting can cross an offset
change. Invalid dates, times, zones, or nonpositive durations are rejected.
The helper formats a slot; the server still decides whether it is bookable.

To display a slot in the visitor's own zone, format `startsAt` with
`Intl.DateTimeFormat(undefined, { timeStyle: 'short' })`.

### 3. Reserve the slot

A reservation holds the slot for 15 minutes while the guest fills in the form.
`createReservationFlow()` keeps the reservation id and the idempotency keys for
you.

```ts
const flow = meetings.createReservationFlow();
const visitorTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const slotInput = {
  accountId: meetingType.account_id,
  meetingTypeId: meetingType._id,
  calendarId: calendar.id,
  startsAt,
  endsAt
};

try {
  const hold = await flow.reserve({ ...slotInput, timezone: visitorTimeZone });
  sessionStorage.setItem('moreflow:meeting-reservation', hold.reservation_id);
  // Render a countdown to hold.expires_at (an ISO-8601 instant, 15 minutes from now).
} catch (error) {
  if (error instanceof MoreflowMeetingsError && error.code === 'CONFLICT') {
    // Someone else took the slot. Reload the day's slots and let the guest pick again.
  }
  throw error;
}
```

When the guest returns after a reload, create a flow with the saved opaque
reservation id, then check it with the server:

```ts
const savedReservationId = sessionStorage.getItem('moreflow:meeting-reservation');
const resumedFlow = meetings.createReservationFlow({
  reservationId: savedReservationId ? meetingReservationId(savedReservationId) : undefined
});
await resumedFlow.refresh();
```

The low-level equivalent is `createMeetingReservationFlow(meetings, { reservationId })`.
A saved flow starts in `restoring`; an active `refresh()` moves it to `resumed`,
with `reservationId` and optional `expiresAt`. A newly reserved flow uses `held`
and carries the full creation response in `reservation`. Both can `book()` or
`cancel()`. A failed refresh preserves the saved id so the guest can retry.
Restore the selected slot and form draft separately; the flow does not persist
guest data. Treat the reservation id as a bearer capability and do not log it.

`refresh()` returns `{ isActive: false }` and moves the flow to `expired` once
the hold has lapsed; reserve again in that case. Call `flow.cancel()` when the
guest abandons the slot so it is free immediately. Clear the stored id after
booking, cancellation, or expiry.

Calling `reserve()` again releases the current hold **before** requesting the
replacement, including when the slots overlap. If release fails, the old hold
stays in state and no new reservation is requested. If replacement fails after
release, state is `cancelled`; the old slot is no longer held. Retry the same
input to reuse the pending creation idempotency key. Lifecycle calls are
serialized, so simultaneous selections cannot leave two holds in this flow.

### 4. Book with consent and custom checkboxes

```ts
const checkboxes = meetingType.custom_booking_checkboxes;
const language = branding.language ?? 'de';
// Render one checkbox per entry with checkbox.text[language]; read the guest's choices:
const checked = new Set(['newsletter-terms']);

try {
  const booking = await flow.book({
    ...slotInput,
    guest: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phoneNumber: '+4915112345678' // optional
    },
    timezone: visitorTimeZone,
    locationType: meetingType.location,
    privacyConsent: true, // required: the guest acknowledged the privacy notice
    customCheckboxes: checkboxes.map((checkbox) => ({
      ...checkbox,
      checked: checked.has(checkbox.id)
    }))
  });
  showConfirmation(booking);
} catch (error) {
  if (error instanceof MoreflowMeetingsError) {
    // VALIDATION_ERROR: privacyConsent missing, or details.missing_custom_checkboxes lists
    //   required checkboxes the guest did not tick.
    // RESERVATION_EXPIRED: the 15-minute hold lapsed; error.recovery names
    //   meetings.reservations.createReservation, so reserve the slot again.
    // CONFLICT: the slot was taken; reload the slots.
  }
  throw error;
}
```

- `privacyConsent` must be `true`. Show a sentence such as "I have read the
  privacy policy" linking `branding.data_privacy_url`; the booking is refused
  without it.
- Send every entry of `custom_booking_checkboxes` back with its `id`,
  `required`, `text`, and the guest's `checked` value. The server rejects the
  booking when a `required` checkbox is unchecked, and stores the snapshot with
  the meeting.
- `startsAt` and `endsAt` must be the UTC ISO strings from step 2.
  `timezone` is the guest's display zone for emails; slot matching always uses
  the booking time zone.
- The client adds acquisition tracking (click ids and UTM data from
  `@moreflow/tracking`) to the booking only when you create it with
  `acquisitionTracking` (see [Acquisition tracking and consent](#acquisition-tracking-and-consent)).

### 5. Show the confirmation

```ts
function showConfirmation(booking: { meeting_id: string; guest_email: string }) {
  // booking.meeting_id identifies the meeting; booking.guest_email received the confirmation.
}
```

`book()` resolves with `{ success: true, meeting_id, reservation_id,
reservation_expires_at, guest_email }`. Moreflow sends the confirmation email
from the meeting type's template, adds the meeting to the host's calendar, and
records the guest as a client in the CRM. Show the slot in the guest's zone and
tell them to check `guest_email`. A retry of `book()` after a network error
reuses the same idempotency key and returns the same booking.

The guest reschedules or cancels from the links in the confirmation email. To
build that page yourself, read the token from the link and call
`validateReschedule({ token })`, then `reschedule({ token, startsAt, endsAt })`
or `cancel({ token, reason })`.

## Paid meetings

Paid checkout (`createStripePaymentIntent`, `finalizePaid`) and checkout OTP
(`requestCheckoutOtp`, `verifyCheckoutOtp`) operation contracts are exported and
callable through the transport. Payment collection UI is intentionally outside
this headless package.

## React and Next.js

The core package has no React dependency. Its stable `subscribe` and
`getSnapshot` methods work directly with `useSyncExternalStore`. Keep the flow
instance stable; a snapshot retains its identity until the state changes, and
`subscribe` returns an unsubscribe function. Availability, validation, and
booking decisions remain on the server.

For the Next.js App Router, put this component in a Client Component file
(such as `app/book/booking.tsx`). Read a saved reservation id from browser
storage after mounting, then mount this component with that initial id; do
not read `sessionStorage` during server rendering. For a different initial
reservation, remount it with a different React `key`.

```tsx
'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  createMeetingClient,
  type MeetingReservationId,
  type PublicBookingFlowInput,
  type PublicReservationCreateInput
} from '@moreflow/meetings';

const meetings = createMeetingClient();

export function Booking({ initialReservationId, slot, bookingDetails }: {
  initialReservationId?: MeetingReservationId;
  slot: PublicReservationCreateInput;
  bookingDetails: PublicBookingFlowInput;
}) {
  const [flow] = useState(() => meetings.createReservationFlow({
    reservationId: initialReservationId
  }));
  const state = useSyncExternalStore(flow.subscribe, flow.getSnapshot, flow.getSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!initialReservationId) return;
    let mounted = true;
    void flow.refresh().catch(() => {
      if (mounted) setError('Could not refresh the reservation. Try again.');
    });
    return () => { mounted = false; };
  }, [flow, initialReservationId]);

  useEffect(() => {
    const id = state.status === 'held' ? state.reservation.reservation_id
      : state.status === 'resumed' ? state.reservationId : undefined;
    if (id) sessionStorage.setItem('moreflow:meeting-reservation', id);
    else if (['booked', 'cancelled', 'expired'].includes(state.status)) {
      sessionStorage.removeItem('moreflow:meeting-reservation');
    }
  }, [state]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try { await action(); }
    catch { setError('The request failed. Try again or choose another slot.'); }
    finally { setBusy(false); }
  }

  const held = state.status === 'held' || state.status === 'resumed';
  return <section aria-busy={busy}>
    <p role="status">{state.status}</p>
    {error && <p role="alert">{error}</p>}
    <button disabled={busy} onClick={() => void run(() => flow.reserve(slot))}>Reserve</button>
    <button disabled={busy || !held} onClick={() => void run(() => flow.book(bookingDetails))}>Book</button>
    <button disabled={busy || !held} onClick={() => void run(() => flow.cancel())}>Release</button>
    <button disabled={busy} onClick={() => void run(() => flow.refresh())}>Refresh</button>
  </section>;
}
```

For the Pages Router, use the same component from `pages/book.tsx`; the
`'use client'` directive is unnecessary there. The third `useSyncExternalStore`
argument supplies the stable snapshot during SSR and hydration. Pass the same
initial props to server and browser, and restore browser-only storage after
mounting. Public reads can also run in `getServerSideProps` (Pages Router) or
a Server Component (App Router), then pass serializable data to the booking
component. Keep browser storage, event handlers, and mutations in the browser;
no API token is needed. Surface structured recovery from the error table below
when replacing this example's generic error messages with your UI.

## Script tag

Pages without a bundler load the browser build, which exposes the same API as
`window.MoreflowMeetings`:

```html
<script src="https://cdn.jsdelivr.net/npm/@moreflow/meetings@0.2.0/dist/browser.js"></script>
<script>
  const meetings = window.MoreflowMeetings.createMeetingClient();
</script>
```

Pin an exact version and change the URL deliberately on every upgrade. The host
page's Content Security Policy must allow `https://cdn.jsdelivr.net` for scripts
and `https://api.moreflow.io` for `connect-src`.

## Auth and CORS

The public meeting operations need no API token, and the client sends no cookies
(`credentials: 'omit'`). Never put an API token in page source: anyone can read it
there. Meeting types are public through their booking link, so there is no domain
allowlist; the server decides availability, reservation lifetime, and every
booking rule.

The client posts JSON to `/v1/operations/<operation id>`, so the browser sends a
CORS preflight first. `https://api.moreflow.io` does not answer that preflight
for the meeting operations from other sites, so a browser on your domain cannot
call it directly. Forward `POST /v1/operations/*` from your own
server to `https://api.moreflow.io` and create the client with `baseUrl: ''`, or
call the client from server-side code.

## Stored data

The client keeps the reservation flow in memory and stores nothing in the
browser by itself.

| Key | Storage | Lifetime | Purpose |
| --- | --- | --- | --- |
| `moreflow:acquisition:v1` | `sessionStorage` (`localStorage` with `persistence: 'local'`) | Until the tab is closed (or `ttlDays`, with `localStorage`) | Acquisition values from `@moreflow/tracking`, written only with `acquisitionTracking` enabled. |

The package sets no cookies.

## Acquisition tracking and consent

The client adds no acquisition tracking to bookings unless you allow it:

```ts
const meetings = createMeetingClient({
  acquisitionTracking: () => consentManager.hasMarketingConsent()
});
```

With `acquisitionTracking: true`, or a function that returns `true`, every
`createBooking()` and reservation-flow `book()` carries the UTM parameters and
ad click ids from the page URL, Meta's `_fbp`/`_fbc` cookies, the referrer, and
the page URL. Reading those cookies and writing `sessionStorage` needs the
visitor's consent in the EU (§ 25 TDDDG in Germany), so tie the option to your
consent banner. A function is asked on every booking. Click ids and
`attribution` you pass in the booking input are always sent. The same option
exists on `@moreflow/forms` and `@moreflow/chatbots`.

One `configureAcquisitionTracking({ persistence, model, ttlDays })` call at startup (re-exported from `@moreflow/tracking`) applies to these captures and to the ones your own page makes, so a site that captures on every route change and enables `acquisitionTracking: true` here sends the same landing values without a wrapper. Pass `trackingCapture: { model: 'last-touch', persistence: 'local' }` to override capture options for this client, or `trackingCapture: () => myTrackingMetadata` to supply your own metadata at booking time. Both forms run only while `acquisitionTracking` permits capture.

## Errors

Every helper throws `MoreflowMeetingsError`. Its `MeetingsErrorCode` includes `CONFLICT`, `RESERVATION_EXPIRED`, `SLOT_BOOKED` or `INVALID_CODE` and the SDK's own codes (`NETWORK_ERROR`, `ABORTED`, `VALIDATION_ERROR`, `INVALID_RESPONSE`, `FETCH_UNAVAILABLE`, `REQUEST_FAILED`). A newer server may send a code not in the union.

`isMoreflowError(error)`, exported by this package, recognizes the shared `Symbol.for('moreflow.error')` brand across separately bundled `@moreflow/forms`, `@moreflow/chatbots`, `@moreflow/meetings` and `@moreflow/api`. Use it to narrow an unknown caught value to this common error shape:

| Field | Type | Meaning |
| --- | --- | --- |
| `code` | `string` | Stable failure code; branch on this, including newer server codes. |
| `message` | `string` | Developer explanation, using the server's message when available. |
| `status` | `number \| undefined` | HTTP status; `undefined` when no response arrived. |
| `retryable` | `boolean` | Whether the same request may succeed later: HTTP 408, 425, 429, 5xx, network failures or a server-declared retryable failure. Caller cancellation (`ABORTED`) is not retryable. |
| `recovery` | `{ operation, args?, requiredFields? } \| undefined` | The operation that resolves the failure, its known arguments and input still needed. |
| `details` | `Record<string, unknown>` | Structured server context; `{}` when absent. Operation `context` is merged into it. |
| `requestId` | `string \| undefined` | Server request id to quote when contacting support. |
| `responseBody` | `unknown` | Raw response body, unchanged. |

`MoreflowMeetingsError.operationFailure` also holds the server's failure object, unchanged.

Branch on `code`, never on the message.

| Code | Meaning | Recovery |
| --- | --- | --- |
| `ABORTED` | The request was cancelled. | Do not automatically retry; retry only after a new guest action. |
| `NETWORK_ERROR` | No network response arrived. | Check connectivity and retry the same action; flow idempotency keys are retained. |
| `FETCH_UNAVAILABLE` | This runtime has no fetch. | Supply fetchImpl or use a runtime with fetch. |
| `VALIDATION_ERROR` | Input is missing or invalid, including an impossible local slot. | Correct details.field or the server details, collect required consent/checkboxes, or reload slots. |
| `INVALID_RESPONSE` | The successful response could not be read. | Check the API base URL/proxy and retain requestId for support before retrying. |
| `REQUEST_FAILED` | The server supplied no error code. | Inspect status, details and recovery; retry only when retryable. |
| `RESERVATION_REQUIRED` | The flow has no held reservation. | Reserve a slot or restore its reservationId before booking or cancelling. |
| `NOT_FOUND` | The meeting type, account, client or meeting is unavailable. | Reload discovery or check the public booking link. |
| `CONFLICT` | The slot or reservation changed; a paid hold may be protected. | Refresh the reservation and availability; follow recovery rather than discarding a paid hold. |
| `SESSION_FULL` | The group session has no seats left. | Reload slots and select another session. |
| `SLOT_BOOKED` | Someone else booked the slot. | Reload availability and reserve another slot. |
| `RESERVATION_UNAVAILABLE` | The reservation no longer holds the slot. | Reload availability and reserve again. |
| `RESERVATION_EXPIRED` | The hold deadline passed. | Clear the saved id, reload availability and reserve again. |
| `FORBIDDEN` | The management token is invalid. | Use the latest reschedule/cancel link from the confirmation email. |
| `INVALID_STATE` | The action is invalid for the current meeting/payment state. | Refresh server state and follow recovery before another action. |
| `PROVIDER_UNAVAILABLE` | The external calendar could not be checked. | Show a temporary-unavailability state and retry when retryable. |
| `PROVIDER_ERROR` | A calendar or checkout provider failed. | Follow recovery, retry only when retryable, and retain requestId for support. |
| `CONFIGURATION_ERROR` | Booking, payment or branding is not configured. | Ask the booking-page owner to correct the configuration. |
| `PAYMENT_METHOD_UNAVAILABLE` | The chosen payment method is unavailable. | Choose an available payment method or contact the page owner. |
| `NO_CHANNELS_AVAILABLE` | No checkout email/SMS channel can deliver a code. | Contact the page owner to configure a verification channel. |
| `NO_OTP` | No checkout verification code was requested. | Call requestCheckoutOtp before verifyCheckoutOtp. |
| `EXPIRED` | The checkout code expired. | Request a new checkout code. |
| `MAX_ATTEMPTS` | Too many incorrect checkout codes. | Request a new code after the server cooldown. |
| `INVALID_CODE` | The checkout code is incorrect. | Ask for the correct code; respect details.attemptsRemaining. |
| `RATE_LIMIT` | Too many requests. | Wait for the server cooldown before retrying; prevent repeated submissions. |
| `AUTH_ERROR` | The server refused authentication. | Check the public operation and base URL; never add a private API token to browser code. |
| `INTERNAL_ERROR` | The server could not complete the operation. | Retry only when retryable; retain requestId and contact support if it persists. |

A newer server may return additional codes. Prefer its `recovery` operation and
arguments, and use `retryable` for unknown codes; do not loop automatically on
validation or state errors. Raw recovery arguments use the operation contract,
so pass them to `call(recovery.operation, recovery.args)` only after selecting
the appropriate operation and collecting any required input.


## Issues and contributing

Bug reports and feature requests are welcome in [this repository's issue
tracker](https://github.com/moreflow-io/meetings/issues). Development happens
in the private Moreflow monorepo alongside the server contract this package
mirrors; each released version is synced here, so the published source always
matches the npm release.
