import { signInWithEmail, signOut } from "../shared/auth.js";

const form = document.getElementById("betaRequestForm");
const message = document.getElementById("message");
const button = document.getElementById("submitButton");
const successPanel = document.getElementById("successPanel");
const loginLink = document.getElementById("loginLink");
const membershipSelect = document.getElementById("membershipType");

function setMessage(text, type = "") {
  message.textContent = text || "";
  message.className = `message ${type}`.trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function membershipFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = String(params.get("membership") || "queendom").toLowerCase().replace(/[^a-z]/g, "");
  if (raw === "flow" || raw === "flowfm") return "flowfm";
  if (raw === "council") return "council";
  return "queendom";
}

function clientUrl(membership = "queendom") {
  return `/client/?membership=${encodeURIComponent(membership || "queendom")}`;
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
  window.location.href = clientUrl(membershipType);
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
  setMessage("Creating your Flowtel access. If approved, we’ll log you in automatically.");

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

    form.classList.add("hidden");
    successPanel.classList.remove("hidden");
    setMessage(
      result.accountStatus === "created"
        ? "Your Flowtel access has been created. We’re logging you in."
        : "Your Flowtel access already existed. We refreshed it and we’re logging you in."
    );

    button.textContent = "Logging you in...";
    await autoLoginAndEnter(payload.email, result.temporaryPassword, payload.membershipType);
  } catch (error) {
    console.error("Beta request could not complete automatic login:", error);
    setMessage(error.message || "Something went wrong at the Front Desk.", "error");
    button.disabled = false;
    button.textContent = "Request Flowtel Access";
  }
});
