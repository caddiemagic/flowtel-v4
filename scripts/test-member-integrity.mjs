import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handler = require('../api/beta-request.js');

function responseHarness() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
}

const originalFetch = globalThis.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  FLOWTEL_BETA_REQUEST_CODE: process.env.FLOWTEL_BETA_REQUEST_CODE,
};

try {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  process.env.FLOWTEL_BETA_REQUEST_CODE = 'RoseTest';

  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/rest/v1/profiles?select=')) {
      return new Response(JSON.stringify([{
        id: '11111111-1111-1111-1111-111111111111',
        email: 'member@example.com',
        role: 'client',
        mentor_accepting_clients: false,
        display_name: 'Old Display',
        first_name: 'Old',
        last_name: 'Name',
        location: null,
        timezone: 'America/Los_Angeles',
        membership_type: 'flowfm',
        membership_rank: 2,
        flowfm_started_at: '2026-01-01',
        is_initiated: true,
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(url).includes('/auth/v1/admin/users?page=')) {
      return new Response(JSON.stringify({ users: [{
        id: '11111111-1111-1111-1111-111111111111',
        email: 'member@example.com',
        user_metadata: { membership_type: 'flowfm', display_name: 'Old Display' },
      }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(url).includes('/auth/v1/admin/users/11111111-1111-1111-1111-111111111111')) {
      return new Response(JSON.stringify({ user: { id: '11111111-1111-1111-1111-111111111111' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(url).includes('/rest/v1/profiles?on_conflict=id')) {
      return new Response(options.body || '{}', { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  const req = {
    method: 'POST',
    body: {
      firstName: 'New',
      lastName: 'Member',
      displayName: 'Moon Name',
      location: 'Monterey, California',
      timezone: 'America/Los_Angeles',
      email: 'member@example.com',
      membershipType: 'queendom',
      betaCode: 'RoseTest',
    },
  };
  const res = responseHarness();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.accountStatus, 'existing');
  assert.equal(res.body.membershipType, 'flowfm', 'Existing Flow FM membership must not be downgraded.');
  assert.equal(res.body.temporaryPassword, undefined, 'Existing personal passwords must remain untouched.');

  const authUpdate = calls.find(call => call.url.includes('/auth/v1/admin/users/11111111'));
  assert(authUpdate, 'Existing Auth metadata was not updated.');
  const authBody = JSON.parse(authUpdate.options.body);
  assert.equal(authBody.user_metadata.display_name, 'Moon Name');
  assert.equal(authBody.user_metadata.first_name, 'New');
  assert.equal(authBody.user_metadata.last_name, 'Member');
  assert(!Object.hasOwn(authBody, 'password'), 'Existing Auth updates must never reset a password.');

  const profileUpsert = calls.find(call => call.url.includes('/rest/v1/profiles?on_conflict=id'));
  assert(profileUpsert, 'Profile foundation was not saved.');
  const profileBody = JSON.parse(profileUpsert.options.body);
  assert.equal(profileBody.first_name, 'New');
  assert.equal(profileBody.last_name, 'Member');
  assert.equal(profileBody.display_name, 'Moon Name');
  assert.equal(profileBody.location, 'Monterey, California');
  assert.equal(profileBody.profile_confirmation_required, false);
  assert.equal(profileBody.membership_rank, 2);

  let invalidFetchCount = 0;
  globalThis.fetch = async () => { invalidFetchCount += 1; throw new Error('Fetch should not run.'); };
  const badRes = responseHarness();
  await handler({
    method: 'POST',
    body: {
      firstName: 'New', lastName: 'Member', displayName: 'Moon Name',
      location: 'Monterey', timezone: 'Not/A_Timezone', email: 'member@example.com', betaCode: 'RoseTest',
    },
  }, badRes);
  assert.equal(badRes.statusCode, 400);
  assert.match(badRes.body.error, /valid timezone/i);
  assert.equal(invalidFetchCount, 0, 'Invalid profile input must be rejected before server calls.');

  console.log('Flowtel v0.10.69 beta profile, password preservation, membership preservation, and validation tests passed.');
} finally {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
