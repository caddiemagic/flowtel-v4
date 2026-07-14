const form = document.getElementById("betaRequestForm");
const message = document.getElementById("message");
const button = document.getElementById("submitButton");
const successPanel = document.getElementById("successPanel");
const enterFlowtelLink = document.getElementById("enterFlowtelLink");
const params = new URLSearchParams(window.location.search);

function setMessage(text, type = "") {
  message.textContent = text || "";
  message.className = `message ${type}`.trim();
}

function normalizeMembership(value) {
  const cleaned = String(value || "").toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned === "queen" || cleaned === "queendom") return "queendom";
  if (cleaned === "flow" || cleaned === "flowfm" || cleaned === "flowfmmember") return "flowfm";
  if (cleaned === "council") return "council";
  return "queendom";
}

const incomingMembership = normalizeMembership(params.get("membership") || params.get("source") || params.get("doorway"));
const membershipField = document.getElementById("membershipType");
if (membershipField) membershipField.value = incomingMembership;
if (enterFlowtelLink) enterFlowtelLink.href = `../client/?membership=${encodeURIComponent(incomingMembership)}&forceDoorway=1`;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    name: document.getElementById("name")?.value?.trim() || "",
    email: normalizeEmail(document.getElementById("email")?.value),
    membershipType: document.getElementById("membershipType")?.value || "queendom",
    betaCode: document.getElementById("betaCode")?.value?.trim() || "",
  };

  if (!payload.name || !payload.email) {
    setMessage("Please enter your name and email.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "Preparing access...";
  setMessage("The Front Desk is preparing your Flowtel access.");

  try {
    const response = await fetch("/api/beta-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Could not prepare this Flowtel access.");
    }

    form.classList.add("hidden");
    successPanel.classList.remove("hidden");
    setMessage(
      result.accountStatus === "created"
        ? "Your Flowtel access is ready."
        : "Your Flowtel access already existed, so we refreshed the profile connection."
    );
  } catch (error) {
    setMessage(error.message || "Something went wrong at the Front Desk.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Request Flowtel Access";
  }
});
