// api/squarespace-bridge.js
// Flowtel v0.10.49 — Personal Room Keys + Secure Remembered Entry.
// Keeps Squarespace and Supabase service keys out of browser code and never resets an existing member password.

const SQUARESPACE_API_BASE = "https://api.squarespace.com";
const DEFAULT_BETA_PASSWORD = "FlowtelBeta!2026";

function betaTemporaryPassword() {
  // Phase 1 uses one browser-visible temporary credential. Both legacy bridge
  // and beta password environment overrides are intentionally ignored because a
  // different server value would recreate the browser/API mismatch.
  return DEFAULT_BETA_PASSWORD;
}

const MEMBERSHIP_LABEL = {
  queendom: "Queendom",
  flowfm: "Flow FM",
  council: "Council",
};

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.FLOWTEL_ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function normalizeMembership(value) {
  const cleaned = String(value || "").toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned === "queen" || cleaned === "queendom") return "queendom";
  if (cleaned === "flow" || cleaned === "flowfm" || cleaned === "flowfmmember") return "flowfm";
  if (cleaned === "council") return "council";
  return "queendom";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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

function contactEmail(contact) {
  return normalizeEmail(contact?.primaryEmail?.email || contact?.email || "");
}

function publicContact(contact, requestedEmail) {
  if (!contact) return null;

  return {
    id: contact.id || null,
    firstName: contact.firstName || contact.defaultShippingAddress?.address?.firstName || null,
    lastName: contact.lastName || contact.defaultShippingAddress?.address?.lastName || null,
    email: contactEmail(contact) || requestedEmail || null,
    locale: contact.locale || null,
    unverified: Boolean(contact.unverified),
  };
}

function trustedDoorwayContact(email, reason = "trusted doorway beta fallback") {
  return {
    id: null,
    firstName: null,
    lastName: null,
    email,
    locale: null,
    unverified: true,
    trustedDoorway: true,
    reason,
  };
}

function canUseTrustedDoorway(body = {}) {
  if (process.env.FLOWTEL_TRUSTED_DOORWAY === "0") return false;
  if (process.env.FLOWTEL_BRIDGE_ALLOW_UNVERIFIED === "1") return true;
  return body.trustedDoorway !== false;
}

async function querySquarespaceContact(email, { trustedDoorway = true } = {}) {
  const apiKey = process.env.SQUARESPACE_API_KEY;

  if (!apiKey) {
    if (trustedDoorway) {
      return trustedDoorwayContact(email, "Squarespace API key unavailable; trusted doorway accepted for beta.");
    }

    const error = new Error("Squarespace API key is not configured on Vercel.");
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${SQUARESPACE_API_BASE}/v1/contacts/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "Flowtel Squarespace Bridge/0.10.21",
    },
    body: JSON.stringify({
      searchString: email,
      pageSize: 10,
      sortField: "EMAIL",
      sortDirection: "ASCENDING",
    }),
  });

  const text = await response.text();
  const data = safeJsonParse(text) || {};

  if (!response.ok) {
    if (trustedDoorway) {
      return trustedDoorwayContact(email, `Squarespace Contacts returned ${response.status}; trusted doorway accepted for beta.`);
    }

    const error = new Error(data.message || data.error || text || "Squarespace contact lookup failed.");
    error.statusCode = response.status;
    throw error;
  }

  const contacts = Array.isArray(data.contacts) ? data.contacts : [];
  const exact = contacts.find((contact) => contactEmail(contact) === email);

  if (!exact) {
    if (trustedDoorway) {
      return trustedDoorwayContact(email, "No exact Squarespace contact match; trusted doorway accepted for beta.");
    }

    const error = new Error("No Squarespace contact was found for this email address.");
    error.statusCode = 404;
    throw error;
  }

  return publicContact(exact, email);
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

function bridgeNotice(message, extra = {}) {
  return {
    prepared: false,
    reason: message,
    ...extra,
  };
}

function supabaseAdminHeaders(serviceKey) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

async function readSupabaseJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = safeJsonParse(text) || {};

  if (!response.ok) {
    const error = new Error(data.message || data.error || text || `Supabase request failed with ${response.status}.`);
    error.statusCode = response.status;
    error.responseText = text;
    throw error;
  }

  return data;
}

async function findSupabaseAuthUserByEmail({ supabaseUrl, serviceKey, email }) {
  const data = await readSupabaseJson(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    method: "GET",
    headers: supabaseAdminHeaders(serviceKey),
  });
  const users = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
  return users.find((user) => normalizeEmail(user?.email) === email) || null;
}

