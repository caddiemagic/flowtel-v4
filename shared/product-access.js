// Product access boundary shared by Flowtel and Caddie Magic.

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
      const message = access?.flowtel_access_status === "revoked"
        ? "Your Flowtel access has been paused by the Concierge. Your history remains safely preserved."
        : "Your player key opens Caddie Magic, not Flowtel.";
      throw new ProductAccessError("flowtel", message);
    }
  }

  const access = await getMyProductAccess();
  const isOwner = ["owner", "admin"].includes(String(access?.access_role || "").toLowerCase());
  const allowed = isOwner || (normalized === "flowtel"
    ? access?.flowtel_access === true
    : access?.caddie_magic_access === true);

  if (!allowed) {
    const message = normalized === "flowtel"
      ? (access?.flowtel_access_status === "revoked"
        ? "Your Flowtel access has been paused by the Concierge. Your history remains safely preserved."
        : "Your player key opens Caddie Magic, not Flowtel.")
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
