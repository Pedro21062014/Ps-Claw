#!/usr/bin/env node

/**
 * PS Claw — Servidor Web
 * - Servidor estático para a interface (public/)
 * - Proxy genérico para APIs externas (evita CORS)
 * - Endpoints de Loja (Claw Hub) com instalação 1-clique
 * - Endpoints de integração Browser Use
 */

import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, spawnSync, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_PORT = process.env.PS_CLAW_WEB_PORT || 3000;

const CONFIG_DIR  = path.join(os.homedir(), ".ps-claw");
const PLUGINS_DIR = path.join(CONFIG_DIR, "plugins");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function ensureDir(d) {
  try { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); } catch {}
}
ensureDir(CONFIG_DIR);
ensureDir(PLUGINS_DIR);

function loadInstalledPlugins() {
  try {
    const idx = path.join(PLUGINS_DIR, "installed.json");
    if (!fs.existsSync(idx)) return [];
    return JSON.parse(fs.readFileSync(idx, "utf8") || "[]");
  } catch { return []; }
}
function saveInstalledPlugins(list) {
  ensureDir(PLUGINS_DIR);
  fs.writeFileSync(path.join(PLUGINS_DIR, "installed.json"), JSON.stringify(list, null, 2));
}

// ─── Catálogo Claw Hub (curado) ────────────────────────────────────────────
const CLAW_HUB_CATALOG = [
  // ── Categoria: Browser & Automação ──
  { id:"browser-use",     name:"Browser Use",          category:"Automação",   icon:"🌐", rating:4.9, downloads:"48k", featured:true,
    desc:"Controle de navegador por IA. A IA abre sites, clica, preenche formulários e extrai dados.",
    install:{type:"pip", pkg:"browser-use"}, homepage:"https://github.com/browser-use/browser-use" },
  { id:"playwright-mcp",  name:"Playwright MCP",       category:"Automação",   icon:"🎭", rating:4.8, downloads:"32k", featured:true,
    desc:"Model Context Provider para Playwright — automação de browser headless via LLM.",
    install:{type:"npm", pkg:"@playwright/mcp"}, homepage:"https://github.com/microsoft/playwright-mcp" },
  { id:"puppeteer-mcp",   name:"Puppeteer MCP",        category:"Automação",   icon:"🪄", rating:4.6, downloads:"21k",
    desc:"Automação de Chrome/Chromium via MCP para tarefas de scraping e RPA.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-puppeteer"}, homepage:"https://github.com/modelcontextprotocol/servers" },

  // ── Categoria: Memória & Conhecimento ──
  { id:"memory-mcp",      name:"Memory Server",        category:"Memória",     icon:"🧠", rating:4.7, downloads:"56k", featured:true,
    desc:"Memória persistente entre sessões via grafo de conhecimento.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-memory"}, homepage:"https://github.com/modelcontextprotocol/servers" },
  { id:"sqlite-mcp",      name:"SQLite Database",      category:"Memória",     icon:"💾", rating:4.5, downloads:"18k",
    desc:"Acesso a banco SQLite local para guardar logs, transcrições e dados estruturados.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-sqlite"}, homepage:"https://github.com/modelcontextprotocol/servers" },
  { id:"chroma-mcp",      name:"Chroma Vector DB",     category:"Memória",     icon:"🔍", rating:4.4, downloads:"9k",
    desc:"Banco vetorial Chroma para RAG e embeddings semânticos.",
    install:{type:"pip", pkg:"chromadb"}, homepage:"https://github.com/chroma-core/chroma" },

  // ── Categoria: Documentos ──
  { id:"filesystem-mcp",  name:"Filesystem",           category:"Documentos",  icon:"📁", rating:4.9, downloads:"72k", featured:true,
    desc:"Leitura/escrita de arquivos controlada. Define pastas permitidas.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-filesystem"}, homepage:"https://github.com/modelcontextprotocol/servers" },
  { id:"github-mcp",      name:"GitHub",               category:"Documentos",  icon:"🐙", rating:4.8, downloads:"61k", featured:true,
    desc:"Acesse repositórios, issues, PRs e commits do GitHub direto do agente.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-github"}, homepage:"https://github.com/modelcontextprotocol/servers" },
  { id:"gitlab-mcp",      name:"GitLab",               category:"Documentos",  icon:"🦊", rating:4.3, downloads:"8k",
    desc:"Integração com GitLab — merge requests, pipelines e issues.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-gitlab"}, homepage:"https://github.com/modelcontextprotocol/servers" },
  { id:"notion-mcp",      name:"Notion",               category:"Documentos",  icon:"📝", rating:4.5, downloads:"27k",
    desc:"Acesse e crie páginas no Notion. Requer token de integração.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-notion"}, homepage:"https://github.com/modelcontextprotocol/servers" },

  // ── Categoria: Busca & Web ──
  { id:"brave-search",    name:"Brave Search",         category:"Busca",       icon:"🦁", rating:4.6, downloads:"34k", featured:true,
    desc:"Busca na web privada via Brave Search API. Requer API key gratuita.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-brave-search"}, homepage:"https://brave.com/search/api/" },
  { id:"fetch-mcp",       name:"Fetch Web",            category:"Busca",       icon:"🌐", rating:4.4, downloads:"22k",
    desc:"Busca e extrai conteúdo de qualquer URL — Markdown automático.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-fetch"}, homepage:"https://github.com/modelcontextprotocol/servers" },
  { id:"tavily-mcp",      name:"Tavily AI Search",     category:"Busca",       icon:"🔎", rating:4.5, downloads:"14k",
    desc:"Busca semântica com IA otimizada para agentes. Requer API key.",
    install:{type:"pip", pkg:"tavily-python"}, homepage:"https://tavily.com" },

  // ── Categoria: Produtividade ──
  { id:"google-drive",    name:"Google Drive",         category:"Produtividade",icon:"📁", rating:4.2, downloads:"19k",
    desc:"Acesse arquivos do Google Drive via OAuth.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-google-drive"}, homepage:"https://github.com/modelcontextprotocol/servers" },
  { id:"slack-mcp",       name:"Slack",                category:"Produtividade",icon:"💬", rating:4.4, downloads:"16k",
    desc:"Envie e leia mensagens no Slack. Requer token de bot.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-slack"}, homepage:"https://github.com/modelcontextprotocol/servers" },
  { id:"gmail-mcp",       name:"Gmail",                category:"Produtividade",icon:"✉️", rating:4.1, downloads:"23k",
    desc:"Leia e envie emails do Gmail via OAuth.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-gmail"}, homepage:"https://github.com/modelcontextprotocol/servers" },

  // ── Categoria: DevOps ──
  { id:"docker-mcp",      name:"Docker",               category:"DevOps",      icon:"🐳", rating:4.6, downloads:"12k",
    desc:"Gerencie containers, imagens e volumes do Docker.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-docker"}, homepage:"https://github.com/modelcontextprotocol/servers" },
  { id:"postgres-mcp",    name:"PostgreSQL",           category:"DevOps",      icon:"🐘", rating:4.5, downloads:"15k",
    desc:"Conexão com banco PostgreSQL para consultas e DDL.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-postgres"}, homepage:"https://github.com/modelcontextprotocol/servers" },

  // ── Categoria: IA & Modelos ──
  { id:"ollama-mcp",      name:"Ollama Local",         category:"IA",          icon:"🦙", rating:4.7, downloads:"41k", featured:true,
    desc:"Rode modelos locais (Llama, Mistral, Phi) via Ollama — sem custo de API.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-ollama"}, homepage:"https://ollama.com" },
  { id:"openrouter",      name:"OpenRouter Gateway",   category:"IA",          icon:"🔀", rating:4.4, downloads:"18k",
    desc:"Acesso unificado a 100+ modelos via OpenRouter.",
    install:{type:"npm", pkg:"@openrouter/ai-sdk-provider"}, homepage:"https://openrouter.ai" },
  { id:"lm-studio",       name:"LM Studio",            category:"IA",          icon:"🖥️", rating:4.5, downloads:"11k",
    desc:"Servidor de inferência local compatível com OpenAI API.",
    install:{type:"manual", cmd:"Baixe em https://lmstudio.ai"}, homepage:"https://lmstudio.ai" },

  // ── Categoria: Mídia ──
  { id:"whisper",         name:"Whisper Transcribe",   category:"Mídia",       icon:"🎙️", rating:4.8, downloads:"28k",
    desc:"Transcrição de áudio/vídeo via Whisper local ou API.",
    install:{type:"pip", pkg:"openai-whisper"}, homepage:"https://github.com/openai/whisper" },
  { id:"yt-mcp",          name:"YouTube",              category:"Mídia",       icon:"📺", rating:4.3, downloads:"9k",
    desc:"Busca e metadados do YouTube via API.",
    install:{type:"npm", pkg:"@modelcontextprotocol/server-youtube"}, homepage:"https://github.com/modelcontextprotocol/servers" },

  // ── Categoria: Skills PS Claw ──
  { id:"skill-coder",     name:"Skill: Coder Pro",     category:"Skills",      icon:"💻", rating:4.9, downloads:"37k", featured:true,
    desc:"Skill especializada em escrever, refatorar e debugar código.",
    install:{type:"ps-skill", pkg:"coder-pro"}, homepage:"https://github.com/Pedro21062014/Ps-Claw" },
  { id:"skill-writer",    name:"Skill: Writer",        category:"Skills",      icon:"✍️", rating:4.7, downloads:"24k",
    desc:"Skill para criar textos, emails e documentos profissionais.",
    install:{type:"ps-skill", pkg:"writer"}, homepage:"https://github.com/Pedro21062014/Ps-Claw" },
  { id:"skill-analyst",   name:"Skill: Data Analyst",  category:"Skills",      icon:"📊", rating:4.8, downloads:"19k", featured:true,
    desc:"Skill para análise de dados, geração de gráficos e relatórios.",
    install:{type:"ps-skill", pkg:"data-analyst"}, homepage:"https://github.com/Pedro21062014/Ps-Claw" },
  { id:"skill-translator",name:"Skill: Translator",    category:"Skills",      icon:"🌍", rating:4.6, downloads:"14k",
    desc:"Skill multilíngue para tradução técnica e literária.",
    install:{type:"ps-skill", pkg:"translator"}, homepage:"https://github.com/Pedro21062014/Ps-Claw" },
];

