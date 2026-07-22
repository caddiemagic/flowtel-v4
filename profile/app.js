import { getCurrentProfile, updateMyGuestProfile } from "../shared/profiles.js?v=0.10.71";
import { isProductAccessError } from "../shared/product-access.js?v=0.10.71";

const form = document.getElementById("profileForm");
const loading = document.getElementById("profileLoading");
const denied = document.getElementById("profileDenied");
const message = document.getElementById("profileMessage");
const saveButton = document.getElementById("saveProfileButton");
const returnLink = document.getElementById("returnToSuiteLink");
const timezoneSelect = document.getElementById("timezone");
let currentProfile = null;

const TIMEZONES = [
  ["America/Los_Angeles", "Pacific Time — Los Angeles"],
  ["America/Denver", "Mountain Time — Denver"],
  ["America/Chicago", "Central Time — Chicago"],
  ["America/New_York", "Eastern Time — New York"],
  ["America/Phoenix", "Arizona Time — Phoenix"],
  ["America/Anchorage", "Alaska Time — Anchorage"],
  ["Pacific/Honolulu", "Hawaii Time — Honolulu"],
  ["America/Toronto", "Eastern Time — Toronto"],
  ["America/Vancouver", "Pacific Time — Vancouver"],
  ["America/Mexico_City", "Central Time — Mexico City"],
  ["America/Bogota", "Bogotá"],
  ["America/Lima", "Lima"],
  ["America/Sao_Paulo", "São Paulo"],
  ["Europe/London", "London"],
  ["Europe/Paris", "Paris"],
  ["Europe/Berlin", "Berlin"],
  ["Europe/Madrid", "Madrid"],
  ["Europe/Rome", "Rome"],
  ["Africa/Johannesburg", "Johannesburg"],
  ["Asia/Dubai", "Dubai"],
  ["Asia/Kolkata", "India — Kolkata"],
  ["Asia/Singapore", "Singapore"],
  ["Asia/Tokyo", "Tokyo"],
  ["Australia/Sydney", "Sydney"],
  ["Pacific/Auckland", "Auckland"],
];

function returnTarget() {
  const params = new URLSearchParams(window.location.search);
  const candidate = params.get("return") || "/client/?suite=1&profileReturn=1";
  return candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/client/?suite=1&profileReturn=1";
}

function renderTimezoneOptions(selected = "America/Los_Angeles") {
  const known = new Set(TIMEZONES.map(([value]) => value));
  const options = known.has(selected) ? TIMEZONES : [[selected, selected], ...TIMEZONES];
  timezoneSelect.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  timezoneSelect.value = selected || "America/Los_Angeles";
}

function populate(profile) {
  document.getElementById("firstName").value = profile?.first_name || "";
  document.getElementById("lastName").value = profile?.last_name || "";
  document.getElementById("displayName").value = profile?.display_name || "";
  document.getElementById("email").value = profile?.email || "";
  document.getElementById("location").value = profile?.location || "";
  document.getElementById("hemisphere").value = profile?.hemisphere || "";
  renderTimezoneOptions(profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles");
  returnLink.href = returnTarget();
}

async function boot() {
  try {
    currentProfile = await getCurrentProfile();
    if (!currentProfile) {
      loading.classList.add("hidden");
      denied.classList.remove("hidden");
      return;
    }
    populate(currentProfile);
    loading.classList.add("hidden");
    form.classList.remove("hidden");
  } catch (error) {
    console.error("Flowtel profile could not open.", error);
    if (isProductAccessError(error)) {
      loading.classList.add("hidden");
      denied.classList.remove("hidden");
      denied.querySelector("p").textContent = error?.message || "This account does not currently have Flowtel access.";
      return;
    }
    loading.textContent = error?.message || "Your profile room could not open just now.";
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  message.textContent = "Tending your Flowtel profile...";
  try {
    currentProfile = await updateMyGuestProfile({
      firstName: document.getElementById("firstName").value,
      lastName: document.getElementById("lastName").value,
      displayName: document.getElementById("displayName").value,
      location: document.getElementById("location").value,
      timezone: timezoneSelect.value,
      hemisphere: document.getElementById("hemisphere").value,
    });
    try {
      sessionStorage.removeItem(`flowtel:profilePromptShown:${currentProfile?.id || "member"}`);
    } catch (error) {}
    message.textContent = "Your profile has been saved. Returning you to your Suite...";
    window.setTimeout(() => { window.location.href = returnTarget(); }, 650);
  } catch (error) {
    console.error("Flowtel profile could not be saved.", error);
    message.textContent = error?.message || "Your profile could not be saved. Please try again.";
    saveButton.disabled = false;
    saveButton.textContent = "Save My Profile";
  }
});

boot();
