import { getCurrentUser } from "../shared/auth.js";

const entryActions = document.getElementById("entryActions");
const rememberedPanel = document.getElementById("rememberedPanel");
const checkedInBeforeLink = document.getElementById("checkedInBeforeLink");
const requestAccessLink = document.getElementById("requestAccessLink");
const entryLoadingOverlay = document.getElementById("entryLoadingOverlay");
const entryLoadingCopy = document.getElementById("entryLoadingCopy");

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

function setEntryLoading(isLoading, copy="Checking for your room key...") {
  entryLoadingOverlay?.classList.toggle("hidden", !isLoading);
  if (entryLoadingCopy && copy) entryLoadingCopy.textContent = copy;
  document.body.classList.toggle("entry-is-loading", !!isLoading);
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
      setEntryLoading(true, "Welcome back. Preparing your suite...");
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
  setEntryLoading(false);
}

checkedInBeforeLink?.addEventListener("click", () => {
  setEntryLoading(true, "Opening the Flowtel and preparing your suite...");
});

initEntry();
