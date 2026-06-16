#!/usr/bin/env node

/**
 * PS Claw CLI — standalone, sem dependência do dist/
 *
 * Comandos:
 *   npx ps-claw chat       Conversa com a IA direto no terminal
 *   npx ps-claw quickstart Configuração guiada (primeiro uso)
 *   npx ps-claw web        Abre a interface web em http://localhost:3000
 *   npx ps-claw start      Inicia o agente (requer dist/ ou cai pro web)
 *   npx ps-claw all        Inicia tudo
 *   npx ps-claw update     Atualiza o PS Claw
 *   npx ps-claw help       Esta mensagem
 */

import { spawn, execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import https from "node:https";
import http from "node:http";
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
  magenta:"\x1b[35m",
  blue:   "\x1b[34m",
};

// ─── Config ────────────────────────────────────────────────────────────────
const CONFIG_DIR  = path.join(os.homedir(), ".ps-claw");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULT_CFG = {
  version: 1,
  onboarded: false,
  model: null,
  keys: { anthropic:"", openai:"", google:"", mistral:"" },
  cfg: { name:"Você", agent:"PS Claw", sys:"", temp:"0.7", tok:"4096" },
};

function loadCfg() {
  try {
    if (!existsSync(CONFIG_FILE)) return { ...DEFAULT_CFG };
    const raw = readFileSync(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CFG, ...parsed, keys: {...DEFAULT_CFG.keys, ...(parsed.keys||{})}, cfg: {...DEFAULT_CFG.cfg, ...(parsed.cfg||{})} };
  } catch {
    return { ...DEFAULT_CFG };
  }
}

function saveCfg(cfg) {
  try {
    if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
    return true;
  } catch (e) {
    console.error(`${C.red}❌ Não foi possível salvar ${CONFIG_FILE}: ${e.message}${C.reset}`);
    return false;
  }
}

function isFirstUse(cfg) {
  return !cfg.onboarded && !cfg.model && !Object.values(cfg.keys).some(Boolean);
}

// ─── Catálogo de modelos (espelha o da web-ui) ────────────────────────────
const MODELS = [
  { id:'claude-sonnet-4-5',  name:'Claude Sonnet 4.5',  p:'anthropic', desc:'Rápido e inteligente · uso geral' },
  { id:'claude-haiku-4-5',   name:'Claude Haiku 4.5',   p:'anthropic', desc:'Ultra rápido · econômico' },
  { id:'claude-opus-4-5',    name:'Claude Opus 4.5',    p:'anthropic', desc:'Mais poderoso · raciocínio complexo' },
  { id:'gpt-4o',             name:'GPT-4o',             p:'openai',    desc:'Flagship multimodal da OpenAI' },
  { id:'gpt-4o-mini',        name:'GPT-4o mini',        p:'openai',    desc:'Rápido e barato · uso geral' },
  { id:'o3-mini',            name:'o3-mini',            p:'openai',    desc:'Raciocínio avançado · lógica' },
  { id:'gemini-2.5-flash',   name:'Gemini 2.5 Flash',   p:'google',    desc:'Rápido · contexto longo · gratuito' },
  { id:'gemini-1.5-flash',   name:'Gemini 1.5 Flash',   p:'google',    desc:'Estável e confiável · gratuito' },
  { id:'mistral-large-latest', name:'Mistral Large',    p:'mistral',   desc:'Poderoso · multilingual' },
  { id:'mistral-small-latest', name:'Mistral Small',    p:'mistral',   desc:'Rápido · barato' },
];

// ─── HTTP helper ───────────────────────────────────────────────────────────
function httpReq(url, { method='GET', headers={}, body=null, timeout=60000 } = {}) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? https : http;
      const opts = {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method,
        headers: { ...headers, host: u.hostname },
      };
      const req = lib.request(opts, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.setTimeout(timeout, () => { req.destroy(new Error('timeout')); });
      if (body) req.write(body);
      req.end();
    } catch (e) { reject(e); }
  });
}

