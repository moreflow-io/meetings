# `@moreflow/meetings`

Headless browser protocol helpers for native Moreflow public meeting booking
embeds. The package contains no UI, React, styles, or business logic.

```ts
import { createMeetingClient, meetingTypeId } from '@moreflow/meetings';

const meetings = createMeetingClient({ apiBaseUrl: 'https://api.moreflow.io' });
const slots = await meetings.getSlots({
  meetingTypeId: meetingTypeId('00000000-0000-4000-8000-000000000001'),
  date: '2026-08-24'
});
```

For the free public flow, create a reservation through `createReservationFlow`,
then call `book` or `cancel`. The server remains authoritative for availability,
reservation lifetime, booking validation, payment, rescheduling, and cancellation.
Structured operation failures retain their original recovery data on
`MoreflowMeetingsError`.

Paid checkout and OTP operation contracts are exported and callable through the
transport. Payment collection UI is intentionally outside this headless package.

## Issues and contributing

Bug reports and feature requests are welcome in [this repository's issue
tracker](https://github.com/moreflow-io/meetings/issues). Development happens
in the private Moreflow monorepo alongside the server contract this package
mirrors; each released version is synced here, so the published source always
matches the npm release.
