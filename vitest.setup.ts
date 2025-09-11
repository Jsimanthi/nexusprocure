import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: { status: number }) => ({
      json: () => Promise.resolve(body),
      status: init?.status || 200,
      ...init,
    }),
  },
}));
