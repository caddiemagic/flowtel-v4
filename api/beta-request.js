// api/beta-request.js
// Flowtel v0.10.50 — Team Map Membership + Owner Turndown Routing Repair.
// Creates missing beta Auth users with the temporary password, but never resets
// an existing member's personal password.

const DEFAULT_TEMP_PASSWORD = "FlowtelBeta!2026";

function betaTemporaryPassword() {
  return DEFAULT_TEMP_PASSWORD;
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.FLOWTEL_ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return safeJsonParse(req.body) || {};

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return safeJsonParse(raw) || {};
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeSupabaseProjectUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`.replace(/\/$/, "");
  } catch (error) {
    return raw.replace(/\/$/, "");
  }
}

function normalizeMembership(value) {
  const cleaned = String(value || "queendom").toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned === "flow" || cleaned === "flowfm" || cleaned === "flowfmmember") return "flowfm";
  if (cleaned === "council") return "council";
  return "queendom";
}

function membershipRank(value) {
  return { queendom: 1, flowfm: 2, council: 3 }[normalizeMembership(value)] || 0;
}

function membershipFromRank(rank, fallback = "queendom") {
  const value = Number(rank || 0);
  if (value >= 3) return "council";
  if (value >= 2) return "flowfm";
  if (value >= 1) return "queendom";
  return normalizeMembership(fallback);
}

function resolveMembership(requestedMembership, existingProfile = null, authUser = null) {
  const requested = normalizeMembership(requestedMembership);
  const authMembership = normalizeMembership(
    authUser?.user_metadata?.membership_type || authUser?.raw_user_meta_data?.membership_type || ""
  );
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

function requireServerConfig() {
  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    const error = new Error("SUPABASE_URL is not configured in Vercel.");
    error.statusCode = 500;
    throw error;
  }

  if (!serviceKey) {
    const error = new Error("SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel.");
    error.statusCode = 500;
    throw error;
  }

  return { supabaseUrl, serviceKey };
}

function supabaseHeaders(serviceKey, prefer = null) {
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

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
  const url = `${supabaseUrl}/rest/v1/profiles?select=id,email,role,mentor_accepting_clients,membership_type,membership_rank,flowfm_started_at,is_initiated&email=eq.${encodeURIComponent(email)}&limit=1`;
  const data = await fetchJson(url, {
    method: "GET",
    headers: supabaseHeaders(serviceKey),
  });

  return Array.isArray(data) ? data[0] || null : null;
}

async function listAuthUserByEmail({ supabaseUrl, serviceKey, email }) {
  const data = await fetchJson(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    method: "GET",
    headers: supabaseHeaders(serviceKey),
  });

  const users = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
  return users.find((user) => normalizeEmail(user.email) === email) || null;
}

function authMetadata(fullName, membershipType, existingMetadata = {}) {
  const { firstName, lastName } = splitName(fullName);
  return {
    ...(existingMetadata || {}),
    full_name: fullName || existingMetadata?.full_name || null,
    first_name: firstName || existingMetadata?.first_name || null,
    last_name: lastName || existingMetadata?.last_name || null,
    membership_type: membershipType,
    membership_rank: membershipRank(membershipType),
    flowtel_beta_access: true,
  };
}

async function createAuthUser({ supabaseUrl, serviceKey, email, fullName, membershipType }) {
  const password = betaTemporaryPassword();
  const data = await fetchJson(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: supabaseHeaders(serviceKey),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: authMetadata(fullName, membershipType),
    }),
  });

  return { user: data.user || data, password };
}

async function updateAuthUserMetadata({ supabaseUrl, serviceKey, userId, fullName, membershipType, existingMetadata = {} }) {
  if (!userId) return null;
  const payload = {
    email_confirm: true,
    user_metadata: authMetadata(fullName, membershipType, existingMetadata),
  };

  try {
    return await fetchJson(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: supabaseHeaders(serviceKey),
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return await fetchJson(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: supabaseHeaders(serviceKey),
      body: JSON.stringify(payload),
    });
  }
}

async function upsertProfile({ supabaseUrl, serviceKey, user, email, fullName, membershipType, existingProfile = null }) {
  const { firstName, lastName } = splitName(fullName);
  const basePayload = {
    id: user.id,
    email,
    role: existingProfile?.role || "client",
    mentor_accepting_clients: existingProfile?.mentor_accepting_clients ?? false,
    first_name: firstName,
    last_name: lastName,
    membership_type: membershipType,
    membership_rank: membershipRank(membershipType),
    squarespace_source: "flowtel_beta_request",
    source_updated_at: new Date().toISOString(),
  };

  try {
    const data = await fetchJson(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
      method: "POST",
      headers: supabaseHeaders(serviceKey, "resolution=merge-duplicates,return=representation"),
      body: JSON.stringify(basePayload),
    });

    return Array.isArray(data) ? data[0] || basePayload : data;
  } catch (error) {
    const minimalPayload = {
      id: user.id,
      email,
      role: existingProfile?.role || "client",
      first_name: firstName,
      last_name: lastName,
    };

    const data = await fetchJson(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
      method: "POST",
      headers: supabaseHeaders(serviceKey, "resolution=merge-duplicates,return=representation"),
      body: JSON.stringify(minimalPayload),
    });

    return Array.isArray(data) ? data[0] || minimalPayload : data;
  }
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  try {
    const body = await readRequestBody(req);
    const email = normalizeEmail(body.email);
    const fullName = String(body.name || body.fullName || "").trim();
    const requestedMembership = normalizeMembership(body.membershipType || body.membership || "queendom");
    const betaCode = String(body.betaCode || body.accessCode || "").trim();
    const requiredCode = String(process.env.FLOWTEL_BETA_REQUEST_CODE || "").trim();

    if (requiredCode && betaCode !== requiredCode) {
      res.status(403).json({ ok: false, error: "This beta doorway needs the current access code." });
      return;
    }

    if (!email || !email.includes("@")) {
      res.status(400).json({ ok: false, error: "A valid email is required." });
      return;
    }

    if (!fullName) {
      res.status(400).json({ ok: false, error: "A name is required." });
      return;
    }

    const { supabaseUrl, serviceKey } = requireServerConfig();
    const existingProfile = await findProfileByEmail({ supabaseUrl, serviceKey, email });
    let user = await listAuthUserByEmail({ supabaseUrl, serviceKey, email });
    const membershipType = resolveMembership(requestedMembership, existingProfile, user);
    let accountStatus = "existing";
    let temporaryPassword = null;

    if (user?.id) {
      await updateAuthUserMetadata({ supabaseUrl, serviceKey, userId: user.id, fullName, membershipType, existingMetadata: user.user_metadata || user.raw_user_meta_data || {} });
    } else {
      try {
        const created = await createAuthUser({ supabaseUrl, serviceKey, email, fullName, membershipType });
        user = created.user;
        temporaryPassword = created.password;
        accountStatus = "created";
      } catch (error) {
        const alreadyExists = /already|registered|exists|duplicate/i.test(error.message || "");
        if (!alreadyExists) throw error;

        user = await listAuthUserByEmail({ supabaseUrl, serviceKey, email });
        if (!user?.id) throw error;
        await updateAuthUserMetadata({ supabaseUrl, serviceKey, userId: user.id, fullName, membershipType, existingMetadata: user.user_metadata || user.raw_user_meta_data || {} });
      }
    }

    await upsertProfile({ supabaseUrl, serviceKey, user, email, fullName, membershipType, existingProfile });

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
    const safeStatus = status >= 400 && status < 600 ? status : 500;

    res.status(safeStatus).json({
      ok: false,
      error: error.message || "Could not prepare this Flowtel access.",
    });
  }
};
