#!/usr/bin/env node

/**
 * PS Claw CLI — ponto de entrada global
 * Uso: ps-claw [comando]
 * Comandos: start | web | all | update | help
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
  ${C.dim}v1.0.0 — Lightweight AI Agent Gateway${C.reset}
`);
}

function help() {
  banner();
  console.log(`  ${C.bold}Comandos:${C.reset}

  ${C.green}ps-claw start${C.reset}       Inicia o agente PS Claw
  ${C.green}ps-claw web${C.reset}         Inicia a interface web em http://localhost:3000
  ${C.green}ps-claw all${C.reset}         Inicia o agente + interface web juntos
  ${C.green}ps-claw update${C.reset}      Atualiza o PS Claw
  ${C.green}ps-claw help${C.reset}        Esta mensagem

  ${C.bold}Início rápido:${C.reset}

  ${C.dim}# Via npm (global)${C.reset}
  npm install -g ps-claw
  ps-claw all

  ${C.dim}# Via git clone${C.reset}
  git clone https://github.com/Pedro21062014/ps-claw-v2.git
  cd ps-claw-v2 && npm install
  ps-claw all

  ${C.bold}Interface web:${C.reset} http://localhost:3000
`);
}

function run(file, extraArgs = []) {
  if (!existsSync(file)) {
    console.error(`${C.red}❌ Arquivo não encontrado: ${file}${C.reset}`);
    process.exit(1);
  }
  const proc = spawn(process.execPath, [file, ...extraArgs], { stdio: "inherit" });
  proc.on("exit", code => process.exit(code ?? 0));
  return proc;
}

function startAgent() {
  console.log(`${C.green}🦞 Iniciando PS Claw Agent...${C.reset}`);
  run(path.join(__dirname, "ps-claw.mjs"), args.slice(1));
}

function startWeb() {
  const srv = path.join(__dirname, "web-ui", "server.mjs");
  console.log(`${C.green}🌐 Interface Web → http://localhost:3000${C.reset}`);
  run(srv);
}

function startAll() {
  banner();
  const agentFile = path.join(__dirname, "ps-claw.mjs");
  const webFile   = path.join(__dirname, "web-ui", "server.mjs");

  console.log(`${C.green}🦞 Iniciando PS Claw Agent...${C.reset}`);
  const agent = spawn(process.execPath, [agentFile], { stdio: "inherit" });

  setTimeout(() => {
    if (existsSync(webFile)) {
      console.log(`\n${C.cyan}🌐 Iniciando Interface Web → http://localhost:3000${C.reset}\n`);
      const web = spawn(process.execPath, [webFile], { stdio: "inherit" });
      web.on("exit", code => process.exit(code ?? 0));
    }
  }, 1500);

  agent.on("exit", code => process.exit(code ?? 0));
  process.on("SIGINT", () => { agent.kill(); process.exit(0); });
}

function update() {
  banner();
  const script = path.join(__dirname, "update.sh");
  console.log(`${C.yellow}🔄 Verificando atualizações...${C.reset}\n`);
  if (!existsSync(script)) {
    console.log(`${C.yellow}Baixando versão mais recente...${C.reset}`);
    run("git", ["pull"]);
    return;
  }
  const proc = spawn("bash", [script], { stdio: "inherit" });
  proc.on("exit", code => process.exit(code ?? 0));
}

switch (cmd) {
  case "start":  startAgent(); break;
  case "web":    startWeb();   break;
  case "all":    startAll();   break;
  case "update": update();     break;
  default:       help();       break;
}
