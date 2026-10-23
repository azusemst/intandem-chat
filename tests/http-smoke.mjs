import assert from "node:assert/strict";
const origin = process.env.MVP_SMOKE_ORIGIN ?? "http://127.0.0.1:3000";
const landing = await fetch(origin);
assert.equal(landing.status,200);
assert.match(await landing.text(),/Better together/);
const login = await fetch(`${origin}/login`);
assert.equal(login.status,200);
assert.match(await login.text(),/USC email/);
for (const route of ["onboarding","profile","matches","requests","settings"]) {
  const result = await fetch(`${origin}/${route}`,{redirect:"manual"});
  assert.ok([303,307].includes(result.status),`${route} must redirect an unauthenticated request`);
  assert.match(result.headers.get("location") ?? "",/^\/login(?:\?|$)/);
}
const manifest = await (await fetch(`${origin}/manifest.webmanifest`)).json();
assert.equal(manifest.display,"standalone");
assert.equal(manifest.start_url,"/matches");
for (const icon of manifest.icons) {
  const result = await fetch(new URL(icon.src,origin));
  assert.equal(result.status,200);
  assert.match(result.headers.get("content-type") ?? "",/image\/png/);
  const bytes = new Uint8Array(await result.arrayBuffer());
  assert.equal(bytes[0],137);
}
console.log("PASS: landing, login, all protected redirects, manifest and PNG icons.");
