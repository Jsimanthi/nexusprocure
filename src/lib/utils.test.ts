import { describe, it, expect } from 'vitest';
import { formatCurrency, getPOStatusColor, getIOMStatusColor, getPRStatusColor } from './utils';
import { POStatus } from '@/types/po';
import { IOMStatus } from '@/types/iom';
import { PRStatus } from '@/types/pr';

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('should format a number into INR currency format', () => {
      expect(formatCurrency(12345)).toBe('₹12,345.00');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('₹0.00');
    });

    it('should handle different currencies', () => {
      expect(formatCurrency(123, 'USD')).toBe('$123.00');
    });
  });

  describe('getPOStatusColor', () => {
    it('should return the correct color class for each PO status', () => {
      expect(getPOStatusColor(POStatus.APPROVED)).toContain('green');
      expect(getPOStatusColor(POStatus.REJECTED)).toContain('red');
      expect(getPOStatusColor(POStatus.PENDING_APPROVAL)).toContain('blue');
      expect(getPOStatusColor(POStatus.DRAFT)).toContain('gray');
    });
  });

  describe('getIOMStatusColor', () => {
    it('should return the correct color class for each IOM status', () => {
      expect(getIOMStatusColor(IOMStatus.APPROVED)).toContain('green');
      expect(getIOMStatusColor(IOMStatus.REJECTED)).toContain('red');
      expect(getIOMStatusColor(IOMStatus.UNDER_REVIEW)).toContain('yellow');
    });
  });

  describe('getPRStatusColor', () => {
    it('should return the correct color class for each PR status', () => {
      expect(getPRStatusColor(PRStatus.APPROVED)).toContain('green');
      expect(getPRStatusColor(PRStatus.REJECTED)).toContain('red');
      expect(getPRStatusColor(PRStatus.PROCESSED)).toContain('purple');
    });
  });
});
