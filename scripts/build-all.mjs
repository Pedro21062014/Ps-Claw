#!/usr/bin/env node

/**
 * PS Claw — Build Script
 * Gera dist/ com entry.js (CLI interativa) e web-ui
 */

import { existsSync, mkdirSync, cpSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

console.log("PS Claw — Build\n");

// Criar dist/
if (!existsSync(path.join(root, "dist"))) {
  mkdirSync(path.join(root, "dist"), { recursive: true });
}

// Copiar web-ui para dist
console.log("  Copiando web-ui...");
const webUiSrc = path.join(root, "web-ui");
const webUiDest = path.join(root, "dist", "web-ui");
if (existsSync(webUiSrc)) {
  cpSync(webUiSrc, webUiDest, { recursive: true });
}

// Copiar entry.js (ja existe no dist/)
console.log("  Copiando entry.js...");
if (existsSync(path.join(root, "dist", "entry.js"))) {
  copyFileSync(path.join(root, "dist", "entry.js"), path.join(root, "dist", "entry.mjs"));
} else {
  console.error("  Erro: dist/entry.js nao encontrado!");
  console.error("  Certifique-se de que dist/entry.js existe antes do build.");
  process.exit(1);
}

console.log("\n  Build concluido!");
console.log("");
console.log("  Para usar:");
console.log("    ps-claw              # CLI interativa");
console.log("    ps-claw chat         # Chat com a IA");
console.log("    ps-claw web          # Interface web");
console.log("    ps-claw --help       # Ajuda");
