import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// A real embedded PostgreSQL engine. The auth shim models Supabase's managed
// auth schema only; application tables, grants, functions and RLS are unchanged.
export async function database() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (
      id uuid primary key, email text, email_confirmed_at timestamptz,
      deleted_at timestamptz, banned_until timestamptz
    );
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/202610220001_matching.sql", import.meta.url), "utf8"));
  return db;
}
