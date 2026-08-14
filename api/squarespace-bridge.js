// api/squarespace-bridge.js
// Flowtel v0.10.85 — Beta Exit member verification + legacy compatibility.
// Keeps Squarespace and Supabase service keys out of browser code and never resets an existing member password.

const SQUARESPACE_API_BASE = "https://api.squarespace.com";
const { commerceApiKey, customerOrders } = require("../server/squarespace-commerce.js");
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

function membershipRank(value) {
  const cleaned = String(value || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 0;
  if (cleaned === "queen" || cleaned === "queendom") return 1;
  if (cleaned === "flow" || cleaned === "flowfm" || cleaned === "flowfmmember") return 2;
  if (cleaned === "council") return 3;
  return 0;
}

function membershipFromRank(rank, fallback = "queendom") {
  const value = Number(rank || 0);
  if (value >= 3) return "council";
  if (value >= 2) return "flowfm";
  if (value >= 1) return "queendom";
  return normalizeMembership(fallback);
}


function configuredMembershipProductIds() {
  const parse = (value) => [...new Set(String(value || "").split(/[\s,]+/).map((item) => item.trim()).filter(Boolean))];
  return {
    queendom: parse(process.env.SQUARESPACE_QUEENDOM_PRODUCT_IDS),
    flowfm: parse(process.env.SQUARESPACE_FLOWFM_PRODUCT_IDS),
    council: parse(process.env.SQUARESPACE_COUNCIL_PRODUCT_IDS),
  };
}

function orderContainsAnyProduct(order, productIds = []) {
  const wanted = new Set(productIds.map(String));
  return (Array.isArray(order?.lineItems) ? order.lineItems : []).some((line) => wanted.has(String(line?.productId || "")));
}

function newestMembershipOrder(orders = [], productIds = []) {
  return orders
    .filter((order) => orderContainsAnyProduct(order, productIds))
    .sort((a, b) => new Date(b?.modifiedOn || b?.createdOn || 0).getTime() - new Date(a?.modifiedOn || a?.createdOn || 0).getTime())[0] || null;
}

async function verifySquarespaceMembershipPurchase(contact) {
  const ids = configuredMembershipProductIds();
  const configured = Object.values(ids).some((rows) => rows.length);
  if (!configured) {
    const error = new Error("New-member purchase verification is not configured yet. Add the Squarespace Queendom/Flow FM membership product IDs in Vercel before opening first-time account creation.");
    error.statusCode = 503;
    throw error;
  }

  const apiKey = commerceApiKey();
  if (!apiKey) {
    const error = new Error("Squarespace Commerce verification is not configured on Vercel.");
    error.statusCode = 503;
    throw error;
  }
  if (!contact?.id) {
    const error = new Error("Flowtel could not match this email to a Squarespace customer record.");
    error.statusCode = 404;
    throw error;
  }

  const orders = await customerOrders(contact.id, apiKey);
  for (const membership of ["council", "flowfm", "queendom"]) {
    if (!ids[membership].length) continue;
    const order = newestMembershipOrder(orders, ids[membership]);
    if (order?.paymentState === "PAID") {
      return { membershipType: membership, orderId: order.id || null };
    }
  }

  const error = new Error("This email exists in Squarespace, but Flowtel could not verify an active Queendom or Flow FM membership purchase. Use the email you used at checkout, or contact the Flowtel if your membership was purchased another way.");
  error.statusCode = 403;
  throw error;
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

function contactFromExistingProfile(profile, email) {
  return {
    id: profile?.squarespace_contact_id || null,
    firstName: profile?.first_name || null,
    lastName: profile?.last_name || null,
    email: normalizeEmail(profile?.squarespace_contact_email || profile?.email || email),
    locale: null,
    unverified: false,
    source: "existing-flowtel-profile",
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
  const apiKey = process.env.SQUARESPACE_COMMERCE_API_KEY || process.env.SQUARESPACE_API_KEY;

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
      "User-Agent": "Flowtel Squarespace Bridge/0.10.85",
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


async function findSupabaseProfileByEmail({ supabaseUrl, serviceKey, email }) {
  const url = `${supabaseUrl}/rest/v1/profiles?select=id,email,role,display_name,first_name,last_name,membership_type,membership_rank,flowfm_started_at,is_initiated,squarespace_contact_id,squarespace_contact_email&email=eq.${encodeURIComponent(email)}&limit=1`;
  const data = await readSupabaseJson(url, {
    method: "GET",
    headers: supabaseAdminHeaders(serviceKey),
  });
  return Array.isArray(data) ? data[0] || null : null;
}

async function upsertMemberSignupAdmission({ supabaseUrl, serviceKey, email, membershipType, source, sourceOrderId = null, squarespaceContactId = null }) {
  const normalizedEmail = normalizeEmail(email);
  const rank = membershipRank(membershipType);
  if (!normalizedEmail || rank < 1) throw new Error("Flowtel could not prepare a verified membership admission for this email.");

  const payload = {
    email: normalizedEmail,
    membership_type: membershipFromRank(rank, membershipType),
    membership_rank: rank,
    source: source || "squarespace-membership",
    source_order_id: sourceOrderId || null,
    squarespace_contact_id: squarespaceContactId || null,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    claimed_by: null,
    claimed_at: null,
    updated_at: new Date().toISOString(),
  };

  await readSupabaseJson(`${supabaseUrl}/rest/v1/flowtel_member_signup_admissions?on_conflict=email`, {
    method: "POST",
    headers: {
      ...supabaseAdminHeaders(serviceKey),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  });
  return payload;
}

async function findSupabaseAuthUserByEmail({ supabaseUrl, serviceKey, email }) {
  const data = await readSupabaseJson(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    method: "GET",
    headers: supabaseAdminHeaders(serviceKey),
  });
  const users = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
  return users.find((user) => normalizeEmail(user?.email) === email) || null;
}

async function refreshSupabaseBetaUserMetadata({ supabaseUrl, serviceKey, userId, contact, membershipType, existingMetadata = {} }) {
  if (!userId) return null;
  const payload = {
    email_confirm: true,
    user_metadata: {
      ...(existingMetadata || {}),
      first_name: existingMetadata?.first_name || contact?.firstName || null,
      last_name: existingMetadata?.last_name || contact?.lastName || null,
      display_name:
        existingMetadata?.display_name ||
        existingMetadata?.full_name ||
        existingMetadata?.name ||
        [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") ||
        null,
      full_name:
        existingMetadata?.display_name ||
        existingMetadata?.full_name ||
        existingMetadata?.name ||
        [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") ||
        null,
      name:
        existingMetadata?.display_name ||
        existingMetadata?.full_name ||
        existingMetadata?.name ||
        [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") ||
        null,
      squarespace_contact_id: contact?.id || existingMetadata?.squarespace_contact_id || null,
      membership_type: membershipType,
      membership_rank: membershipRank(membershipType),
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
        display_name: [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || null,
        full_name: [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || null,
        name: [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || null,
        squarespace_contact_id: contact?.id || null,
        membership_type: membershipType,
        membership_rank: membershipRank(membershipType),
        flowtel_beta_access: true,
      },
    }),
  });
}

async function ensureSupabaseAuthUser({ email, contact, membershipType, intent, trustedDoorway, existingProfile = null }) {
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
  let resolvedMembership = resolveMembership(membershipType, existingProfile, null);

  try {
    const existingUser = await findSupabaseAuthUserByEmail({ supabaseUrl, serviceKey, email });
    resolvedMembership = resolveMembership(membershipType, existingProfile, existingUser);
    if (existingUser?.id) {
      await refreshSupabaseBetaUserMetadata({
        supabaseUrl,
        serviceKey,
        userId: existingUser.id,
        contact,
        membershipType: resolvedMembership,
        existingMetadata: existingUser.user_metadata || existingUser.raw_user_meta_data || {},
      });
      return {
        prepared: true,
        userId: existingUser.id,
        accountStatus: "existing",
        temporaryPasswordCreated: false,
        membershipType: resolvedMembership,
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
      membershipType: resolvedMembership,
    });
    return {
      prepared: true,
      userId: data.id || data.user?.id || null,
      accountStatus: "created",
      temporaryPasswordCreated: true,
      membershipType: resolvedMembership,
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
            membershipType: resolvedMembership,
            existingMetadata: existingUser.user_metadata || existingUser.raw_user_meta_data || {},
          });
          return {
            prepared: true,
            userId: existingUser.id,
            accountStatus: "existing",
            temporaryPasswordCreated: false,
            membershipType: resolvedMembership,
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

    const verifyOnly = intent === "verify" || intent === "verify-only" || intent === "signup";
    const trustedDoorway = verifyOnly ? false : canUseTrustedDoorway(body);
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = normalizeSupabaseProjectUrl(process.env.SUPABASE_URL);
    const existingProfile = serviceKey && supabaseUrl
      ? await findSupabaseProfileByEmail({ supabaseUrl, serviceKey, email })
      : null;

    // Beta exit: account creation is now performed by Supabase Auth in the browser
    // with the member's own password and email-confirmation flow. The bridge only
    // verifies an exact Squarespace contact and returns the already-known membership.
    // A URL parameter can never promote a brand-new account to Flow FM/Council.
    if (verifyOnly) {
      const existingRank = Math.max(
        Number(existingProfile?.membership_rank || 0),
        membershipRank(existingProfile?.membership_type),
        ["practitioner", "admin", "owner"].includes(String(existingProfile?.role || "").toLowerCase()) ? 2 : 0,
        existingProfile?.flowfm_started_at || existingProfile?.is_initiated ? 2 : 0,
      );
      let contact = existingRank >= 1 ? contactFromExistingProfile(existingProfile, email) : null;
      let purchase = null;
      if (existingRank < 1) {
        contact = await querySquarespaceContact(email, { trustedDoorway: false });
        purchase = await verifySquarespaceMembershipPurchase(contact);
      } else {
        // Existing canonical Flowtel membership is sufficient for beta-exit account
        // creation. Squarespace contact enrichment is best-effort so an older
        // member is not locked out merely because Contacts is incomplete.
        try {
          contact = await querySquarespaceContact(email, { trustedDoorway: false });
        } catch (error) {
          console.warn("Flowtel bridge: existing member Squarespace contact enrichment skipped.", error?.message || error);
        }
      }
      const resolvedMembership = existingRank >= 1
        ? membershipFromRank(existingRank, "queendom")
        : purchase.membershipType;

      if (!serviceKey || !supabaseUrl) {
        const configError = new Error("Supabase server verification is not configured on Vercel.");
        configError.statusCode = 503;
        throw configError;
      }

      await upsertMemberSignupAdmission({
        supabaseUrl,
        serviceKey,
        email,
        membershipType: resolvedMembership,
        source: existingRank >= 1 ? "existing-flowtel-membership" : "squarespace-membership-purchase",
        sourceOrderId: purchase?.orderId || null,
        squarespaceContactId: contact?.id || existingProfile?.squarespace_contact_id || null,
      });

      res.status(200).json({
        ok: true,
        membershipType: resolvedMembership,
        membershipLabel: MEMBERSHIP_LABEL[resolvedMembership] || "Flowtel",
        contact,
        verified: true,
        bridgeMode: existingRank >= 1 ? "existing-flowtel-membership" : "squarespace-paid-membership",
        bridgeNote: purchase?.orderId ? `Verified Squarespace membership order ${purchase.orderId}.` : null,
        supabaseUserPrepared: false,
        accountStatus: existingProfile ? "existing-profile" : "new",
        temporaryPasswordCreated: false,
        personalPasswordPreserved: Boolean(existingProfile),
        note: "Squarespace member verified. Create or sign in to the Flowtel with your private password.",
      });
      return;
    }

    const contact = await querySquarespaceContact(email, { trustedDoorway });
    const authResult = await ensureSupabaseAuthUser({
      email,
      contact,
      membershipType,
      intent,
      trustedDoorway,
      existingProfile,
    });
    const resolvedMembership = authResult.membershipType || membershipType;

    res.status(200).json({
      ok: true,
      membershipType: resolvedMembership,
      membershipLabel: MEMBERSHIP_LABEL[resolvedMembership] || "Flowtel",
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