function getStoreCatalog() {
  const installed = loadInstalledPlugins();
  const installedIds = new Set(installed.map(p => p.id));
  return {
    categories: [...new Set(CLAW_HUB_CATALOG.map(p => p.category))],
    plugins: CLAW_HUB_CATALOG.map(p => ({ ...p, installed: installedIds.has(p.id) })),
    featured: CLAW_HUB_CATALOG.filter(p => p.featured).map(p => ({ ...p, installed: installedIds.has(p.id) })),
  };
}

// ─── Instalação de plugins ─────────────────────────────────────────────────
function runCmd(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    try {
      const proc = spawn(cmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        ...opts,
      });
      let out = '', err = '';
      proc.stdout.on('data', d => out += d.toString());
      proc.stderr.on('data', d => err += d.toString());
      proc.on('error', e => resolve({ ok: false, error: e.message, stdout: out, stderr: err }));
      proc.on('exit', code => resolve({ ok: code === 0, code, stdout: out, stderr: err }));
    } catch (e) {
      resolve({ ok: false, error: e.message, stdout: '', stderr: '' });
    }
  });
}

function which(cmd) {
  try {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' });
    return r.status === 0 && r.stdout.trim();
  } catch { return false; }
}

async function installPlugin(plugin) {
  const inst = plugin.install || {};
  let result = { ok: false, message: 'Tipo de instalação desconhecido' };

  if (inst.type === 'npm') {
    const npmBin = which('npm');
    if (!npmBin) {
      return { ok: false, message: 'npm não encontrado. Instale o Node.js: https://nodejs.org' };
    }
    const r = await runCmd(npmBin, ['install', '-g', inst.pkg]);
    result = r.ok
      ? { ok: true, message: `${plugin.name} instalado via npm` }
      : { ok: false, message: `npm falhou: ${(r.stderr || r.error || '').slice(0, 300)}` };
  } else if (inst.type === 'pip') {
    const pipBin = which('pip') || which('pip3') || which('python3');
    if (!pipBin) {
      return { ok: false, message: 'pip não encontrado. Instale Python: https://python.org' };
    }
    const args = (which('pip') || which('pip3')) ? ['install', '--user', inst.pkg] : ['-m', 'pip', 'install', '--user', inst.pkg];
    const r = await runCmd(pipBin, args);
    result = r.ok
      ? { ok: true, message: `${plugin.name} instalado via pip` }
      : { ok: false, message: `pip falhou: ${(r.stderr || r.error || '').slice(0, 300)}` };
  } else if (inst.type === 'ps-skill') {
    // Skill do PS Claw: cria um arquivo .md em ~/.ps-claw/skills/
    const skillsDir = path.join(CONFIG_DIR, 'skills');
    ensureDir(skillsDir);
    const skillFile = path.join(skillsDir, `${inst.pkg}.md`);
    const body = `# Skill: ${plugin.name}

${plugin.desc}

## Como usar
Esta skill é carregada automaticamente pelo PS Claw quando instalada.
Use o comando \`/skill ${inst.pkg}\` no chat para ativar.

## Fonte
${plugin.homepage || 'https://github.com/Pedro21062014/Ps-Claw'}
`;
    try {
      fs.writeFileSync(skillFile, body);
      result = { ok: true, message: `Skill salva em ${skillFile}` };
    } catch (e) {
      result = { ok: false, message: `Erro ao salvar skill: ${e.message}` };
    }
  } else if (inst.type === 'manual') {
    result = { ok: false, message: `Instalação manual necessária: ${inst.cmd || plugin.homepage}` };
  }

  // registra como instalado
  if (result.ok) {
    const list = loadInstalledPlugins();
    if (!list.find(p => p.id === plugin.id)) {
      list.push({ id: plugin.id, name: plugin.name, installedAt: new Date().toISOString(), type: inst.type, pkg: inst.pkg });
      saveInstalledPlugins(list);
    }
  }
  return result;
}