async function httpJson(url, opts) {
  const r = await httpReq(url, opts);
  try { return { ...r, json: JSON.parse(r.body) }; }
  catch { return { ...r, json: null }; }
}

// ─── Providers ─────────────────────────────────────────────────────────────
async function callAnthropic(model, messages, sys, key, maxTok, temp) {
  const msgs = messages.filter(m=>m.role!=='system').map(m=>({role:m.role,content:m.content}));
  const r = await httpJson('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
    body: JSON.stringify({ model: model.id, max_tokens: maxTok, temperature: temp, system: sys, messages: msgs }),
  });
  if (!r.ok) throw new Error(r.json?.error?.message || `HTTP ${r.status}`);
  return r.json?.content?.[0]?.text || JSON.stringify(r.json);
}

async function callOpenAI(model, messages, sys, key, maxTok, temp, overrideUrl) {
  const url = overrideUrl || 'https://api.openai.com/v1/chat/completions';
  const msgs = [{role:'system',content:sys}, ...messages];
  const r = await httpJson(url, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body: JSON.stringify({ model: model.id, max_tokens: maxTok, temperature: temp, messages: msgs }),
  });
  if (!r.ok) throw new Error(r.json?.error?.message || `HTTP ${r.status}`);
  return r.json?.choices?.[0]?.message?.content || JSON.stringify(r.json);
}

async function callGoogle(model, messages, sys, key, maxTok, temp) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${key}`;
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const r = await httpJson(url, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: sys }] },
      generationConfig: { maxOutputTokens: maxTok, temperature: temp },
    }),
  });
  if (!r.ok) throw new Error(r.json?.error?.message || `HTTP ${r.status}`);
  return r.json?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(r.json);
}

async function callLLM(cfg) {
  const model = MODELS.find(m => m.id === cfg.model);
  if (!model) throw new Error('Nenhum modelo selecionado. Rode `npx ps-claw quickstart`.');
  const key = cfg.keys[model.p];
  if (!key && model.p !== 'local') {
    throw new Error(`API key para ${model.p} não configurada. Rode \`npx ps-claw quickstart\`.`);
  }
  const sys = cfg.cfg.sys || 'Você é a PS Claw, uma assistente de IA inteligente e prestativa. Seja direta, útil e proativa.';
  const temp = parseFloat(cfg.cfg.temp) || 0.7;
  const maxTok = parseInt(cfg.cfg.tok) || 4096;

  const messages = cfg._history || [];
  switch (model.p) {
    case 'anthropic': return await callAnthropic(model, messages, sys, key, maxTok, temp);
    case 'openai':    return await callOpenAI(model, messages, sys, key, maxTok, temp);
    case 'google':    return await callGoogle(model, messages, sys, key, maxTok, temp);
    case 'mistral':   return await callOpenAI(model, messages, sys, key, maxTok, temp, 'https://api.mistral.ai/v1/chat/completions');
    default: throw new Error('Provedor desconhecido: ' + model.p);
  }
}

