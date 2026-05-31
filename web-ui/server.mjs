#!/usr/bin/env node

/**
 * PS Claw — Servidor Web
 * Proxy reverso para APIs de IA (Anthropic, OpenAI, Google, etc.)
 * Evita CORS bloqueando chamadas diretas do navegador
 */

import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_PORT = process.env.PS_CLAW_WEB_PORT || 3000;

// Proxy genérico para APIs externas
function proxyRequest(targetUrl, method, headers, body, res) {
  const url = new URL(targetUrl);
  const isHttps = url.protocol === "https:";
  const lib = isHttps ? https : http;

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method,
    headers: { ...headers, host: url.hostname },
  };

  const req = lib.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      "access-control-allow-origin": "*",
    });
    proxyRes.pipe(res);
  });

  req.on("error", (e) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  });

  if (body) req.write(body);
  req.end();
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, anthropic-version");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Proxy para APIs externas: /proxy?url=https://api.anthropic.com/...
  if (req.url.startsWith("/proxy")) {
    const params = new URL(req.url, `http://localhost`).searchParams;
    const target = params.get("url");
    if (!target) { res.writeHead(400); res.end("Missing url param"); return; }

    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => proxyRequest(target, req.method, req.headers, body, res));
    return;
  }

  // Servir arquivos estáticos
  const filePath = req.url === "/" ? "/index.html" : req.url;
  const fullPath = path.join(__dirname, "public", filePath);
  const ext = path.extname(fullPath);
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
  };

  try {
    const content = fs.readFileSync(fullPath);
    res.writeHead(200, { "Content-Type": mime[ext] || "text/plain" });
    res.end(content);
  } catch {
    res.writeHead(404); res.end("Not found");
  }
});

server.listen(WEB_PORT, () => {
  console.log("");
  console.log("  🦞 PS Claw — Interface Web");
  console.log("  ────────────────────────────────");
  console.log(`  ✅ Rodando em: http://localhost:${WEB_PORT}`);
  console.log("  📖 Abra o navegador e configure sua API key");
  console.log("");
});
