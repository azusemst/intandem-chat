import { writeFile } from "node:fs/promises";
import { database } from "../tests/database.mjs";

// Generate row/RPC types from the applied migration's PostgreSQL catalog without
// requiring Docker or a hosted project. Hosted regeneration can use db:types.
const db = await database();
const type = sql => {
  if (sql.endsWith("[]")) return `${type(sql.slice(0, -2))}[]`;
  if (["integer", "bigint", "smallint", "numeric", "double precision", "real"].includes(sql)) return "number";
  if (sql === "boolean") return "boolean";
  if (["jsonb", "json"].includes(sql)) return "Json";
  if (sql.startsWith("public.")) return `Database["public"]["Tables"][${JSON.stringify(sql.slice(7))}]["Row"]`;
  return "string";
};
const tables = await db.query(`select c.relname as name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname`);
let output = '// Generated from PostgreSQL catalog by npm run db:types:local. Do not edit.\n';
output += 'export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\n';
output += 'export type Database = { public: { Tables: {\n';
for (const { name } of tables.rows) {
  const columns = await db.query(`select a.attname as name, format_type(a.atttypid,a.atttypmod) as type, a.attnotnull as required from pg_attribute a where a.attrelid=$1::regclass and a.attnum>0 and not a.attisdropped order by a.attnum`, [`public.${name}`]);
  const row = `{ ${columns.rows.map(c => `${JSON.stringify(c.name)}: ${type(c.type)}${c.required ? "" : " | null"}`).join("; ")} }`;
  output += `${JSON.stringify(name)}: { Row: ${row}; Insert: Partial<${row}>; Update: Partial<${row}>; Relationships: [] };\n`;
}
output += '}; Views: { [_ in never]: never }; Functions: {\n';
const functions = await db.query(`select p.proname as name, p.proargnames as names, p.proretset as many, oidvectortypes(p.proargtypes) as types, format_type(p.prorettype,null) as result from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by p.proname`);
for (const f of functions.rows) {
  const args = f.names ? `{ ${f.names.map((n, i) => `${n}: ${type(f.types.split(", ")[i])}`).join("; ")} }` : 'Record<string, never>';
  const result = f.result === "void" ? "undefined" : tables.rows.some(t => t.name === f.result) ? `Database["public"]["Tables"][${JSON.stringify(f.result)}]["Row"]` : type(f.result);
  output += `${f.name}: { Args: ${args}; Returns: ${result}${f.many ? "[]" : ""} };\n`;
}
output += '}; Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never } } };\n';
await writeFile(new URL("../src/lib/database.types.ts", import.meta.url), output);
await db.close();
console.log("Generated database.types.ts from the applied PostgreSQL migration.");
