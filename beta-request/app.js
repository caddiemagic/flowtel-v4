import { signInWithEmail, signOut } from "../shared/auth.js?v=0.10.49";

const form = document.getElementById("betaRequestForm");
const message = document.getElementById("message");
const button = document.getElementById("submitButton");
const successPanel = document.getElementById("successPanel");
const successTitle = document.getElementById("successTitle");
const successCopy = document.getElementById("successCopy");
const loginLink = document.getElementById("loginLink");
const membershipSelect = document.getElementById("membershipType");
const betaLoadingOverlay = document.getElementById("betaLoadingOverlay");
const betaLoadingCopy = document.getElementById("betaLoadingCopy");
const betaLoadingHelper = document.getElementById("betaLoadingHelper");
let betaLoadingTimer = null;

function setMessage(text, type = "") {
  message.textContent = text || "";
  message.className = `message ${type}`.trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function setBetaLoading(isLoading, copy="Creating your Flowtel access...") {
  window.clearTimeout(betaLoadingTimer);
  betaLoadingOverlay?.classList.toggle("hidden", !isLoading);
  betaLoadingOverlay?.setAttribute("aria-hidden", isLoading ? "false" : "true");
  document.body.classList.toggle("beta-is-loading", !!isLoading);
  if (betaLoadingCopy && copy) betaLoadingCopy.textContent = copy;
  if (betaLoadingHelper) betaLoadingHelper.textContent = "Please keep this window open while we ready your room.";
  if (isLoading) {
    betaLoadingTimer = window.setTimeout(() => {
      if (betaLoadingHelper) betaLoadingHelper.textContent = "Your room is still being prepared. Thank you for your patience.";
    }, 5500);
  }
}

function membershipFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = String(params.get("membership") || "queendom").toLowerCase().replace(/[^a-z]/g, "");
  if (raw === "flow" || raw === "flowfm") return "flowfm";
  if (raw === "council") return "council";
  return "queendom";
}

function clientUrl(membership = "queendom", email = "", forceDoorway = false) {
  const params = new URLSearchParams({ membership: membership || "queendom" });
  if (email) params.set("email", email);
  if (forceDoorway) params.set("forceDoorway", "1");
  return `/client/?${params.toString()}`;
}

function applyMembershipDefault() {
  const membership = membershipFromUrl();
  if (membershipSelect) membershipSelect.value = membership;
  if (loginLink) loginLink.href = clientUrl(membership);
}

async function autoLoginAndEnter(email, password, membershipType) {
  if (!email || !password) {
    throw new Error("Flowtel access was created, but automatic login was not available.");
  }

  await signOut();
  await signInWithEmail(email, password);
  window.location.href = clientUrl(membershipType, email);
}

applyMembershipDefault();

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    name: document.getElementById("name")?.value?.trim() || "",
    email: normalizeEmail(document.getElementById("email")?.value),
    membershipType: document.getElementById("membershipType")?.value || membershipFromUrl(),
    betaCode: document.getElementById("betaCode")?.value?.trim() || "",
  };

  if (!payload.name || !payload.email) {
    setMessage("Please enter your name and email.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "Creating access...";
  setMessage("Creating your Flowtel access.");
  setBetaLoading(true, "Creating your Flowtel access...");

  try {
    const response = await fetch("/api/beta-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Could not create this Flowtel access.");
    }

    const resolvedMembership = result.membershipType || payload.membershipType;
    form.classList.add("hidden");
    successPanel.classList.remove("hidden");
    loginLink.href = clientUrl(resolvedMembership, payload.email);

    if (result.accountStatus === "created" && result.autoLoginAvailable && result.temporaryPassword) {
      if (successTitle) successTitle.textContent = "Your Flowtel access is ready.";
      if (successCopy) successCopy.textContent = "We’re logging you in with the temporary beta password. You’ll create your own private room key before entering your Suite.";
      setMessage("Your access is ready. We’re logging you in.");
      button.textContent = "Logging you in...";
      setBetaLoading(true, "Your access is ready. Logging you in and preparing your private room key...");
      await autoLoginAndEnter(payload.email, result.temporaryPassword, resolvedMembership);
      return;
    }

    setBetaLoading(false);
    loginLink.href = clientUrl(resolvedMembership, payload.email, true);
    if (successTitle) successTitle.textContent = "Your Flowtel access already exists.";
    if (successCopy) successCopy.textContent = "Your personal password was preserved. Enter the Flowtel with the private password you already created. On your first visit, use FlowtelBeta!2026.";
    loginLink.textContent = "Enter the Flowtel";
    setMessage("Your existing Flowtel password was preserved.");
  } catch (error) {
    console.error("Beta request could not complete:", error);
    setMessage(error.message || "Something went wrong at the Front Desk.", "error");
    setBetaLoading(false);
    button.disabled = false;
    button.textContent = "Request Flowtel Access";
  }
});
