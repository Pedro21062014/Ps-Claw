#!/usr/bin/env node

/**
 * PS Claw CLI — standalone, sem dependência do dist/
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const cmd  = args[0] || "help";

const C = {
  reset:  "\x1b[0m",
  green:  "\x1b[32m",
  cyan:   "\x1b[36m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
};

function banner() {
  console.log(`
${C.cyan}${C.bold}  ██████╗ ███████╗     ██████╗██╗      █████╗ ██╗    ██╗${C.reset}
${C.cyan}${C.bold}  ██╔══██╗██╔════╝    ██╔════╝██║     ██╔══██╗██║    ██║${C.reset}
${C.cyan}${C.bold}  ██████╔╝███████╗    ██║     ██║     ███████║██║ █╗ ██║${C.reset}
${C.cyan}${C.bold}  ██╔═══╝ ╚════██║    ██║     ██║     ██╔══██║██║███╗██║${C.reset}
${C.cyan}${C.bold}  ██║     ███████║    ╚██████╗███████╗██║  ██║╚███╔███╔╝${C.reset}
${C.cyan}${C.bold}  ╚═╝     ╚══════╝     ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝${C.reset}
  ${C.dim}v1.0.8 — Lightweight AI Agent Gateway${C.reset}
`);
}

function help() {
  banner();
  console.log(`  ${C.bold}Comandos:${C.reset}

  ${C.green}npx ps-claw web${C.reset}       Abre a interface web em http://localhost:3000
  ${C.green}npx ps-claw start${C.reset}     Inicia o agente PS Claw
  ${C.green}npx ps-claw all${C.reset}       Inicia tudo junto
  ${C.green}npx ps-claw update${C.reset}    Atualiza o PS Claw
  ${C.green}npx ps-claw help${C.reset}      Esta mensagem

  ${C.bold}Interface web:${C.reset} http://localhost:3000
`);
}

function startWeb() {
  const srv = path.join(__dirname, "web-ui", "server.mjs");
  if (!existsSync(srv)) {
    console.error(`${C.red}❌ web-ui/server.mjs não encontrado!${C.reset}`);
    process.exit(1);
  }
  console.log(`${C.green}🌐 Iniciando Interface Web...${C.reset}`);
  console.log(`${C.cyan}   Acesse: http://localhost:3000${C.reset}\n`);
  const proc = spawn(process.execPath, [srv], { stdio: "inherit" });
  proc.on("exit", code => process.exit(code ?? 0));
}

function startAgent() {
  // Usa o ps-claw.mjs original do OpenClaw se existir e tiver dist/
  // Caso contrário, avisa o usuário e abre a web
  const distEntry = path.join(__dirname, "dist", "entry.mjs");
  const distEntryJs = path.join(__dirname, "dist", "entry.js");

  if (!existsSync(distEntry) && !existsSync(distEntryJs)) {
    console.log(`${C.yellow}⚠️  O agente requer configuração adicional (dist/).${C.reset}`);
    console.log(`${C.dim}   Para usar a interface web, execute: npx ps-claw web${C.reset}\n`);
    console.log(`${C.green}🌐 Iniciando Interface Web automaticamente...${C.reset}`);
    console.log(`${C.cyan}   Acesse: http://localhost:3000${C.reset}\n`);
    startWeb();
    return;
  }

  console.log(`${C.green}🦞 Iniciando PS Claw Agent...${C.reset}`);
  const proc = spawn(process.execPath, [path.join(__dirname, "ps-claw.mjs"), ...args.slice(1)], { stdio: "inherit" });
  proc.on("exit", code => process.exit(code ?? 0));
}

function startAll() {
  banner();
  startWeb();
}

function update() {
  console.log(`${C.yellow}🔄 Atualizando PS Claw...${C.reset}\n`);
  const proc = spawn("npm", ["install", "-g", "ps-claw@latest"], { stdio: "inherit", shell: true });
  proc.on("exit", code => {
    if (code === 0) console.log(`\n${C.green}✅ PS Claw atualizado!${C.reset}`);
    process.exit(code ?? 0);
  });
}

switch (cmd) {
  case "start":  startAgent(); break;
  case "web":    startWeb();   break;
  case "all":    startAll();   break;
  case "update": update();     break;
  default:       help();       break;
}
