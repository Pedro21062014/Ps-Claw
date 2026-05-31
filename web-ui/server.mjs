#!/usr/bin/env node

/**
 * PS Claw — Interface Web
 * Servidor leve que serve a UI e faz proxy para o gateway do PS Claw
 * Suporta multiplos gateways, API de modelos e configuracoes
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

function proxyToGateway(req, res, bodyData, targetHost, targetPort, targetPath, authToken) {
  const options = {
    hostname: targetHost,
    port: targetPort,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${targetHost}:${targetPort}`,
      ...(authToken && { authorization: `Bearer ${authToken}` }),
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", () => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Gateway do PS Claw nao esta rodando. Execute: ps-claw gateway run" }));
  });

  if (bodyData) proxyReq.write(bodyData);
  proxyReq.end();
}

function parseUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? "443" : "80"),
      path: parsed.pathname + parsed.search,
    };
  } catch {
    return null;
  }
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Proxy para o gateway local (padrao)
  if (req.url.startsWith("/gateway")) {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => proxyToGateway(
      req, res, body || null,
      "127.0.0.1", GATEWAY_PORT,
      req.url.replace("/gateway", ""),
      GATEWAY_TOKEN
    ));
    return;
  }

  // API: Health check do gateway local
  if (req.url === "/api/health" && req.method === "GET") {
    const healthReq = http.request({
      hostname: "127.0.0.1",
      port: GATEWAY_PORT,
      path: "/health",
      method: "GET",
      ...(GATEWAY_TOKEN && { headers: { authorization: `Bearer ${GATEWAY_TOKEN}` } }),
    }, (healthRes) => {
      let data = "";
      healthRes.on("data", chunk => data += chunk);
      healthRes.on("end", () => {
        res.writeHead(healthRes.statusCode, { "Content-Type": "application/json" });
        res.end(data);
      });
    });
    healthReq.on("error", () => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "offline", error: "Gateway offline" }));
    });
    healthReq.end();
    return;
  }

  // API: Listar modelos disponiveis
  if (req.url === "/api/models" && req.method === "GET") {
    const models = [
      { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai" },
      { id: "claude-opus-4-5", name: "Claude Opus 4.5", provider: "anthropic" },
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "anthropic" },
      { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "anthropic" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google" },
      { id: "deepseek-chat", name: "DeepSeek Chat", provider: "deepseek" },
    ];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ models }));
    return;
  }

  // API: Proxy para gateway remoto
  if (req.url.startsWith("/api/proxy") && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { url: targetUrl, path: targetPath, token, method, body: reqBody } = JSON.parse(body);
        const parsed = parseUrl(targetUrl);
        if (!parsed) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "URL invalida" }));
          return;
        }
        proxyToGateway(
          { method: method || "GET", headers: {} },
          res, reqBody ? JSON.stringify(reqBody) : null,
          parsed.hostname, parsed.port,
          targetPath || parsed.path,
          token
        );
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Requisicao invalida" }));
      }
    });
    return;
  }

  // Servir arquivos estaticos
  const url = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(__dirname, "public", url);
  const ext = path.extname(filePath);
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".json": "application/json",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
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
  console.log("  Abra o navegador em: http://localhost:" + WEB_PORT);
  console.log("");
});
