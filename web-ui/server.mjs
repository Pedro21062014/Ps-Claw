#!/usr/bin/env node

/**
 * PS Claw — Interface Web
 * Servidor leve que serve a UI e faz proxy para o gateway do PS Claw
 */

import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WEB_PORT = process.env.PS_CLAW_WEB_PORT || 3000;
const GATEWAY_PORT = process.env.PS_CLAW_GATEWAY_PORT || 18789;
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";

function serveFile(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

function proxyToGateway(req, res, bodyData) {
  const options = {
    hostname: "127.0.0.1",
    port: GATEWAY_PORT,
    path: req.url.replace("/gateway", ""),
    method: req.method,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${GATEWAY_PORT}`,
      ...(GATEWAY_TOKEN && { authorization: `Bearer ${GATEWAY_TOKEN}` }),
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", () => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Gateway do PS Claw não está rodando. Execute: node openclaw.mjs" }));
  });

  if (bodyData) proxyReq.write(bodyData);
  proxyReq.end();
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Proxy para o gateway
  if (req.url.startsWith("/gateway")) {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => proxyToGateway(req, res, body || null));
    return;
  }

  // Servir arquivos estáticos
  const url = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(__dirname, "public", url);
  const ext = path.extname(filePath);
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".json": "application/json",
  };

  serveFile(res, filePath, mimeTypes[ext] || "text/plain");
});

server.listen(WEB_PORT, () => {
  console.log("");
  console.log("  🦞 PS Claw — Interface Web");
  console.log("  ─────────────────────────────");
  console.log(`  ✅ Rodando em: http://localhost:${WEB_PORT}`);
  console.log(`  🔗 Gateway:   http://localhost:${GATEWAY_PORT}`);
  console.log("");
  console.log("  Abra o navegador em: http://localhost:3000");
  console.log("");
});
