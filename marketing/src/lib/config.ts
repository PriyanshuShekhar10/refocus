// Absolute origin of the Next.js product app (auth + dashboard live here).
// Overridable via PUBLIC_APP_URL at build time.
export const APP_URL =
  import.meta.env.PUBLIC_APP_URL || "https://dashboard.refocus.co.in";

export const url = (path: string) => `${APP_URL}${path}`;
