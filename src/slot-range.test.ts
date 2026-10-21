import { describe, expect, it } from 'vitest';
import { MoreflowMeetingsError, slotRange } from './index';

const meeting = { duration: 30 };
const berlin = (date: string) => ({ date, timezone: 'Europe/Berlin' });

describe('slotRange', () => {
  it('uses the booking timezone rather than the meeting or runtime timezone', () => {
    const meetingInAnotherZone = { ...meeting, timezone: 'America/New_York' };
    expect(slotRange(berlin('2026-11-03'), '09:00', meetingInAnotherZone)).toEqual({
      startsAt: '2026-11-03T08:00:00.000Z',
      endsAt: '2026-11-03T08:30:00.000Z'
    });
    expect(slotRange({ date: '2026-07-01', timezone: 'Asia/Kathmandu' }, '00:15', meeting)).toEqual(
      {
        startsAt: '2026-06-30T18:30:00.000Z',
        endsAt: '2026-06-30T19:00:00.000Z'
      }
    );
  });

  it('rejects the spring-forward gap rather than silently moving the slot', () => {
    expect(() => slotRange(berlin('2026-03-29'), '02:30', meeting)).toThrow(MoreflowMeetingsError);
    expect(() => slotRange(berlin('2026-03-29'), '02:30', meeting)).toThrow(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        details: { field: 'time' }
      })
    );
    expect(slotRange(berlin('2026-03-29'), '01:45', meeting)).toEqual({
      startsAt: '2026-03-29T00:45:00.000Z',
      endsAt: '2026-03-29T01:15:00.000Z'
    });
    expect(slotRange(berlin('2026-03-29'), '03:00', meeting).startsAt).toBe(
      '2026-03-29T01:00:00.000Z'
    );
  });

  it('chooses the earlier occurrence in a fall-back overlap and adds elapsed duration', () => {
    expect(slotRange(berlin('2026-10-25'), '02:45', meeting)).toEqual({
      startsAt: '2026-10-25T00:45:00.000Z',
      endsAt: '2026-10-25T01:15:00.000Z'
    });
    expect(slotRange(berlin('2026-10-25'), '03:00', meeting).startsAt).toBe(
      '2026-10-25T02:00:00.000Z'
    );
  });

  it.each([
    ['2026-02-30', '09:00', 'Europe/Berlin', 30, 'date'],
    ['2026-11-03', '24:00', 'Europe/Berlin', 30, 'time'],
    ['2026-11-03', '9:00', 'Europe/Berlin', 30, 'time'],
    ['2026-11-03', '09:00', 'not-a-zone', 30, 'timezone'],
    ['2026-11-03', '09:00', 'Europe/Berlin', 0, 'duration'],
    ['2026-11-03', '09:00', 'Europe/Berlin', Number.NaN, 'duration']
  ])('rejects invalid slot arguments (%s %s %s %s)', (date, time, timezone, duration, field) => {
    expect(() => slotRange({ date, timezone }, time, { duration })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR', details: { field } })
    );
  });
});
