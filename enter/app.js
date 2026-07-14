import { getCurrentUser } from "../shared/auth.js";

const entryActions = document.getElementById("entryActions");
const rememberedPanel = document.getElementById("rememberedPanel");
const checkedInBeforeLink = document.getElementById("checkedInBeforeLink");
const requestAccessLink = document.getElementById("requestAccessLink");

function membershipFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = String(params.get("membership") || "queendom").toLowerCase().replace(/[^a-z]/g, "");
  if (raw === "flow" || raw === "flowfm") return "flowfm";
  if (raw === "council") return "council";
  return "queendom";
}

function show(el) {
  el?.classList.remove("hidden");
}

function hide(el) {
  el?.classList.add("hidden");
}

async function initEntry() {
  const membership = membershipFromUrl();
  const clientUrl = `/client/?membership=${encodeURIComponent(membership)}`;

  if (checkedInBeforeLink) checkedInBeforeLink.href = `${clientUrl}&forceDoorway=1`;
  if (requestAccessLink) requestAccessLink.href = `/beta-request/?membership=${encodeURIComponent(membership)}`;

  try {
    const user = await getCurrentUser();
    if (user) {
      hide(entryActions);
      show(rememberedPanel);
      setTimeout(() => {
        window.location.href = clientUrl;
      }, 900);
      return;
    }
  } catch (error) {
    console.warn("Flowtel entry could not check remembered session.", error);
  }

  hide(rememberedPanel);
  show(entryActions);
}

initEntry();
