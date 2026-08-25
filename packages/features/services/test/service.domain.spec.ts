import { describe, it, expect } from 'vitest';
import { ServiceDuration } from '../src/domain/value-objects/ServiceDuration.js';
import { ServiceBuffer } from '../src/domain/value-objects/ServiceBuffer.js';
import { Money } from '../src/domain/value-objects/Money.js';
import { Service } from '../src/domain/entities/Service.js';
import { DomainError } from '@zoho-bookings/core';

describe('Service Domain Invariants', () => {
  describe('ServiceDuration', () => {
    it('should create valid durations', () => {
      const d30 = ServiceDuration.create(30);
      expect(d30.minutes).toBe(30);
      expect(d30.format()).toBe('30 mins');

      const d60 = ServiceDuration.create(60);
      expect(d60.format()).toBe('1 hr');

      const d90 = ServiceDuration.create(90);
      expect(d90.format()).toBe('1 hr 30 mins');
    });

    it('should reject durations under 5 minutes', () => {
      expect(() => ServiceDuration.create(4)).toThrow(DomainError);
    });

    it('should reject durations over 24 hours', () => {
      expect(() => ServiceDuration.create(1441)).toThrow(DomainError);
    });
  });

  describe('ServiceBuffer', () => {
    it('should calculate total buffer correctly', () => {
      const buffer = ServiceBuffer.create(10, 15);
      expect(buffer.beforeMinutes).toBe(10);
      expect(buffer.afterMinutes).toBe(15);
      expect(buffer.totalBufferMinutes).toBe(25);
    });

    it('should reject negative buffers', () => {
      expect(() => ServiceBuffer.create(-5, 10)).toThrow(DomainError);
    });
  });

  describe('Money', () => {
    it('should format zero as Free', () => {
      const free = Money.create(0, 'USD');
      expect(free.format()).toBe('Free');
    });

    it('should format currency correctly', () => {
      const paid = Money.create(150, 'USD');
      expect(paid.format()).toBe('$150.00');
    });
  });

  describe('Service Entity', () => {
    it('should create an active service with correct invariants', () => {
      const service = Service.create({
        workspaceId: 'ws-123',
        name: 'Initial Consultation',
        slug: 'initial-consultation',
        durationMinutes: 45,
        bufferBeforeMinutes: 10,
        bufferAfterMinutes: 15,
        price: 120,
        currency: 'USD',
        locationType: 'ONLINE_MEETING',
      });

      expect(service.name).toBe('Initial Consultation');
      expect(service.slug).toBe('initial-consultation');
      expect(service.duration.minutes).toBe(45);
      expect(service.buffer.totalBufferMinutes).toBe(25);
      expect(service.pricing.amount).toBe(120);
      expect(service.isActive).toBe(true);
    });

    it('should reject service with invalid slug', () => {
      expect(() =>
        Service.create({
          workspaceId: 'ws-123',
          name: 'Bad Slug Service',
          slug: 'Bad Slug!',
          durationMinutes: 30,
        })
      ).toThrow(DomainError);
    });
  });
});
