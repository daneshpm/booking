import { randomBytes } from 'node:crypto';

const BASE_URL = (process.env.VIDEO_MEETING_BASE_URL || 'https://meet.jit.si').replace(/\/+$/, '');
const ROOM_PREFIX = process.env.VIDEO_MEETING_ROOM_PREFIX || 'rooman';

export function generateMeetingLink(): string {
  return `${BASE_URL}/${ROOM_PREFIX}-${randomBytes(12).toString('hex')}`;
}
