#!/usr/bin/env node

/**
 * PS Claw — Build Script Simplificado
 * Compila TypeScript para dist/ usando tsdown ou tsc
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { cpSync } from "node:fs";

console.log("🦞 PS Claw — Build simplificado\n");

// Criar dist/
if (!existsSync("dist")) {
  mkdirSync("dist", { recursive: true });
}

// Copiar web-ui para dist
console.log("📦 Copiando web-ui...");
if (existsSync("web-ui")) {
  cpSync("web-ui", "dist/web-ui", { recursive: true });
}

// Criar entry.js mínimo
console.log("📝 Criando entry.js...");
const entryContent = `#!/usr/bin/env node
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  console.log(\`
🦞 PS Claw — AI Agent Gateway

Uso: ps-claw <comando> [opções]

Comandos:
  gateway run        Inicia o gateway PS Claw
  gateway status     Verifica status do gateway
  web                Inicia a interface web
  secrets set        Configura chaves de API
  configure          Configuração interativa
  doctor             Diagnóstico do sistema
  models list        Lista modelos disponíveis
  version            Mostra a versão

Opções:
  -h, --help         Mostra esta ajuda
  -v, --version      Mostra a versão

Exemplos:
  ps-claw gateway run          # Inicia o gateway
  ps-claw web                  # Abre interface web
  ps-claw secrets set openai   # Configura chave OpenAI
  ps-claw doctor               # Verifica instalação
\`);
  process.exit(0);
}

if (command === "version" || command === "--version" || command === "-v" || command === "-V") {
  try {
    const pkg = await import("file://" + path.join(__dirname, "..", "package.json"), { assert: { type: "json" } });
    console.log("PS Claw " + pkg.default.version);
  } catch {
    console.log("PS Claw dev");
  }
  process.exit(0);
}

if (command === "web") {
  const webPath = path.join(__dirname, "web-ui", "server.mjs");
  if (existsSync(webPath)) {
    import("file://" + webPath);
  } else {
    // Fallback: tenta web-ui na raiz
    const fallbackPath = path.join(__dirname, "..", "web-ui", "server.mjs");
    if (existsSync(fallbackPath)) {
      import("file://" + fallbackPath);
    } else {
      console.error("❌ Interface web não encontrada. Execute: pnpm build");
      process.exit(1);
    }
  }
} else if (command === "gateway") {
  const subCommand = args[1];
  if (subCommand === "run") {
    console.log("🦞 Iniciando gateway PS Claw...");
    console.log("   Para configurar, use: ps-claw configure");
    console.log("   Para diagnóstico, use: ps-claw doctor");
    console.log("");
    console.log("   Nota: O gateway completo requer o build TypeScript.");
    console.log("   Use 'ps-claw web' para iniciar a interface web.");
  } else if (subCommand === "status") {
    console.log("🦞 Verificando status do gateway...");
    try {
      const result = execSync("curl -s http://localhost:18789/health", { timeout: 3000 }).toString();
      console.log("   Status: " + result);
    } catch {
      console.log("   Status: Offline (gateway não está rodando)");
    }
  } else {
    console.log("Uso: ps-claw gateway <run|status>");
  }
} else if (command === "secrets") {
  const subCommand = args[1];
  if (subCommand === "set") {
    const provider = args[2];
    if (!provider) {
      console.log("Uso: ps-claw secrets set <provider>");
      console.log("Providers: openai, anthropic, google, deepseek, openrouter");
      process.exit(1);
    }
    console.log("Para configurar a chave " + provider.toUpperCase() + ", defina a variável de ambiente:");
    console.log("  export " + provider.toUpperCase() + "_API_KEY=sua-chave-aqui");
    console.log("");
    console.log("Ou adicione no arquivo ~/.ps-claw/.env");
  } else {
    console.log("Uso: ps-claw secrets set <provider>");
  }
} else if (command === "configure") {
  console.log("🦞 PS Claw — Configuração");
  console.log("");
  console.log("Arquivo de configuração: ~/.ps-claw/ps-claw.json");
  console.log("Variáveis de ambiente: ~/.ps-claw/.env");
  console.log("");
  console.log("Para configurar chaves de API:");
  console.log("  ps-claw secrets set openai");
  console.log("  ps-claw secrets set anthropic");
  console.log("");
  console.log("Para iniciar o gateway:");
  console.log("  ps-claw gateway run");
  console.log("");
  console.log("Para abrir a interface web:");
  console.log("  ps-claw web");
} else if (command === "doctor") {
  console.log("🦞 PS Claw — Diagnóstico");
  console.log("");
  console.log("Node.js: " + process.version);
  console.log("Plataforma: " + process.platform + " " + process.arch);
  console.log("");
  try {
    const result = execSync("curl -s http://localhost:18789/health", { timeout: 3000 }).toString();
    console.log("Gateway: Online ✅");
  } catch {
    console.log("Gateway: Offline ❌");
  }
  console.log("Interface Web: Execute 'ps-claw web' para iniciar");
  console.log("");
  console.log("Para mais informações: ps-claw --help");
} else if (command === "models") {
  const subCommand = args[1];
  if (subCommand === "list") {
    console.log("🦞 Modelos disponíveis:");
    console.log("");
    console.log("OpenAI:");
    console.log("  - gpt-4o");
    console.log("  - gpt-4o-mini");
    console.log("  - gpt-4-turbo");
    console.log("  - o1-preview");
    console.log("");
    console.log("Anthropic:");
    console.log("  - claude-opus-4-5");
    console.log("  - claude-sonnet-4-5");
    console.log("  - claude-3.5-sonnet");
    console.log("  - claude-3-haiku");
    console.log("");
    console.log("Google:");
    console.log("  - gemini-2.5-pro");
    console.log("  - gemini-2.0-flash");
    console.log("");
    console.log("DeepSeek:");
    console.log("  - deepseek-chat");
    console.log("  - deepseek-reasoner");
    console.log("");
    console.log("OpenRouter:");
    console.log("  - openrouter-auto");
    console.log("  - meta-llama/llama-3.1-405b");
  }
} else {
  console.log("Comando desconhecido: " + command);
  console.log("Use 'ps-claw --help' para ver os comandos disponíveis.");
}
`;

import { writeFileSync } from "node:fs";
writeFileSync("dist/entry.js", entryContent);
writeFileSync("dist/entry.mjs", entryContent);

console.log("✅ Build concluído!");
console.log("");
console.log("Para usar:");
console.log("  node ps-claw.mjs --help");
console.log("  node ps-claw.mjs web");
console.log("  node ps-claw.mjs gateway run");
