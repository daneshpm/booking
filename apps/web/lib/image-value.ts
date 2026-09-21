/**
 * Validation for the image fields that are stored as strings.
 *
 * Logos and avatars are not uploaded to storage: the browser reads the file
 * with FileReader and submits a base64 data URL, which is written straight
 * into a text column. The client checks the MIME type and caps the size at
 * 3 MB, but a server action is a public HTTP endpoint — a caller that never
 * runs that code can submit whatever string it likes.
 *
 * Unvalidated, that meant an arbitrarily large body persisted to Postgres and
 * echoed back into an <img src> on every page that renders it.
 */

/** Raster formats only. SVG is excluded deliberately — see below. */
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

/**
 * Cap on the encoded string, matching the 3 MB the browser enforces plus
 * base64's ~33% overhead and a little slack for the prefix.
 */
export const MAX_IMAGE_DATA_URL_LENGTH = 4_200_000;

const DATA_URL_PATTERN = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i;

/** A built-in avatar, stored as `preset:<name>` rather than image data. */
const PRESET_PATTERN = /^preset:[a-z0-9-]{1,40}$/i;

export interface ImageValueResult {
  valid: boolean;
  error?: string;
}

/**
 * Whether a logo or avatar value is safe to persist.
 *
 * Accepts three shapes and nothing else:
 *   - empty, meaning "no image"
 *   - `preset:<name>`, a built-in avatar
 *   - a base64 data URL of an allowed raster image type, within the cap
 *
 * An https:// URL is rejected too. It looks harmless, but it would make every
 * dashboard that renders the image issue a request to a third-party server,
 * handing that server the viewer's IP and a per-view beacon.
 */
export function validateImageValue(value: string | null | undefined): ImageValueResult {
  if (value === null || value === undefined || value === '') return { valid: true };

  if (typeof value !== 'string') return { valid: false, error: 'Image must be a string.' };

  if (PRESET_PATTERN.test(value)) return { valid: true };

  if (value.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return { valid: false, error: 'Image is too large. Please choose one under 3MB.' };
  }

  const match = DATA_URL_PATTERN.exec(value);
  if (!match) {
    return {
      valid: false,
      error: 'Image must be an uploaded picture rather than a link.',
    };
  }

  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    // image/svg+xml is the notable exclusion: an SVG is a document, it can
    // carry script, and some contexts will execute it. There is no reason a
    // logo needs to be one.
    return { valid: false, error: 'Image must be a PNG, JPEG, WEBP or GIF.' };
  }

  return { valid: true };
}