async function uninstallPlugin(plugin) {
  const inst = plugin.install || {};
  let result = { ok: true, message: 'Removido do registro local' };
  if (inst.type === 'npm') {
    const npmBin = which('npm');
    if (npmBin) {
      const r = await runCmd(npmBin, ['uninstall', '-g', inst.pkg]);
      result = r.ok ? { ok: true, message: 'Desinstalado via npm' } : { ok: false, message: 'npm falhou (removido do registro)' };
    }
  } else if (inst.type === 'pip') {
    const pipBin = which('pip') || which('pip3');
    if (pipBin) {
      const r = await runCmd(pipBin, ['uninstall', '-y', inst.pkg]);
      result = r.ok ? { ok: true, message: 'Desinstalado via pip' } : { ok: false, message: 'pip falhou (removido do registro)' };
    }
  } else if (inst.type === 'ps-skill') {
    try {
      const f = path.join(CONFIG_DIR, 'skills', `${inst.pkg}.md`);
      if (fs.existsSync(f)) fs.unlinkSync(f);
      result = { ok: true, message: 'Skill removida' };
    } catch (e) { result = { ok: false, message: e.message }; }
  }
  // remove do registro
  const list = loadInstalledPlugins().filter(p => p.id !== plugin.id);
  saveInstalledPlugins(list);
  return result;
}

