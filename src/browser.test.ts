import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

type BrowserMeetings = typeof import('./index');

const browserBundle = readFileSync(new URL('../dist/browser.js', import.meta.url), 'utf8');

function loadBrowserMeetings(): BrowserMeetings {
  const sandbox = {
    Headers,
    Response,
    URL,
    crypto: { randomUUID: () => 'key-1' },
    location: {
      href: 'https://customer.example.test/book',
      origin: 'https://customer.example.test'
    },
    document: { cookie: '', referrer: '' },
    window: undefined as unknown
  };
  sandbox.window = sandbox;
  const context = createContext(sandbox);
  runInContext(browserBundle, context, { filename: 'dist/browser.js' });
  const meetings = Reflect.get(context, 'MoreflowMeetings');
  expect(meetings).toBeTruthy();
  return meetings as BrowserMeetings;
}

describe('@moreflow/meetings browser build', () => {
  it('runs as a classic script and books through the production API, not the page origin', async () => {
    expect(browserBundle).not.toMatch(/(?:^|\n)\s*import\s/mu);
    const meetings = loadBrowserMeetings();
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    const client = meetings.createMeetingClient({
      trackingCapture: () => ({}),
      fetchImpl: async (input, init) => {
        requests.push({
          url: String(input),
          body: JSON.parse(String(init?.body)) as Record<string, unknown>
        });
        return new Response(
          JSON.stringify({
            success: true,
            data: { success: true, meeting_id: 'meeting-1' }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    });

    await client.createBooking({
      accountId: meetings.meetingAccountId('account-1'),
      meetingTypeId: meetings.meetingTypeId('type-1'),
      calendarId: meetings.meetingCalendarId('calendar-1'),
      startsAt: '2026-11-02T09:00:00.000Z',
      endsAt: '2026-11-02T09:30:00.000Z',
      timezone: 'Europe/Berlin',
      guest: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.test'
      }
    });

    expect(requests[0]?.url).toBe('https://api.moreflow.io/v1/operations/bookings.public.create');
    expect(requests[0]?.body).toMatchObject({
      account_id: 'account-1',
      meeting_type_id: 'type-1',
      calendar_id: 'calendar-1',
      dateTime: {
        start: '2026-11-02T09:00:00.000Z',
        end: '2026-11-02T09:30:00.000Z'
      }
    });
    expect(requests[0]?.body).not.toHaveProperty('startsAt');
  });

  it('throws the shared error shape from the global API', async () => {
    const meetings = loadBrowserMeetings();
    const flow = meetings
      .createMeetingClient({ fetchImpl: async () => new Response('{}') })
      .createReservationFlow();
    const failure = await flow.cancel().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(meetings.MoreflowMeetingsError);
    expect(failure).toMatchObject({
      name: 'MoreflowMeetingsError',
      code: 'RESERVATION_REQUIRED',
      retryable: false,
      details: {}
    });
  });
});
