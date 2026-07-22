// Flowtel v0.10.69 — Member Integrity + Guest Profile Foundation.
// Creates missing beta Auth users with the temporary password, never resets an
// existing personal password, and stores the required profile foundation up front.

const DEFAULT_TEMP_PASSWORD = "FlowtelBeta!2026";

function betaTemporaryPassword() { return DEFAULT_TEMP_PASSWORD; }
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.FLOWTEL_ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
function safeJsonParse(value) { try { return JSON.parse(value); } catch (error) { return null; } }
async function readRequestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return safeJsonParse(req.body) || {};
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return safeJsonParse(Buffer.concat(chunks).toString("utf8")) || {};
}
function normalizeEmail(value) { return String(value || "").trim().toLowerCase(); }
function isValidTimeZone(value) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return true; }
  catch (error) { return false; }
}
function normalizeSupabaseProjectUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try { const url = new URL(raw); return `${url.protocol}//${url.host}`.replace(/\/$/, ""); }
  catch (error) { return raw.replace(/\/$/, ""); }
}
function normalizeMembership(value) {
  const cleaned = String(value || "queendom").toLowerCase().replace(/[^a-z]/g, "");
  if (["flow", "flowfm", "flowfmmember"].includes(cleaned)) return "flowfm";
  if (cleaned === "council") return "council";
  return "queendom";
}
function membershipRank(value) { return { queendom: 1, flowfm: 2, council: 3 }[normalizeMembership(value)] || 0; }
function membershipFromRank(rank, fallback = "queendom") {
  const value = Number(rank || 0);
  if (value >= 3) return "council";
  if (value >= 2) return "flowfm";
  if (value >= 1) return "queendom";
  return normalizeMembership(fallback);
}
function resolveMembership(requestedMembership, existingProfile = null, authUser = null) {
  const requested = normalizeMembership(requestedMembership);
  const authMembership = normalizeMembership(authUser?.user_metadata?.membership_type || authUser?.raw_user_meta_data?.membership_type || "");
  const existingRank = Math.max(
    Number(existingProfile?.membership_rank || 0),
    membershipRank(existingProfile?.membership_type),
    membershipRank(authMembership),
    ["practitioner", "admin", "owner"].includes(String(existingProfile?.role || "").toLowerCase()) ? 2 : 0,
    existingProfile?.flowfm_started_at || existingProfile?.is_initiated ? 2 : 0,
  );
  return membershipFromRank(Math.max(existingRank, membershipRank(requested)), requested);
}
function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
function normalizedProfileInput(body = {}) {
  const legacy = splitName(body.name || body.fullName || "");
  const firstName = String(body.firstName || legacy.firstName || "").trim();
  const lastName = String(body.lastName || legacy.lastName || "").trim();
  const displayName = String(body.displayName || body.profileName || [firstName, lastName].filter(Boolean).join(" ")).trim();
  return {
    firstName,
    lastName,
    displayName,
    location: String(body.location || "").trim(),
    timezone: String(body.timezone || "America/Los_Angeles").trim(),
    fullName: [firstName, lastName].filter(Boolean).join(" "),
  };
}
function requireServerConfig() {
  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) { const error = new Error("SUPABASE_URL is not configured in Vercel."); error.statusCode = 500; throw error; }
  if (!serviceKey) { const error = new Error("SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel."); error.statusCode = 500; throw error; }
  return { supabaseUrl, serviceKey };
}
function supabaseHeaders(serviceKey, prefer = null) {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  if (prefer) headers.Prefer = prefer;
  return headers;
}
async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = safeJsonParse(text) || {};
  if (!response.ok) {
    const error = new Error(data.message || data.error || text || `Request failed with ${response.status}.`);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }
  return data;
}
async function findProfileByEmail({ supabaseUrl, serviceKey, email }) {
  const select = "id,email,role,mentor_accepting_clients,display_name,first_name,last_name,location,timezone,membership_type,membership_rank,flowfm_started_at,is_initiated,profile_confirmation_required,profile_confirmed_at";
  const data = await fetchJson(`${supabaseUrl}/rest/v1/profiles?select=${select}&email=eq.${encodeURIComponent(email)}&limit=1`, {
    method: "GET", headers: supabaseHeaders(serviceKey),
  });
  return Array.isArray(data) ? data[0] || null : null;
}
async function listAuthUserByEmail({ supabaseUrl, serviceKey, email }) {
  const data = await fetchJson(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, { method: "GET", headers: supabaseHeaders(serviceKey) });
  const users = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
  return users.find((user) => normalizeEmail(user.email) === email) || null;
}
function authMetadata(profileInput, membershipType, existingMetadata = {}) {
  const confirmedDisplayName = profileInput.displayName || existingMetadata?.display_name || existingMetadata?.full_name || existingMetadata?.name || profileInput.fullName || null;
  return {
    ...(existingMetadata || {}),
    display_name: confirmedDisplayName,
    full_name: confirmedDisplayName,
    name: confirmedDisplayName,
    first_name: profileInput.firstName || existingMetadata?.first_name || null,
    last_name: profileInput.lastName || existingMetadata?.last_name || null,
    location: profileInput.location || existingMetadata?.location || null,
    timezone: profileInput.timezone || existingMetadata?.timezone || "America/Los_Angeles",
    membership_type: membershipType,
    membership_rank: membershipRank(membershipType),
    flowtel_beta_access: true,
  };
}
async function createAuthUser({ supabaseUrl, serviceKey, email, profileInput, membershipType }) {
  const password = betaTemporaryPassword();
  const data = await fetchJson(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: supabaseHeaders(serviceKey),
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: authMetadata(profileInput, membershipType) }),
  });
  return { user: data.user || data, password };
}
async function updateAuthUserMetadata({ supabaseUrl, serviceKey, userId, profileInput, membershipType, existingMetadata = {} }) {
  if (!userId) return null;
  const payload = { email_confirm: true, user_metadata: authMetadata(profileInput, membershipType, existingMetadata) };
  try {
    return await fetchJson(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: "PUT", headers: supabaseHeaders(serviceKey), body: JSON.stringify(payload) });
  } catch (error) {
    return await fetchJson(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: "PATCH", headers: supabaseHeaders(serviceKey), body: JSON.stringify(payload) });
  }
}
async function upsertProfile({ supabaseUrl, serviceKey, user, email, profileInput, membershipType, existingProfile = null }) {
  const basePayload = {
    id: user.id,
    email,
    role: existingProfile?.role || "client",
    mentor_accepting_clients: existingProfile?.mentor_accepting_clients ?? false,
    first_name: profileInput.firstName,
    last_name: profileInput.lastName,
    display_name: profileInput.displayName,
    location: profileInput.location,
    timezone: profileInput.timezone || "America/Los_Angeles",
    membership_type: membershipType,
    membership_rank: membershipRank(membershipType),
    squarespace_source: "flowtel_beta_request",
    source_updated_at: new Date().toISOString(),
    profile_confirmation_required: false,
    profile_confirmation_version: 1,
    profile_confirmed_at: new Date().toISOString(),
  };
  const data = await fetchJson(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
    method: "POST", headers: supabaseHeaders(serviceKey, "resolution=merge-duplicates,return=representation"), body: JSON.stringify(basePayload),
  });
  return Array.isArray(data) ? data[0] || basePayload : data;
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Method not allowed." }); return; }

  try {
    const body = await readRequestBody(req);
    const email = normalizeEmail(body.email);
    const profileInput = normalizedProfileInput(body);
    const requestedMembership = normalizeMembership(body.membershipType || body.membership || "queendom");
    const betaCode = String(body.betaCode || body.accessCode || "").trim();
    const requiredCode = String(process.env.FLOWTEL_BETA_REQUEST_CODE || "").trim();

    if (requiredCode && betaCode !== requiredCode) { res.status(403).json({ ok: false, error: "This beta doorway needs the current access code." }); return; }
    if (!email || !email.includes("@")) { res.status(400).json({ ok: false, error: "A valid email is required." }); return; }
    if (!profileInput.firstName || !profileInput.lastName || !profileInput.displayName || !profileInput.location || !profileInput.timezone) {
      res.status(400).json({ ok: false, error: "First name, last name, Queendom name, location, and timezone are required." }); return;
    }
    if (profileInput.firstName.length > 100 || profileInput.lastName.length > 100 || profileInput.displayName.length > 140 || profileInput.location.length > 180) {
      res.status(400).json({ ok: false, error: "One or more profile fields are longer than the supported limit." }); return;
    }
    if (!isValidTimeZone(profileInput.timezone)) {
      res.status(400).json({ ok: false, error: "Choose a valid timezone." }); return;
    }

    const { supabaseUrl, serviceKey } = requireServerConfig();
    const existingProfile = await findProfileByEmail({ supabaseUrl, serviceKey, email });
    let user = await listAuthUserByEmail({ supabaseUrl, serviceKey, email });
    const membershipType = resolveMembership(requestedMembership, existingProfile, user);
    let accountStatus = "existing";
    let temporaryPassword = null;

    if (user?.id) {
      await updateAuthUserMetadata({ supabaseUrl, serviceKey, userId: user.id, profileInput, membershipType, existingMetadata: user.user_metadata || user.raw_user_meta_data || {} });
    } else {
      try {
        const created = await createAuthUser({ supabaseUrl, serviceKey, email, profileInput, membershipType });
        user = created.user;
        temporaryPassword = created.password;
        accountStatus = "created";
      } catch (error) {
        if (!/already|registered|exists|duplicate/i.test(error.message || "")) throw error;
        user = await listAuthUserByEmail({ supabaseUrl, serviceKey, email });
        if (!user?.id) throw error;
        await updateAuthUserMetadata({ supabaseUrl, serviceKey, userId: user.id, profileInput, membershipType, existingMetadata: user.user_metadata || user.raw_user_meta_data || {} });
      }
    }

    await upsertProfile({ supabaseUrl, serviceKey, user, email, profileInput, membershipType, existingProfile });

    res.status(200).json({
      ok: true,
      accountStatus,
      email,
      role: existingProfile?.role || "client",
      membershipType,
      userId: user.id,
      autoLoginAvailable: accountStatus === "created",
      temporaryPasswordShared: accountStatus === "created",
      ...(accountStatus === "created" ? { temporaryPassword } : {}),
      nextStep: accountStatus === "created"
        ? "Sign in with the temporary beta password, then create a private room key."
        : "Sign in with the personal Flowtel password already connected to this account.",
    });
  } catch (error) {
    const status = Number(error.statusCode || error.status || 500);
    res.status(status >= 400 && status < 600 ? status : 500).json({ ok: false, error: error.message || "Could not prepare this Flowtel access." });
  }
};
