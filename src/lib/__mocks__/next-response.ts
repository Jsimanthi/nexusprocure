import { vi } from 'vitest';

// This is a more robust mock for the Next.js NextResponse object.
// It handles both the constructor `new NextResponse(...)` and the static method `NextResponse.json(...)`.

// 1. Mock the static `json` method
const json = vi.fn((data, init) => {
  const body = JSON.stringify(data);
  const headers = new Headers(init?.headers);
  const status = init?.status || 200;

  return {
    _body: body,
    status,
    headers,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(body),
  };
});

// 2. Mock the constructor
const constructor = vi.fn((body, init) => {
  const headers = new Headers(init?.headers);
  const status = init?.status || 200;

  return {
    _body: body,
    status,
    headers,
    text: () => Promise.resolve(body ? body.toString() : ''),
    // A simple json implementation for the instance, in case it's ever called on a non-JSON body
    json: () => {
        try {
            return Promise.resolve(JSON.parse(body.toString()));
        } catch {
            return Promise.resolve({});
        }
    },
  };
});

// 3. Combine the constructor and static methods into a single mock object
export const NextResponse = Object.assign(constructor, { json });