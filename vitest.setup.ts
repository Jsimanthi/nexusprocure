import '@testing-library/jest-dom';
import { vi } from 'vitest';

// A more robust mock for next/server that simulates JSON serialization
vi.mock('next/server', () => {
  class MockNextResponse {
    _body: any;
    _status: number;
    _headers: Headers;

    constructor(body: any, init?: ResponseInit) {
      this._body = body;
      this._status = init?.status || 200;
      this._headers = new Headers(init?.headers);
    }

    get status() {
      return this._status;
    }

    static json(body: any, init?: ResponseInit) {
      // Properly simulate the JSON serialization process
      const jsonBody = JSON.stringify(body);
      const response = new Response(jsonBody, {
        ...init,
        headers: { ...init?.headers, 'Content-Type': 'application/json' },
      });

      // Attach a custom .json() method that parses the body back,
      // which mimics the behavior of `await response.json()` in tests.
      // This ensures that dates are serialized to strings, just like in a real API response.
      // @ts-expect-error - Adding custom property to mock
      response.json = () => Promise.resolve(JSON.parse(jsonBody));

      return response as NextResponse;
    }
  }

  class MockNextRequest {
    _url: URL;
    _headers: Headers;
    _body: any;

    constructor(input: string | URL, init?: RequestInit) {
      this._url = typeof input === 'string' ? new URL(input, 'http://localhost') : input;
      this._headers = new Headers(init?.headers);
      this._body = init?.body;
    }

    get url() {
        return this._url.toString();
    }

    get headers() {
        return this._headers;
    }

    json() {
      if (typeof this._body === 'string') {
        return Promise.resolve(JSON.parse(this._body));
      }
      return Promise.resolve(this._body);
    }
  }

  // Define the NextResponse type for the mock to be valid
  type NextResponse = InstanceType<typeof MockNextResponse>;

  return {
    NextResponse: MockNextResponse,
    NextRequest: MockNextRequest,
  };
});