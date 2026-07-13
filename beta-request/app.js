const form = document.getElementById("betaRequestForm");
const message = document.getElementById("message");
const button = document.getElementById("submitButton");
const successPanel = document.getElementById("successPanel");

function setMessage(text, type = "") {
  message.textContent = text || "";
  message.className = `message ${type}`.trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    name: document.getElementById("name")?.value?.trim() || "",
    email: normalizeEmail(document.getElementById("email")?.value),
    membershipType: document.getElementById("membershipType")?.value || "queendom",
    trackingStyle: document.getElementById("trackingStyle")?.value || "learning",
    betaCode: document.getElementById("betaCode")?.value?.trim() || "",
  };

  if (!payload.name || !payload.email) {
    setMessage("Please enter your name and email.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "Preparing room key...";
  setMessage("The Front Desk is preparing your Flowtel room key.");

  try {
    const response = await fetch("/api/beta-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Could not prepare this Flowtel room key.");
    }

    form.classList.add("hidden");
    successPanel.classList.remove("hidden");
    setMessage(
      result.accountStatus === "created"
        ? "Your room key is ready."
        : "Your room key already existed, so we refreshed the profile connection."
    );
  } catch (error) {
    setMessage(error.message || "Something went wrong at the Front Desk.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Request Flowtel Access";
  }
});
