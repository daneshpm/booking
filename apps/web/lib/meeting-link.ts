import { randomBytes } from 'node:crypto';

/**
 * Base URL for generated video rooms.
 *
 * Defaults to the public Jitsi Meet service, where a room exists as soon as
 * someone opens its URL, so the generated link genuinely works with no API
 * credentials. Point VIDEO_MEETING_BASE_URL at a self-hosted Jitsi (or any
 * provider using path-based room names) for production.
 */
const BASE_URL = (process.env.VIDEO_MEETING_BASE_URL || 'https://meet.jit.si').replace(/\/+$/, '');

/** Prefix applied to room names, to keep them recognisable and hard to guess. */
const ROOM_PREFIX = process.env.VIDEO_MEETING_ROOM_PREFIX || 'rooman';

/**
 * Create a unique, working video meeting URL.
 *
 * The room name carries 96 bits of entropy so an outsider cannot find a
 * meeting by guessing.
 */
export function generateMeetingLink(): string {
  const room = randomBytes(12)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '');
  return `${BASE_URL}/${ROOM_PREFIX}-${room}`;
}
