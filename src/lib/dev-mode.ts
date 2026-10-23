// Temporary local test mode. Never enabled in production or against Supabase.
export function devEmailLogin() {
  return process.env.NODE_ENV === "development" && process.env.DEV_EMAIL_LOGIN !== "false" &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL;
}
export const DEV_SESSION_COOKIE = "intandem-dev-session";
