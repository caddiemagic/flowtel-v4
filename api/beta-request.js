// api/beta-request.js
// Flowtel v0.10.26 — Beta Access Request endpoint with auto-login support.
// Creates a Flowtel Auth user + client profile from a controlled beta request form.

const DEFAULT_TEMP_PASSWORD = "FlowtelBeta!2026";

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
  const url = `${supabaseUrl}/rest/v1/profiles?select=id,email,role&email=eq.${encodeURIComponent(email)}&limit=1`;
  const data = await fetchJson(url, {
    method: "GET",
    headers: supabaseHeaders(serviceKey),
  });

  return Array.isArray(data) ? data[0] || null : null;
}

async function listAuthUserByEmail({ supabaseUrl, serviceKey, email }) {
  // Supabase Auth Admin does not consistently expose a simple email filter across versions.
  // For beta-scale rosters, list a reasonable page and match locally.
  const data = await fetchJson(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    method: "GET",
    headers: supabaseHeaders(serviceKey),
  });

  const users = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
  return users.find((user) => normalizeEmail(user.email) === email) || null;
}

async function createAuthUser({ supabaseUrl, serviceKey, email, fullName, membershipType }) {
  const password = process.env.FLOWTEL_BETA_TEMP_PASSWORD || process.env.FLOWTEL_BRIDGE_PASSWORD || DEFAULT_TEMP_PASSWORD;
  const { firstName, lastName } = splitName(fullName);

  try {
    const data = await fetchJson(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: supabaseHeaders(serviceKey),
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || null,
          first_name: firstName,
          last_name: lastName,
          membership_type: membershipType,
          flowtel_beta_access: true,
        },
      }),
    });

    const user = data.user || data;
    return { user, created: true, password };
  } catch (error) {
    const alreadyExists = /already|registered|exists|duplicate/i.test(error.message || "");
    if (!alreadyExists) throw error;

    const user = await listAuthUserByEmail({ supabaseUrl, serviceKey, email });
    if (!user) throw error;

    await updateAuthUserForBeta({ supabaseUrl, serviceKey, userId: user.id, password, fullName, membershipType });
    return { user, created: false, password };
  }
}

async function updateAuthUserForBeta({ supabaseUrl, serviceKey, userId, password, fullName, membershipType }) {
  if (!userId) return null;
  const { firstName, lastName } = splitName(fullName);

  try {
    return await fetchJson(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: supabaseHeaders(serviceKey),
      body: JSON.stringify({
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || null,
          first_name: firstName,
          last_name: lastName,
          membership_type: membershipType,
          flowtel_beta_access: true,
        },
      }),
    });
  } catch (error) {
    // Some Supabase versions expect PATCH for user updates. Try that before failing.
    return await fetchJson(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: supabaseHeaders(serviceKey),
      body: JSON.stringify({
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || null,
          first_name: firstName,
          last_name: lastName,
          membership_type: membershipType,
          flowtel_beta_access: true,
        },
      }),
    });
  }
}

async function upsertProfile({ supabaseUrl, serviceKey, user, email, fullName, membershipType }) {
  const { firstName, lastName } = splitName(fullName);
  const basePayload = {
    id: user.id,
    email,
    role: "client",
    mentor_accepting_clients: false,
    first_name: firstName,
    last_name: lastName,
    membership_type: membershipType,
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
    // If an older profile table is missing optional bridge/membership columns, fall back to only the stable fields.
    const minimalPayload = {
      id: user.id,
      email,
      role: "client",
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
    const membershipType = normalizeMembership(body.membershipType || body.membership || "queendom");
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

    let user;
    let accountStatus = "existing";
    let password = process.env.FLOWTEL_BETA_TEMP_PASSWORD || process.env.FLOWTEL_BRIDGE_PASSWORD || DEFAULT_TEMP_PASSWORD;

    if (existingProfile?.id) {
      user = await listAuthUserByEmail({ supabaseUrl, serviceKey, email });

      if (user?.id) {
        await updateAuthUserForBeta({ supabaseUrl, serviceKey, userId: user.id, password, fullName, membershipType });
      } else {
        const result = await createAuthUser({ supabaseUrl, serviceKey, email, fullName, membershipType });
        user = result.user;
        accountStatus = result.created ? "created" : "existing";
        password = result.password;
      }

      await upsertProfile({ supabaseUrl, serviceKey, user, email, fullName, membershipType });
    } else {
      const result = await createAuthUser({ supabaseUrl, serviceKey, email, fullName, membershipType });
      user = result.user;
      accountStatus = result.created ? "created" : "existing";
      password = result.password;
      await upsertProfile({ supabaseUrl, serviceKey, user, email, fullName, membershipType });
    }

    res.status(200).json({
      ok: true,
      accountStatus,
      email,
      role: "client",
      membershipType,
      userId: user.id,
      autoLoginAvailable: true,
      temporaryPasswordShared: true,
      temporaryPassword: password,
      temporaryPasswordHint: process.env.FLOWTEL_BETA_TEMP_PASSWORD ? "Using the current beta password for automatic login." : "Using the current Flowtel beta password for automatic login.",
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
