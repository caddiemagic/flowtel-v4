import { supabase } from "../shared/supabase.js";
import { normalizeMembership } from "../shared/membership.js";

const params = new URLSearchParams(window.location.search);
const membership = normalizeMembership(params.get("membership") || "queendom") || "queendom";

const loadingPanel = document.getElementById("loadingPanel");
const choicePanel = document.getElementById("choicePanel");
const entryIntro = document.getElementById("entryIntro");
const returningLink = document.getElementById("returningLink");
const requestLink = document.getElementById("requestLink");

function clientUrl(extra = "") {
  const suffix = extra ? `&${extra.replace(/^&/, "")}` : "";
  return `/client/?membership=${encodeURIComponent(membership)}${suffix}`;
}

function betaRequestUrl() {
  return `/beta-request/?membership=${encodeURIComponent(membership)}`;
}

function showChoices() {
  if (loadingPanel) loadingPanel.classList.add("hidden");
  if (choicePanel) choicePanel.classList.remove("hidden");
  if (entryIntro) {
    entryIntro.textContent = "If you’ve already checked in before, enter with your Flowtel login. If this is your first time entering the beta, request access first.";
  }
  if (returningLink) returningLink.href = clientUrl("forceDoorway=1");
  if (requestLink) requestLink.href = betaRequestUrl();
}

async function bootEntry() {
  try {
    if (params.get("logout") === "1") {
      await supabase.auth.signOut();
      window.location.href = clientUrl("logout=1");
      return;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    if (data?.session?.user) {
      window.location.href = clientUrl();
      return;
    }
  } catch (error) {
    console.warn("Flowtel entry could not read the remembered session.", error);
  }

  showChoices();
}

bootEntry();
