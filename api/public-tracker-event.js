// api/public-tracker-event.js
// Flowtel v0.10.29 — anonymous public Cycle Tracker usage event capture.
// Stores aggregate-friendly tracker patterns only. No names, emails, or profile ids.

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

function cleanText(value, maxLength = 120) {
  const cleaned = String(value || "").trim().slice(0, maxLength);
  return cleaned || null;
}

function cleanInt(value, min = null, max = null) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const intValue = Math.trunc(number);
  if (min !== null && intValue < min) return null;
  if (max !== null && intValue > max) return null;
  return intValue;
}

function normalizeEventType(value) {
  const cleaned = cleanText(value, 60) || "tracker_event";
  const allowed = new Set(["tracker_view", "tracker_submit", "cta_click", "tracker_day_preview"]);
  return allowed.has(cleaned) ? cleaned : "tracker_event";
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

async function insertTrackerEvent(payload) {
  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    const error = new Error("Public tracker analytics are not configured yet.");
    error.statusCode = 202;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/flowtel_public_tracker_events`, {
    method: "POST",
    headers: supabaseHeaders(serviceKey, "return=minimal"),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(text || `Supabase insert failed with ${response.status}.`);
    error.statusCode = response.status;
    throw error;
  }
}

export default async function handler(req, res) {
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
    const payload = {
      event_type: normalizeEventType(body.event_type || body.eventType),
      source_page: cleanText(body.source_page || body.sourcePage, 120) || "public-cycle-tracker",
      tracking_method: cleanText(body.tracking_method || body.trackingMethod, 80),
      selected_cycle_day: cleanInt(body.selected_cycle_day || body.selectedCycleDay, 1, 120),
      selected_feels_like_season: cleanText(body.selected_feels_like_season || body.selectedFeelsLikeSeason, 80),
      calculated_inner_season: cleanText(body.calculated_inner_season || body.calculatedInnerSeason, 80),
      moon_phase: cleanText(body.moon_phase || body.moonPhase, 80),
      moon_day: cleanInt(body.moon_day || body.moonDay, 1, 60),
      next_new_moon: cleanText(body.next_new_moon || body.nextNewMoon, 20),
      cta_target: cleanText(body.cta_target || body.ctaTarget, 240),
    };

    await insertTrackerEvent(payload);
    res.status(200).json({ ok: true });
  } catch (error) {
    // Do not let analytics failures break the public tracker experience.
    const statusCode = Number(error.statusCode || 202);
    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 202).json({
      ok: false,
      stored: false,
      message: error.message || "Tracker event not stored.",
    });
  }
}
