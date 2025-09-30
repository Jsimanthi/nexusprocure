import '@testing-library/jest-dom';
import { vi } from 'vitest';

// A more robust mock for next/server
vi.mock('next/server', () => {
  // Define a mock class for NextResponse
  class MockNextResponse {
    _body;
    _status;
    _headers;

    constructor(body, init) {
      this._body = body;
      this._status = init?.status || 200;
      this._headers = new Headers(init?.headers);
    }

    get status() {
      return this._status;
    }

    static json(body, init) {
      const response = new MockNextResponse(body, init);
      // Simulate the body being stringified for a JSON response
      try {
        response._body = JSON.parse(JSON.stringify(body));
      } catch (e) {
        response._body = body;
      }
      response._headers.set('Content-Type', 'application/json');
      return response;
    }

    json() {
      return Promise.resolve(this._body);
    }
  }

  // Define a mock class for NextRequest
  class MockNextRequest {
    _url;
    _headers;
    _body;

    constructor(input, init) {
      this._url = typeof input === 'string' ? new URL(input) : input.url;
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
      return Promise.resolve(JSON.parse(this._body));
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: MockNextRequest,
  };
});