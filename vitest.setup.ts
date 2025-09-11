import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({
      json: () => Promise.resolve(body),
      ...init,
    }),
  },
}));
