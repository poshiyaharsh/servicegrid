import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApiClient, ApiClientError } from '../src/index';

describe('Phase 02G — @servicegrid/api-client', () => {
  it('attaches bearer token, retries once on 401 via refresh, and handles structured errors', async () => {
    let token: string | null = 'expired-token';
    let unauthorizedCalled = false;
    let callCount = 0;

    const mockFetch: typeof fetch = async (input, init) => {
      callCount++;
      const url = typeof input === 'string' ? input : input.toString();

      if (url.endsWith('/api/v1/auth/refresh')) {
        return new Response(
          JSON.stringify({ success: true, data: { accessToken: 'fresh-token' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.includes('/api/v1/customers?')) {
        const auth = new Headers(init?.headers).get('Authorization');
        if (auth === 'Bearer expired-token') {
          return new Response(
            JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Expired' } }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          );
        }
        assert.equal(auth, 'Bearer fresh-token');
        assert.equal(init?.credentials, 'include');
        return new Response(
          JSON.stringify({ success: true, data: [{ id: 'c1', displayName: 'Acme' }], meta: { total: 1 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Missing' } }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const client = new ApiClient({
      baseUrl: 'http://localhost:4000',
      getAccessToken: () => token,
      onAccessTokenRefreshed: (newToken) => {
        token = newToken;
      },
      onUnauthorized: () => {
        unauthorizedCalled = true;
      },
      fetchImpl: mockFetch,
    });

    const customers = await client.listCustomers({ search: 'Acme' });
    assert.equal(customers.data.length, 1);
    assert.equal(token, 'fresh-token');
    assert.equal(unauthorizedCalled, false);
    assert.equal(callCount, 3);

    await assert.rejects(
      () => client.getCustomer('missing'),
      (err: unknown) => err instanceof ApiClientError && err.status === 404 && err.code === 'NOT_FOUND',
    );
  });
});