// ─── Browser Use integration ───────────────────────────────────────────────
async function browserUseStatus() {
  const py = which('python3') || which('python');
  const pip = which('pip') || which('pip3');
  if (!py) {
    return { installed: false, ready: false, message: 'Python não encontrado. Instale em https://python.org' };
  }
  // checa se browser-use está instalado
  const r = spawnSync(py, ['-c', 'import browser_use; print(browser_use.__version__)'], { encoding: 'utf8' });
  if (r.status === 0) {
    return {
      installed: true,
      ready: true,
      version: r.stdout.trim(),
      python: py,
      message: `browser-use ${r.stdout.trim()} pronto`,
    };
  }
  return {
    installed: false,
    ready: !!pip,
    message: 'browser-use não instalado. Clique em "Instalar Browser Use".',
    python: py,
  };
}

async function browserUseInstall() {
  const pip = which('pip') || which('pip3');
  if (!pip) {
    return { ok: false, message: 'pip não encontrado. Instale Python primeiro.' };
  }
  const r = await runCmd(pip, ['install', '--user', 'browser-use', 'playwright']);
  if (!r.ok) {
    return { ok: false, message: `pip falhou: ${(r.stderr || '').slice(0, 300)}` };
  }
  // instala browsers do playwright
  const py = which('python3') || which('python');
  if (py) {
    await runCmd(py, ['-m', 'playwright', 'install', 'chromium']);
  }
  return { ok: true, message: 'browser-use instalado. Agora você pode rodar tarefas de browser.' };
}

async function browserUseRun(task, url, cfg) {
  const status = await browserUseStatus();
  if (!status.ready) {
    return { ok: false, message: status.message };
  }
  const py = status.python;
  // script python embutido que usa browser-use
  const script = `
import asyncio
import sys
try:
    from browser_use import Agent
    from langchain_openai import ChatOpenAI
except ImportError as e:
    print("ERR_DEP:" + str(e))
    sys.exit(2)

async def main():
    llm = ChatOpenAI(model="${cfg.model || 'gpt-4o'}", api_key="${cfg.keys?.openai || ''}")
    agent = Agent(task="""${(task || '').replace(/"/g, '\\"').replace(/\n/g, ' ')}""", llm=llm${url ? `, initial_url="${url}"` : ''})
    result = await agent.run()
    print("RESULT:")
    print(result)

asyncio.run(main())
`.trim();
  const tmpFile = path.join(os.tmpdir(), `ps-claw-bu-${Date.now()}.py`);
  try {
    fs.writeFileSync(tmpFile, script);
  } catch (e) {
    return { ok: false, message: `Falha ao criar script: ${e.message}` };
  }
  const r = await runCmd(py, [tmpFile], { timeout: 120000 });
  try { fs.unlinkSync(tmpFile); } catch {}
  if (!r.ok) {
    return { ok: false, message: `Erro: ${(r.stderr || r.error || '').slice(0, 500)}` };
  }
  const out = r.stdout || '';
  const idx = out.indexOf('RESULT:');
  return { ok: true, message: idx >= 0 ? out.slice(idx + 7).trim() : out };
}

