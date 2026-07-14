import { getMoonMagic } from "../shared/moon.js";

const FLOWTEL_TIME_ZONE = "America/Los_Angeles";

function formatDate(iso) {
  if (!iso) return "";
  const [year, month, day] = String(iso).slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function flowtelDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: FLOWTEL_TIME_ZONE,
  }).format(date);
}

function renderMoonWidget() {
  const title = document.getElementById("moonTitle");
  const theme = document.getElementById("moonTheme");
  const meta = document.getElementById("moonMeta");

  const moon = getMoonMagic(new Date());
  if (title) title.textContent = `${moon.phase} · Day ${moon.moonDay}`;
  if (theme) theme.textContent = moon.theme;
  if (meta) {
    meta.textContent = `Next New Moon: ${formatDate(moon.nextNewMoonDate)} · Flowtel Time: ${flowtelDateLabel()}`;
  }
}

renderMoonWidget();
