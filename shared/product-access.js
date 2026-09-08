// Product access boundary shared by Flowtel and Caddie Magic.
// Flowtel v0.10.88 adds an expiry-aware one-time 14-Day Complimentary Stay.

import { supabase } from "./supabase.js";

export class ProductAccessError extends Error {
  constructor(product, message = "This account does not have access to that product.") {
    super(message);
    this.name = "ProductAccessError";
    this.code = "PRODUCT_ACCESS_DENIED";
    this.product = product;
  }
}

export function isProductAccessError(error) {
  return error?.code === "PRODUCT_ACCESS_DENIED" || error?.name === "ProductAccessError";
}

export function isComplimentaryStayAccess(access = {}) {
  if (!access || access.flowtel_trial_converted_at) return false;
  return Boolean(
    access.flowtel_trial_started_at ||
    String(access.access_source || "").startsWith("complimentary-stay")
  );
}

export function isComplimentaryStayExpired(access = {}, now = Date.now()) {
  if (!isComplimentaryStayAccess(access)) return false;
  const end = Date.parse(String(access.flowtel_trial_ends_at || ""));
  return Number.isFinite(end) && end <= Number(now);
}

export function complimentaryStayDay(access = {}, now = Date.now()) {
  if (!isComplimentaryStayAccess(access) || isComplimentaryStayExpired(access, now)) return null;
  const start = Date.parse(String(access.flowtel_trial_started_at || ""));
  if (!Number.isFinite(start)) return null;
  return Math.min(14, Math.max(1, Math.floor((Number(now) - start) / 86400000) + 1));
}

export async function getMyProductAccess() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("flowtel_product_access")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function claimFlowtelAccess() {
  const { data, error } = await supabase.rpc("flowtel_claim_default_access");
  if (error) throw error;
  return data === true;
}

function flowtelDeniedMessage(access = {}) {
  if (isComplimentaryStayExpired(access)) {
    return "Your 14-day complimentary stay is complete. Join the Queendom to reopen your room. Your Flowtel history is still safely preserved.";
  }
  if (access?.flowtel_access_status === "revoked") {
    return "Your Flowtel access has been paused by the Concierge. Your history remains safely preserved.";
  }
  return "Your player key opens Caddie Magic, not Flowtel.";
}

export async function requireProductAccess(product, { claimIfMissing = false } = {}) {
  const normalized = String(product || "").toLowerCase().replaceAll("-", "_");
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) throw new ProductAccessError(normalized, "Sign in to continue.");

  if (normalized === "flowtel" && claimIfMissing) {
    const claimed = await claimFlowtelAccess();
    if (!claimed) {
      const access = await getMyProductAccess();
      throw new ProductAccessError("flowtel", flowtelDeniedMessage(access));
    }
  }

  const access = await getMyProductAccess();
  const isOwner = ["owner", "admin"].includes(String(access?.access_role || "").toLowerCase());
  const activeFlowtelAccess = access?.flowtel_access === true && !isComplimentaryStayExpired(access);
  const allowed = isOwner || (normalized === "flowtel"
    ? activeFlowtelAccess
    : access?.caddie_magic_access === true);

  if (!allowed) {
    const message = normalized === "flowtel"
      ? flowtelDeniedMessage(access)
      : "This account has not been invited into Caddie Magic.";
    throw new ProductAccessError(normalized, message);
  }

  return access;
}

export function redirectForDeniedProduct(product) {
  const normalized = String(product || "").toLowerCase().replaceAll("-", "_");
  const target = normalized === "flowtel"
    ? "/caddie-magic/?access=player-only"
    : "/client/?access=flowtel-only";
  window.location.replace(target);
}
