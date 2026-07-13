// api/squarespace-bridge.js
// Flowtel v0.10.21 — Trusted-doorway bridge hardening.
// Keeps Squarespace and Supabase service keys out of browser code.

const SQUARESPACE_API_BASE = "https://api.squarespace.com";
const DEFAULT_BRIDGE_PASSWORD = "FlowtelMemberBridge!2026";

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

async function ensureSupabaseAuthUser({ email, contact, membershipType, intent, trustedDoorway }) {
  // For returning members, we do not need an admin-level create-user call.
  // The browser will attempt to sign in with the bridge password, or fall back to the visible login form.
  // This avoids blocking beta users if the service role URL/key is not configured perfectly yet.
  if (intent === "returning") {
    return bridgeNotice("Returning member path skipped Supabase admin preparation.");
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.SUPABASE_URL);

  if (!serviceKey || !supabaseUrl) {
    return bridgeNotice(
      !serviceKey
        ? "SUPABASE_SERVICE_ROLE_KEY not configured; client signup fallback may be used."
        : "SUPABASE_URL not configured; client signup fallback may be used."
    );
  }

  const password = process.env.FLOWTEL_BRIDGE_PASSWORD || DEFAULT_BRIDGE_PASSWORD;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: contact?.firstName || null,
          last_name: contact?.lastName || null,
          squarespace_contact_id: contact?.id || null,
          membership_type: membershipType,
        },
      }),
    });

    const text = await response.text();
    const data = safeJsonParse(text) || {};

    if (response.ok) {
      return { prepared: true, userId: data.id || data.user?.id || null };
    }

    const alreadyExists = /already|registered|exists|duplicate/i.test(text);
    if (alreadyExists) {
      return bridgeNotice("Supabase user already exists.");
    }

    const message = data.message || data.error || text || "Supabase auth user preparation failed.";

    if (trustedDoorway) {
      console.warn("Flowtel bridge: Supabase admin preparation failed, but trusted doorway is enabled.", {
        status: response.status,
        message,
      });
      return bridgeNotice("Supabase admin preparation failed; trusted doorway continued for beta.", {
        supabaseAdminStatus: response.status,
        supabaseAdminMessage: message,
      });
    }

    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  } catch (error) {
    if (trustedDoorway) {
      console.warn("Flowtel bridge: Supabase admin preparation threw, but trusted doorway is enabled.", error);
      return bridgeNotice("Supabase admin preparation threw; trusted doorway continued for beta.", {
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
