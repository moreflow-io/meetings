import { MoreflowMeetingsError } from './errors';
import type { PublicMeetingSlots, PublicMeetingType } from './public-types';

function invalidSlot(field: string, message: string): never {
  throw new MoreflowMeetingsError({
    code: 'VALIDATION_ERROR',
    message,
    details: { field }
  });
}

/**
 * Convert a slot in the availability's booking timezone to UTC instants.
 * Nonexistent local times are rejected; an overlap uses the earlier instant.
 * Duration is elapsed minutes, including across offset changes.
 */
export function slotRange(
  availability: Pick<PublicMeetingSlots, 'date' | 'timezone'>,
  time: string,
  meetingType: Pick<PublicMeetingType, 'duration'>
): { startsAt: string; endsAt: string } {
  const { date, timezone } = availability;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) invalidSlot('date', 'Expected a YYYY-MM-DD date.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) invalidSlot('time', 'Expected an HH:mm slot.');
  const wallClock = Date.parse(`${date}T${time}:00.000Z`);
  if (!Number.isFinite(wallClock) || new Date(wallClock).toISOString().slice(0, 10) !== date) {
    invalidSlot('date', 'The slot date does not exist.');
  }
  if (!Number.isFinite(meetingType.duration) || meetingType.duration <= 0) {
    invalidSlot('duration', 'Meeting duration must be a positive number of minutes.');
  }
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    invalidSlot('timezone', 'The booking timezone is not supported.');
  }
  function offsetAt(instant: number): number {
    const parts = format.formatToParts(instant);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((entry) => entry.type === type)?.value;
    return (
      Date.parse(
        `${part('year')?.padStart(4, '0')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}.000Z`
      ) - instant
    );
  }
  // Sample both sides of a transition; round-trip candidates instead of shifting gaps.
  const offsets = new Set(
    [-36, -12, 0, 12, 36].map((hours) => offsetAt(wallClock + hours * 3_600_000))
  );
  const candidates = [...offsets]
    .map((offset) => wallClock - offset)
    .filter((instant) => instant + offsetAt(instant) === wallClock);
  if (!candidates.length)
    invalidSlot('time', 'The slot does not exist in the booking timezone. Reload availability.');
  const start = Math.min(...candidates);
  const end = start + meetingType.duration * 60_000;
  if (!Number.isFinite(end) || Math.abs(end) > 8.64e15)
    invalidSlot('duration', 'Meeting duration exceeds the supported date range.');
  return {
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString()
  };
}