// ─── Test API key (validação rápida) ────────────────────────────────────────
async function testKey(provider, key) {
  try {
    if (provider === 'anthropic') {
      const r = await httpJson('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } });
      return r.ok;
    }
    if (provider === 'openai') {
      const r = await httpJson('https://api.openai.com/v1/models', { headers: { Authorization: 'Bearer ' + key } });
      return r.ok;
    }
    if (provider === 'google') {
      const r = await httpJson(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      return r.ok;
    }
    if (provider === 'mistral') {
      const r = await httpJson('https://api.mistral.ai/v1/models', { headers: { Authorization: 'Bearer ' + key } });
      return r.ok;
    }
  } catch { return false; }
  return false;
}

// ─── UI helpers ────────────────────────────────────────────────────────────
function banner() {
  console.log(`
${C.cyan}${C.bold}  ██████╗ ███████╗     ██████╗██╗      █████╗ ██╗    ██╗${C.reset}
${C.cyan}${C.bold}  ██╔══██╗██╔════╝    ██╔════╝██║     ██╔══██╗██║    ██║${C.reset}
${C.cyan}${C.bold}  ██████╔╝███████╗    ██║     ██║     ███████║██║ █╗ ██║${C.reset}
${C.cyan}${C.bold}  ██╔═══╝ ╚════██║    ██║     ██║     ██╔══██║██║███╗██║${C.reset}
${C.cyan}${C.bold}  ██║     ███████║    ╚██████╗███████╗██║  ██║╚███╔███╔╝${C.reset}
${C.cyan}${C.bold}  ╚═╝     ╚══════╝     ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝${C.reset}
  ${C.dim}Lightweight AI Agent Gateway${C.reset}
`);
}

function help() {
  banner();
  console.log(`  ${C.bold}Comandos:${C.reset}

  ${C.green}npx ps-claw chat${C.reset}       Conversa com a IA direto no terminal
  ${C.green}npx ps-claw quickstart${C.reset} Configuração guiada no primeiro uso
  ${C.green}npx ps-claw web${C.reset}        Abre a interface web em http://localhost:3000
  ${C.green}npx ps-claw start${C.reset}      Inicia o agente PS Claw (requer dist/)
  ${C.green}npx ps-claw all${C.reset}        Inicia tudo junto
  ${C.green}npx ps-claw update${C.reset}     Atualiza o PS Claw
  ${C.green}npx ps-claw models${C.reset}     Lista modelos disponíveis
  ${C.green}npx ps-claw config${C.reset}     Mostra configuração atual
  ${C.green}npx ps-claw help${C.reset}       Esta mensagem

  ${C.bold}Interface web:${C.reset} http://localhost:3000
  ${C.dim}Config em:${C.reset} ${CONFIG_FILE}
`);
}

function ask(rl, q) { return new Promise(r => rl.question(q, a => r(a.trim()))) }
function askHidden(rl, q) {
  // fallback simples sem esconde-senha nativa — apenas ecoa como pontos
  return new Promise(r => rl.question(q, a => r(a.trim())))
}

// ─── Quickstart (onboarding no primeiro uso) ───────────────────────────────
async function quickstart() {
  banner();
  const cfg = loadCfg();

  console.log(`${C.bold}${C.magenta}🚀 Quickstart — PS Claw${C.reset}
  Vamos configurar tudo em menos de 1 minuto. Você só precisa de ${C.bold}uma${C.reset} API key.

  ${C.dim}Recomendado:${C.reset} ${C.green}Google Gemini${C.reset} (grátis para sempre)
  ${C.dim}Alternativas:${C.reset} Anthropic Claude · OpenAI GPT-4o · Mistral

  Obtenha sua chave gratuita em:
    ${C.cyan}https://aistudio.google.com/apikey${C.reset}        (Google Gemini — recomendado)
    ${C.cyan}https://console.anthropic.com/api-keys${C.reset}    (Anthropic Claude)
    ${C.cyan}https://platform.openai.com/api-keys${C.reset}      (OpenAI GPT-4o)
    ${C.cyan}https://console.mistral.ai/api-keys${C.reset}       (Mistral)
`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // 1) escolher provedor
  console.log(`\n${C.bold}1️⃣  Escolha o provedor padrão:${C.reset}`);
  console.log(`  ${C.green}1${C.reset}) ${C.blue}🔵 Google Gemini${C.reset}     — grátis para sempre (recomendado)`);
  console.log(`  ${C.green}2${C.reset}) ${C.yellow}🟠 Anthropic Claude${C.reset} — US$5 crédito inicial`);
  console.log(`  ${C.green}3${C.reset}) ${C.green}🟢 OpenAI GPT-4o${C.reset}     — US$5 crédito inicial`);
  console.log(`  ${C.green}4${C.reset}) ${C.magenta}🟣 Mistral${C.reset}          — trial de crédito`);
  const provChoice = (await ask(rl, '\nOpção [1-4] (padrão 1): ')) || '1';
  const provMap = { '1':'google', '2':'anthropic', '3':'openai', '4':'mistral' };
  const provName = { '1':'Google Gemini', '2':'Anthropic Claude', '3':'OpenAI GPT-4o', '4':'Mistral' };
  const provider = provMap[provChoice] || 'google';
  if (!provMap[provChoice]) {
    console.log(`${C.yellow}⚠️ Opção inválida, usando Google Gemini.${C.reset}`);
  }

  // 2) colar API key
  console.log(`\n${C.bold}2️⃣  Cole sua API key do ${provName[provChoice] || 'Google'}:${C.reset}`);
  console.log(`${C.dim}   (vou testar antes de salvar — não pode ter espaços)${C.reset}`);
  let key = '';
  while (!key) {
    key = await askHidden(rl, `   API Key${provider==='google'?' (AIzaSy...)':provider==='anthropic'?' (sk-ant-...)':' (sk-...)'}: `);
    if (!key) { console.log(`${C.red}   ⚠️  Vazio. Tente de novo.${C.reset}`); continue; }
    if (key.length < 10) { console.log(`${C.red}   ⚠️  Chave parece curta demais.${C.reset}`); key=''; continue; }
  }

  // 3) testar key
  process.stdout.write(`\n${C.dim}   Testando chave...${C.reset}`);
  const ok = await testKey(provider, key);
  if (!ok) {
    console.log(`\r${C.red}   ❌ Chave inválida ou API indisponível.${C.reset}`);
    const cont = await ask(rl, '   Salvar mesmo assim? [s/N]: ');
    if (cont.toLowerCase() !== 's') {
      console.log(`${C.yellow}Tente novamente com: npx ps-claw quickstart${C.reset}`);
      rl.close();
      process.exit(1);
    }
  } else {
    console.log(`\r${C.green}   ✅ Chave válida!${C.reset}                            `);
  }
  cfg.keys[provider] = key;

  // 4) escolher modelo padrão
  console.log(`\n${C.bold}3️⃣  Escolha o modelo padrão:${C.reset}`);
  const provModels = MODELS.filter(m => m.p === provider);
  provModels.forEach((m, i) => {
    console.log(`  ${C.green}${i+1}${C.reset}) ${C.bold}${m.name}${C.reset} — ${C.dim}${m.desc}${C.reset}`);
  });
  const modelChoice = (await ask(rl, `\nOpção [1-${provModels.length}] (padrão 1): `)) || '1';
  const mi = parseInt(modelChoice, 10) - 1;
  cfg.model = provModels[mi] ? provModels[mi].id : provModels[0].id;
  console.log(`${C.green}✅ Modelo selecionado: ${provModels.find(m=>m.id===cfg.model).name}${C.reset}`);

  // 5) perfil
  console.log(`\n${C.bold}4️⃣  Perfil (opcional — Enter para pular):${C.reset}`);
  const name = await ask(rl, `   Seu nome [${cfg.cfg.name}]: `);
  if (name) cfg.cfg.name = name;
  const agent = await ask(rl, `   Nome do agente [${cfg.cfg.agent}]: `);
  if (agent) cfg.cfg.agent = agent;

  cfg.onboarded = true;
  saveCfg(cfg);

  console.log(`\n${C.green}${C.bold}🎉 Pronto! Configuração salva em:${C.reset}`);
  console.log(`   ${C.dim}${CONFIG_FILE}${C.reset}`);
  console.log(`\n${C.bold}Agora você pode:${C.reset}`);
  console.log(`   ${C.cyan}npx ps-claw chat${C.reset}        — conversar no terminal`);
  console.log(`   ${C.cyan}npx ps-claw web${C.reset}         — abrir interface web`);
  console.log(`   ${C.cyan}npx ps-claw models${C.reset}      — ver todos os modelos`);

  const startNow = (await ask(rl, '\nIniciar chat agora? [S/n]: ')).toLowerCase();
  rl.close();
  if (startNow !== 'n') {
    console.log();
    startChat();
  } else {
    process.exit(0);
  }
}

// ─── Listar modelos ────────────────────────────────────────────────────────
function listModels() {
  const cfg = loadCfg();
  console.log(`${C.bold}Modelos disponíveis${C.reset} ${C.dim}(config em ${CONFIG_FILE})${C.reset}\n`);
  const byProv = {};
  for (const m of MODELS) (byProv[m.p] = byProv[m.p] || []).push(m);
  const labels = { anthropic:'🟠 Anthropic', openai:'🟢 OpenAI', google:'🔵 Google', mistral:'🟣 Mistral', local:'⚫ Local' };
  for (const [p, list] of Object.entries(byProv)) {
    console.log(`  ${C.bold}${labels[p] || p}${C.reset}  ${C.dim}(${cfg.keys[p] ? '✓ key configurada' : 'sem key'})${C.reset}`);
    for (const m of list) {
      const isSel = m.id === cfg.model;
      console.log(`    ${isSel ? C.green + '▸' : ' '} ${m.name} ${C.dim}— ${m.desc}${C.reset}${isSel ? ` ${C.green}(ativo)${C.reset}` : ''}`);
    }
    console.log();
  }
  console.log(`${C.dim}Troque com: npx ps-claw quickstart${C.reset}`);
}

// ─── Mostrar config ────────────────────────────────────────────────────────
function showConfig() {
  const cfg = loadCfg();
  console.log(`${C.bold}Config atual${C.reset} ${C.dim}(${CONFIG_FILE})${C.reset}\n`);
  console.log(`  Onboarded : ${cfg.onboarded ? C.green+'sim'+C.reset : C.yellow+'não'+C.reset}`);
  console.log(`  Modelo    : ${cfg.model || C.red+'(nenhum)'+C.reset}`);
  console.log(`  Nome      : ${cfg.cfg.name}`);
  console.log(`  Agente    : ${cfg.cfg.agent}`);
  console.log(`  Temp      : ${cfg.cfg.temp}  ·  Max tokens: ${cfg.cfg.tok}`);
  console.log(`  Keys:`);
  for (const [p, k] of Object.entries(cfg.keys)) {
    const status = k ? `${C.green}✓ ${k.slice(0,4)}...${k.slice(-3)}${C.reset}` : `${C.dim}vazio${C.reset}`;
    console.log(`    ${p.padEnd(10)}: ${status}`);
  }
  if (!cfg.onboarded) {
    console.log(`\n${C.yellow}Rode: npx ps-claw quickstart${C.reset}`);
  }
}

// ─── Chat no terminal ──────────────────────────────────────────────────────
async function startChat() {
  let cfg = loadCfg();

  // 1) garantir que tem config
  if (isFirstUse(cfg)) {
    console.log(`${C.yellow}🚀 Primeiro uso detectado. Iniciando quickstart...${C.reset}\n`);
    return quickstart();
  }
  if (!cfg.model) {
    console.log(`${C.yellow}⚠️  Nenhum modelo selecionado. Rode: npx ps-claw quickstart${C.reset}`);
    process.exit(1);
  }
  const model = MODELS.find(m => m.id === cfg.model);
  if (!model) {
    console.log(`${C.red}❌ Modelo "${cfg.model}" não reconhecido. Rode: npx ps-claw quickstart${C.reset}`);
    process.exit(1);
  }
  if (!cfg.keys[model.p] && model.p !== 'local') {
    console.log(`${C.yellow}⚠️  Sem API key para ${model.p}. Rode: npx ps-claw quickstart${C.reset}`);
    process.exit(1);
  }

  banner();
  console.log(`  ${C.bold}Chat iniciado${C.reset} · ${C.cyan}${model.name}${C.reset} · ${C.dim}(${model.p})${C.reset}`);
  console.log(`  ${C.dim}Comandos: /sair (exit), /limpar (clear), /modelo (lista), /ajuda (help)${C.reset}\n`);

  const history = [];
  const sys = cfg.cfg.sys || 'Você é a PS Claw, uma assistente de IA inteligente e preativa. Responda em português, seja direta e útil.';
  const temp = parseFloat(cfg.cfg.temp) || 0.7;
  const maxTok = parseInt(cfg.cfg.tok) || 4096;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${C.green}${C.bold}você${C.reset}${C.dim}> ${C.reset}`,
    historySize: 100,
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const text = line.trim();
    if (!text) { rl.prompt(); return; }

    // comandos
    if (text === '/sair' || text === '/exit' || text === '/quit') {
      console.log(`${C.dim}Até mais! 🦞${C.reset}`);
      process.exit(0);
    }
    if (text === '/limpar' || text === '/clear') {
      history.length = 0;
      console.clear();
      rl.prompt();
      return;
    }
    if (text === '/ajuda' || text === '/help') {
      console.log(`  ${C.bold}Comandos:${C.reset}
  /sair       Sair do chat
  /limpar     Limpar histórico
  /modelo     Listar modelos
  /ajuda      Esta ajuda
  ${C.dim}Digite sua mensagem e Enter para conversar.${C.reset}`);
      rl.prompt();
      return;
    }
    if (text === '/modelo' || text === '/model') {
      listModels();
      rl.prompt();
      return;
    }
    if (text.startsWith('/')) {
      console.log(`${C.red}Comando desconhecido: ${text}${C.reset} (tente /ajuda)`);
      rl.prompt();
      return;
    }

    // mensagem normal
    history.push({ role: 'user', content: text });

    process.stdout.write(`\n${C.magenta}${C.bold}🦞 ps-claw${C.reset}${C.dim}> ${C.reset}`);
    process.stdout.write(`${C.dim}(pensando...)${C.reset}`);

    const t0 = Date.now();
    try {
      // construímos um cfg temporário com histórico embutido
      const tmp = { ...cfg, _history: [...history] };
      const reply = await callLLM(tmp);
      // apaga "pensando..."
      process.stdout.write('\r\x1b[K');
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`${C.magenta}${C.bold}🦞 ps-claw${C.reset}${C.dim}> ${C.reset}${reply}`);
      console.log(`${C.dim}  ── ${elapsed}s · ${model.name}${C.reset}\n`);
      history.push({ role: 'assistant', content: reply });
    } catch (e) {
      process.stdout.write('\r\x1b[K');
      console.log(`${C.red}❌ Erro: ${e.message}${C.reset}`);
      // remove a msg do usuário do histórico pois falhou
      history.pop();
      console.log(`${C.dim}Dica: rode 'npx ps-claw quickstart' para reconfigurar.${C.reset}\n`);
    }
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(`\n${C.dim}Até mais! 🦞${C.reset}`);
    process.exit(0);
  });

  // mensagem inicial de boas-vindas
  console.log(`${C.dim}Olá ${cfg.cfg.name}! Sou ${cfg.cfg.agent}. Como posso ajudar hoje?${C.reset}\n`);
}

// ─── Web server ────────────────────────────────────────────────────────────
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

// ─── Agent (requer dist/) ──────────────────────────────────────────────────
function startAgent() {
  const distEntry = path.join(__dirname, "dist", "entry.mjs");
  const distEntryJs = path.join(__dirname, "dist", "entry.js");

  if (!existsSync(distEntry) && !existsSync(distEntryJs)) {
    console.log(`${C.yellow}⚠️  O agente completo requer dist/ (build do TypeScript).${C.reset}`);
    console.log(`${C.dim}   Para usar a interface web, execute: npx ps-claw web${C.reset}`);
    console.log(`${C.dim}   Para conversar no terminal, execute: npx ps-claw chat${C.reset}\n`);
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

// ─── Dispatch ──────────────────────────────────────────────────────────────
async function main() {
  switch (cmd) {
    case "chat":       await startChat(); break;
    case "quickstart": await quickstart(); break;
    case "start":      startAgent(); break;
    case "web":        startWeb(); break;
    case "all":        startAll(); break;
    case "update":     update(); break;
    case "models":     listModels(); break;
    case "config":     showConfig(); break;
    case "version":
    case "-v":
    case "--version":
      console.log('PS Claw 1.2.0'); break;
    case "help":
    case "-h":
    case "--help":
    default:           help(); break;
  }
}

main().catch(e => {
  console.error(`${C.red}❌ Erro: ${e.message}${C.reset}`);
  process.exit(1);
});
