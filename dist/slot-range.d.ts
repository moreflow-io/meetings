import type { PublicMeetingSlots, PublicMeetingType } from './public-types';
/**
 * Convert a slot in the availability's booking timezone to UTC instants.
 * Nonexistent local times are rejected; an overlap uses the earlier instant.
 * Duration is elapsed minutes, including across offset changes.
 */
export declare function slotRange(availability: Pick<PublicMeetingSlots, 'date' | 'timezone'>, time: string, meetingType: Pick<PublicMeetingType, 'duration'>): {
    startsAt: string;
    endsAt: string;
};