async function refreshSupabaseBetaUserMetadata({ supabaseUrl, serviceKey, userId, contact, membershipType }) {
  if (!userId) return null;
  const payload = {
    email_confirm: true,
    user_metadata: {
      first_name: contact?.firstName || null,
      last_name: contact?.lastName || null,
      squarespace_contact_id: contact?.id || null,
      membership_type: membershipType,
      flowtel_beta_access: true,
    },
  };

  try {
    return await readSupabaseJson(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: supabaseAdminHeaders(serviceKey),
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return await readSupabaseJson(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: supabaseAdminHeaders(serviceKey),
      body: JSON.stringify(payload),
    });
  }
}

async function createSupabaseBetaUser({ supabaseUrl, serviceKey, email, password, contact, membershipType }) {
  return await readSupabaseJson(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: supabaseAdminHeaders(serviceKey),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: contact?.firstName || null,
        last_name: contact?.lastName || null,
        squarespace_contact_id: contact?.id || null,
        membership_type: membershipType,
        flowtel_beta_access: true,
      },
    }),
  });
}

async function ensureSupabaseAuthUser({ email, contact, membershipType, intent, trustedDoorway }) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.SUPABASE_URL);

  if (!serviceKey || !supabaseUrl) {
    return bridgeNotice(
      !serviceKey
        ? "SUPABASE_SERVICE_ROLE_KEY not configured; the beta Auth user could not be prepared."
        : "SUPABASE_URL not configured; the beta Auth user could not be prepared."
    );
  }

  const password = betaTemporaryPassword();

  try {
    const existingUser = await findSupabaseAuthUserByEmail({ supabaseUrl, serviceKey, email });
    if (existingUser?.id) {
      await refreshSupabaseBetaUserMetadata({
        supabaseUrl,
        serviceKey,
        userId: existingUser.id,
        contact,
        membershipType,
      });
      return {
        prepared: true,
        userId: existingUser.id,
        accountStatus: "existing",
        temporaryPasswordCreated: false,
        reason: intent === "returning"
          ? "Existing member account found. Personal password preserved."
          : "Existing beta account found. Personal password preserved.",
      };
    }

    const data = await createSupabaseBetaUser({
      supabaseUrl,
      serviceKey,
      email,
      password,
      contact,
      membershipType,
    });
    return {
      prepared: true,
      userId: data.id || data.user?.id || null,
      accountStatus: "created",
      temporaryPasswordCreated: true,
      reason: "Beta Auth user created with the temporary Flowtel password.",
    };
  } catch (error) {
    const alreadyExists = /already|registered|exists|duplicate/i.test(error.message || error.responseText || "");
    if (alreadyExists) {
      try {
        const existingUser = await findSupabaseAuthUserByEmail({ supabaseUrl, serviceKey, email });
        if (existingUser?.id) {
          await refreshSupabaseBetaUserMetadata({
            supabaseUrl,
            serviceKey,
            userId: existingUser.id,
            contact,
            membershipType,
          });
          return {
            prepared: true,
            userId: existingUser.id,
            accountStatus: "existing",
            temporaryPasswordCreated: false,
            reason: "Existing beta account found after duplicate-user response. Personal password preserved.",
          };
        }
      } catch (refreshError) {
        error = refreshError;
      }
    }

    if (trustedDoorway) {
      console.warn("Flowtel bridge: beta Auth preparation failed, but trusted doorway remains available.", error);
      return bridgeNotice("Beta Auth preparation failed; trusted doorway continued for beta.", {
        supabaseAdminStatus: error.statusCode || null,
        supabaseAdminMessage: error.message || "Unknown Supabase admin error.",
      });
    }

    throw error;
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
    const intent = String(body.intent || "enter").toLowerCase();
    const membershipType = normalizeMembership(body.membershipType || body.membership || body.doorway);

    if (!email || !email.includes("@")) {
      res.status(400).json({ ok: false, error: "A valid member email is required." });
      return;
    }

    const trustedDoorway = canUseTrustedDoorway(body);
    const contact = await querySquarespaceContact(email, { trustedDoorway });
    const authResult = await ensureSupabaseAuthUser({
      email,
      contact,
      membershipType,
      intent,
      trustedDoorway,
    });

    res.status(200).json({
      ok: true,
      membershipType,
      membershipLabel: MEMBERSHIP_LABEL[membershipType] || "Flowtel",
      contact,
      verified: !contact?.unverified,
      bridgeMode: contact?.unverified ? "trusted-doorway" : "squarespace-contacts",
      bridgeNote: contact?.reason || null,
      supabaseUserPrepared: authResult.prepared,
      supabaseUserId: authResult.userId || null,
      accountStatus: authResult.accountStatus || "unknown",
      temporaryPasswordCreated: Boolean(authResult.temporaryPasswordCreated),
      personalPasswordPreserved: authResult.accountStatus === "existing",
      note: authResult.reason || null,
    });
  } catch (error) {
    const status = Number(error.statusCode || error.status || 500);
    const safeStatus = status >= 400 && status < 600 ? status : 500;

    res.status(safeStatus).json({
      ok: false,
      error: error.message || "Squarespace bridge failed.",
    });
  }
};
