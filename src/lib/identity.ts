export function allowedEmail(email: string, domains = "usc.edu") {
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 && parts[0].length > 0 && !/\s/.test(email.trim()) &&
    domains.split(",").map(d => d.trim().toLowerCase()).includes(parts[1]);
}
