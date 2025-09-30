import { describe, it, expect } from 'vitest';
import { formatCurrency, getPOStatusColor, getIOMStatusColor, getPRStatusColor } from './utils';
import { POStatus } from '@/types/po';
import { IOMStatus } from '@/types/iom';
import { PRStatus } from '@/types/pr';

describe('formatCurrency', () => {
  it('should format a positive number correctly with INR currency symbol', () => {
    // The non-breaking space might be represented differently, so we check for both.
    expect(formatCurrency(12345.67)).toMatch(/₹(12,345.67|12,345.67)/);
  });

  it('should format zero correctly', () => {
    expect(formatCurrency(0)).toMatch(/₹(0.00|0.00)/);
  });

  it('should handle large numbers', () => {
    expect(formatCurrency(1000000)).toMatch(/₹(10,00,000.00|10,00,000.00)/);
  });

  it('should use a different currency when specified', () => {
    expect(formatCurrency(123.45, 'USD')).toBe('$123.45');
  });
});

describe('Status Color Utilities', () => {
  it('getPOStatusColor should return the correct class for each PO status', () => {
    expect(getPOStatusColor(POStatus.DRAFT)).toBe('bg-gray-100 text-gray-800');
    expect(getPOStatusColor(POStatus.PENDING_APPROVAL)).toBe('bg-blue-100 text-blue-800');
    expect(getPOStatusColor(POStatus.APPROVED)).toBe('bg-green-100 text-green-800');
    expect(getPOStatusColor(POStatus.REJECTED)).toBe('bg-red-100 text-red-800');
    expect(getPOStatusColor(POStatus.ORDERED)).toBe('bg-purple-100 text-purple-800');
    expect(getPOStatusColor(POStatus.DELIVERED)).toBe('bg-teal-100 text-teal-800');
    expect(getPOStatusColor(POStatus.CANCELLED)).toBe('bg-red-100 text-red-800');
  });

  it('getIOMStatusColor should return the correct class for each IOM status', () => {
    expect(getIOMStatusColor(IOMStatus.DRAFT)).toBe('bg-gray-100 text-gray-800');
    expect(getIOMStatusColor(IOMStatus.SUBMITTED)).toBe('bg-blue-100 text-blue-800');
    expect(getIOMStatusColor(IOMStatus.UNDER_REVIEW)).toBe('bg-yellow-100 text-yellow-800');
    expect(getIOMStatusColor(IOMStatus.APPROVED)).toBe('bg-green-100 text-green-800');
    expect(getIOMStatusColor(IOMStatus.REJECTED)).toBe('bg-red-100 text-red-800');
    expect(getIOMStatusColor(IOMStatus.COMPLETED)).toBe('bg-purple-100 text-purple-800');
  });

  it('getPRStatusColor should return the correct class for each PR status', () => {
    expect(getPRStatusColor(PRStatus.DRAFT)).toBe('bg-gray-100 text-gray-800');
    expect(getPRStatusColor(PRStatus.PENDING_APPROVAL)).toBe('bg-blue-100 text-blue-800');
    expect(getPRStatusColor(PRStatus.APPROVED)).toBe('bg-green-100 text-green-800');
    expect(getPRStatusColor(PRStatus.REJECTED)).toBe('bg-red-100 text-red-800');
    expect(getPRStatusColor(PRStatus.PROCESSED)).toBe('bg-purple-100 text-purple-800');
    expect(getPRStatusColor(PRStatus.CANCELLED)).toBe('bg-red-100 text-red-800');
  });

  it('should return a default color for an unknown status', () => {
    // Cast to any to bypass TypeScript's type checking for the test
    expect(getPOStatusColor('UNKNOWN_STATUS' as any)).toBe('bg-gray-100 text-gray-800');
    expect(getIOMStatusColor('UNKNOWN_STATUS' as any)).toBe('bg-gray-100 text-gray-800');
    expect(getPRStatusColor('UNKNOWN_STATUS' as any)).toBe('bg-gray-100 text-gray-800');
  });
});