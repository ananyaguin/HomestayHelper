import assert from 'node:assert';
import { test } from 'node:test';
import { apiFetch, setOwnerToken, setGuestToken, clearTokens, ApiError } from './api.js';

// Helper to mock global fetch
function mockFetch(handler) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    return handler(url, options);
  };
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test('1. No token attached by default', async () => {
  clearTokens();
  let capturedHeaders = null;
  const restore = mockFetch(async (url, options) => {
    capturedHeaders = options.headers;
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  try {
    const data = await apiFetch('/health');
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(capturedHeaders.has('Authorization'), false);
    assert.strictEqual(capturedHeaders.has('X-Guest-Token'), false);
  } finally {
    restore();
  }
});

test('2. Owner token is correctly attached', async () => {
  clearTokens();
  setOwnerToken('mock-jwt-token-123');
  let capturedHeaders = null;
  const restore = mockFetch(async (url, options) => {
    capturedHeaders = options.headers;
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  try {
    await apiFetch('/health');
    assert.strictEqual(capturedHeaders.get('Authorization'), 'Bearer mock-jwt-token-123');
    assert.strictEqual(capturedHeaders.has('X-Guest-Token'), false);
  } finally {
    clearTokens();
    restore();
  }
});

test('3. Guest token is correctly attached', async () => {
  clearTokens();
  setGuestToken('mock-guest-token-abc');
  let capturedHeaders = null;
  const restore = mockFetch(async (url, options) => {
    capturedHeaders = options.headers;
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  try {
    await apiFetch('/health');
    assert.strictEqual(capturedHeaders.get('X-Guest-Token'), 'mock-guest-token-abc');
    assert.strictEqual(capturedHeaders.has('Authorization'), false);
  } finally {
    clearTokens();
    restore();
  }
});

test('4. 401 response throws ApiError with status 401', async () => {
  clearTokens();
  const restore = mockFetch(async (url, options) => {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  try {
    await assert.rejects(
      async () => {
        await apiFetch('/health');
      },
      (err) => {
        assert(err instanceof ApiError);
        assert.strictEqual(err.status, 401);
        assert.strictEqual(err.message, 'Unauthorized');
        return true;
      }
    );
  } finally {
    restore();
  }
});

test('5. Successful JSON response is parsed correctly', async () => {
  clearTokens();
  const restore = mockFetch(async (url, options) => {
    return new Response(JSON.stringify({ success: true, db: 'connected' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  try {
    const data = await apiFetch('/health');
    assert.deepStrictEqual(data, { success: true, db: 'connected' });
  } finally {
    restore();
  }
});
