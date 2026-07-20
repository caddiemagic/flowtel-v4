// shared/supabase.js

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
} from "../config/supabase-config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const FLOWTEL_PROTECTED_PREFIXES = [
  "/client/",
  "/enter/",
  "/cycle-data/",
  "/flow-map/",
  "/flow-fm/",
  "/manager/",
  "/moonbox/",
  "/database/",
  "/concierge-soon/",
];

function requiredProductForPath(pathname = window.location.pathname) {
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  if (path.startsWith("/caddie-magic/")) return "caddie_magic";
  if (FLOWTEL_PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))) return "flowtel";
  return null;
}

async function enforceCurrentPathProductAccess(session) {
  const product = requiredProductForPath();
  const user = session?.user;
  if (!product || !user) return;

  try {
    let { data, error } = await supabase
      .from("flowtel_product_access")
      .select("flowtel_access,caddie_magic_access,access_role,access_source")
      .eq("user_id", user.id)
      .maybeSingle();

    // Migration 044 may not be installed yet. Let each page show its normal
    // installation message instead of trapping the user in a redirect loop.
    if (error || !data) return;

    const role = String(data.access_role || "").toLowerCase();
    const isOwner = ["owner", "admin"].includes(role);
    let allowed = isOwner || (product === "flowtel" ? data.flowtel_access : data.caddie_magic_access);
    if (product === "caddie_magic" && new URLSearchParams(window.location.search).has("invite")) return;

    // A Guest House account remains outside the Flowtel unless a trusted
    // membership doorway has already created a real Flowtel profile for the
    // same Auth identity. In that case, promote the existing account without
    // losing its Guest House replay history.
    if (!allowed && product === "flowtel" && role === "guest_house") {
      const profileLookup = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (!profileLookup.error && profileLookup.data?.id) {
        const claim = await supabase.rpc("flowtel_claim_default_access");
        if (!claim.error && claim.data === true) {
          const refreshed = await supabase
            .from("flowtel_product_access")
            .select("flowtel_access,caddie_magic_access,access_role,access_source")
            .eq("user_id", user.id)
            .maybeSingle();
          if (!refreshed.error && refreshed.data) {
            data = refreshed.data;
            allowed = Boolean(refreshed.data.flowtel_access);
          }
        }
      }
    }

    if (allowed) return;

    const target = role === "guest_house"
      ? "/guest-house/?access=guest-house-only"
      : product === "flowtel"
        ? "/caddie-magic/?access=player-only"
        : "/client/?access=flowtel-only";

    if (window.location.pathname !== target.split("?")[0]) {
      window.location.replace(target);
    }
  } catch (error) {
    console.warn("Product access guard could not verify this route yet.", error);
  }
}

// Check remembered sessions and any sign-in that occurs after page load.
setTimeout(async () => {
  const { data } = await supabase.auth.getSession();
  await enforceCurrentPathProductAccess(data.session);
}, 0);

supabase.auth.onAuthStateChange((_event, session) => {
  setTimeout(() => enforceCurrentPathProductAccess(session), 25);
});
