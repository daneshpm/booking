import { describe, it, expect } from 'vitest';
import { validateImageValue, MAX_IMAGE_DATA_URL_LENGTH } from '../lib/image-value';

/**
 * Logos and avatars are submitted as base64 data URLs straight into a text
 * column. The browser checks type and size, but a server action is a public
 * HTTP endpoint and a caller that skips the browser skips those checks, so
 * this is the only thing standing between the field and whatever a caller
 * feels like storing.
 */

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

describe('image value validation', () => {
  it('accepts a base64 PNG data URL', () => {
    expect(validateImageValue(PNG).valid).toBe(true);
  });

  it('accepts JPEG, WEBP and GIF', () => {
    for (const type of ['image/jpeg', 'image/webp', 'image/gif']) {
      expect(validateImageValue(`data:${type};base64,iVBORw0KGgo=`).valid).toBe(true);
    }
  });

  it('accepts a preset avatar reference', () => {
    expect(validateImageValue('preset:avatar-3').valid).toBe(true);
  });

  it('accepts empty, null and undefined as "no image"', () => {
    expect(validateImageValue('').valid).toBe(true);
    expect(validateImageValue(null).valid).toBe(true);
    expect(validateImageValue(undefined).valid).toBe(true);
  });

  it('rejects an SVG, which is a document and can carry script', () => {
    const svg = 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj48L3N2Zz4=';

    expect(validateImageValue(svg).valid).toBe(false);
  });

  it('rejects a payload that is not an image at all', () => {
    const html = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';

    expect(validateImageValue(html).valid).toBe(false);
  });

  it('rejects a javascript: URL', () => {
    expect(validateImageValue('javascript:alert(1)').valid).toBe(false);
  });

  it('rejects a remote URL, which would beacon every viewer to a third party', () => {
    expect(validateImageValue('https://evil.example.com/pixel.gif').valid).toBe(false);
    expect(validateImageValue('http://evil.example.com/pixel.gif').valid).toBe(false);
  });

  it('rejects a data URL larger than the cap', () => {
    const huge = `data:image/png;base64,${'A'.repeat(MAX_IMAGE_DATA_URL_LENGTH)}`;

    const result = validateImageValue(huge);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too large/i);
  });

  it('rejects a data URL whose payload is not base64', () => {
    expect(validateImageValue('data:image/png;base64,<script>alert(1)</script>').valid).toBe(false);
  });

  it('rejects a preset name carrying a path traversal', () => {
    expect(validateImageValue('preset:../../../etc/passwd').valid).toBe(false);
  });

  it('rejects a bare string', () => {
    expect(validateImageValue('just some text').valid).toBe(false);
  });
});