// ─── Carrega config para o endpoint de browser-use ─────────────────────────
function loadWebCfg() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { keys: {}, model: null };
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8") || "{}");
  } catch { return { keys: {}, model: null }; }
}

// ─── Proxy genérico para APIs externas ─────────────────────────────────────
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

function sendJson(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', () => {
      try { resolve(JSON.parse(b || '{}')); }
      catch { resolve({}); }
    });
  });
}

// ─── Server ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, anthropic-version");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost`);
  const pathname = url.pathname;

  // ── /proxy?url=... ──
  if (pathname === "/proxy") {
    const target = url.searchParams.get("url");
    if (!target) { res.writeHead(400); res.end("Missing url param"); return; }
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => proxyRequest(target, req.method, req.headers, body, res));
    return;
  }

  // ── /api/store (GET catalog) ──
  if (pathname === "/api/store" && req.method === "GET") {
    return sendJson(res, 200, getStoreCatalog());
  }

  // ── /api/store/installed (GET) ──
  if (pathname === "/api/store/installed" && req.method === "GET") {
    return sendJson(res, 200, { plugins: loadInstalledPlugins() });
  }

  // ── /api/store/install (POST) ──
  if (pathname === "/api/store/install" && req.method === "POST") {
    const body = await readBody(req);
    const plugin = CLAW_HUB_CATALOG.find(p => p.id === body.id);
    if (!plugin) return sendJson(res, 404, { ok: false, message: 'Plugin não encontrado' });
    const result = await installPlugin(plugin);
    return sendJson(res, result.ok ? 200 : 500, result);
  }

  // ── /api/store/uninstall (POST) ──
  if (pathname === "/api/store/uninstall" && req.method === "POST") {
    const body = await readBody(req);
    const plugin = CLAW_HUB_CATALOG.find(p => p.id === body.id);
    if (!plugin) return sendJson(res, 404, { ok: false, message: 'Plugin não encontrado' });
    const result = await uninstallPlugin(plugin);
    return sendJson(res, 200, result);
  }

  // ── /api/browser-use/status (GET) ──
  if (pathname === "/api/browser-use/status" && req.method === "GET") {
    const s = await browserUseStatus();
    return sendJson(res, 200, s);
  }

  // ── /api/browser-use/install (POST) ──
  if (pathname === "/api/browser-use/install" && req.method === "POST") {
    const r = await browserUseInstall();
    return sendJson(res, r.ok ? 200 : 500, r);
  }

  // ── /api/browser-use/run (POST) ──
  if (pathname === "/api/browser-use/run" && req.method === "POST") {
    const body = await readBody(req);
    if (!body.task) return sendJson(res, 400, { ok: false, message: 'task é obrigatória' });
    const cfg = loadWebCfg();
    if (!cfg.keys?.openai) {
      return sendJson(res, 400, { ok: false, message: 'Configure sua API key da OpenAI (necessária para browser-use) na aba API Keys ou rode npx ps-claw quickstart.' });
    }
    const r = await browserUseRun(body.task, body.url, cfg);
    return sendJson(res, r.ok ? 200 : 500, r);
  }

  // ── /api/quickstart (POST: salva config do dashboard) ──
  if (pathname === "/api/config" && req.method === "GET") {
    return sendJson(res, 200, loadWebCfg());
  }

  // ── Arquivos estáticos ──
  const filePath = pathname === "/" ? "/index.html" : pathname;
  const fullPath = path.join(__dirname, "public", filePath);
  if (!fullPath.startsWith(path.join(__dirname, "public"))) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  const ext = path.extname(fullPath);
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
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
  console.log("  🛒 Loja Claw Hub disponível na aba 'Loja'");
  console.log("  🌐 Integração Browser Use disponível na aba 'Browser'");
  console.log("");
});
