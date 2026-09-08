import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../src/templates';

describe('workflow template rendering', () => {
  const context = {
    customerName: 'Priya Sharma',
    serviceName: 'Career Guidance',
    date: 'Monday, 14 September 2026',
    time: '10:30 AM',
    meetingLink: 'https://meet.example.com/abc',
  };

  it('substitutes a placeholder', () => {
    expect(renderTemplate('Hello {{customerName}}', context)).toBe('Hello Priya Sharma');
  });

  it('substitutes several placeholders in one template', () => {
    expect(renderTemplate('{{serviceName}} on {{date}} at {{time}}', context)).toBe(
      'Career Guidance on Monday, 14 September 2026 at 10:30 AM'
    );
  });

  it('tolerates whitespace inside the braces', () => {
    expect(renderTemplate('Hi {{  customerName  }}', context)).toBe('Hi Priya Sharma');
  });

  it('repeats a placeholder used more than once', () => {
    expect(renderTemplate('{{time}} and {{time}}', context)).toBe('10:30 AM and 10:30 AM');
  });

  it('replaces an unknown placeholder with nothing rather than leaving raw syntax', () => {
    // A customer seeing "{{couponCode}}" in an email is worse than seeing a gap.
    expect(renderTemplate('Code: {{couponCode}}.', context)).toBe('Code: .');
  });

  it('leaves text with no placeholders untouched', () => {
    expect(renderTemplate('No placeholders here.', context)).toBe('No placeholders here.');
  });

  it('leaves single braces alone', () => {
    expect(renderTemplate('Set {customerName} literally', context)).toBe(
      'Set {customerName} literally'
    );
  });

  it('handles an empty template', () => {
    expect(renderTemplate('', context)).toBe('');
  });

  it('does not recursively expand a substituted value', () => {
    // Otherwise a customer could inject a placeholder through their own name.
    const hostile = { customerName: '{{meetingLink}}', meetingLink: 'https://secret.example' };
    expect(renderTemplate('Hi {{customerName}}', hostile)).toBe('Hi {{meetingLink}}');
  });
});
