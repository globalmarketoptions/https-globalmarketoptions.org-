const fs = require("node:fs");
const path = require("node:path");

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
  throw new Error("SUPABASE_URL must be your HTTPS Supabase project URL (https://<project-ref>.supabase.co).");
}
if (anonKey && /service_role/i.test(anonKey)) {
  throw new Error("Do not expose a Supabase service-role key to the browser. Use the anon/publishable key.");
}

const config = { url, anonKey };
const output = "// Generated at build time from SUPABASE_URL and SUPABASE_ANON_KEY (public anon/publishable key only).\n" +
  "window.SUPABASE_CONFIG = " + JSON.stringify(config, null, 2) + ";\n";
for (const file of ["supabase-config.js", path.join("public", "supabase-config.js")]) {
  fs.mkdirSync(path.dirname(file) === "." ? "." : path.dirname(file), { recursive: true });
  fs.writeFileSync(file, output, "utf8");
}
if (!url || !anonKey) {
  console.warn("Supabase browser config is empty. Set SUPABASE_URL and SUPABASE_ANON_KEY in the deployment environment before using login/dashboard/admin.");
}
