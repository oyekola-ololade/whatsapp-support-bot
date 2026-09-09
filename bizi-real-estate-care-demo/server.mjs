import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const files = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/bizi-systems-logo.svg": ["bizi-systems-logo.svg", "image/svg+xml"]
};

http.createServer(async (req, res) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  if (pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ok: true, service: "bizi-real-estate-care-demo" }));
  }
  const entry = files[pathname];
  if (!entry) {
    res.writeHead(404);
    return res.end("Not found");
  }
  const body = await fs.readFile(path.join(root, entry[0]));
  res.writeHead(200, {
    "content-type": entry[1],
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(body);
}).listen(port, "127.0.0.1", () => {
  console.log(`Real Estate Care demo ready at http://127.0.0.1:${port}`);
});

