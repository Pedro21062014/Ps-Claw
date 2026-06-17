# PS Claw 🦞

**PS Claw** — Agente de IA autônomo leve com interface web estilo ChatGPT. Multi-canal (Telegram, Discord, WhatsApp) com suporte a modelos de múltiplos provedores (Claude, GPT-4, Gemini).

Fork enxuto do [OpenClaw](https://github.com/openclaw/openclaw) focado em leveza, facilidade de uso e sem dependências pesadas.

---

## ⚡ Início Rápido (5 minutos)

### Requisitos
- [Node.js](https://nodejs.org/) **v22.19+** (baixe a versão LTS)
- npm (incluído com Node.js)

### 1️⃣ Instalar e executar

```bash
npx ps-claw@latest web
```

Pronto! A interface web abre em **http://localhost:3000** 🎉

No **primeiro uso** (web ou terminal), o PS Claw abre o **Quickstart guiado** — você escolhe o provedor (Google Gemini é grátis), cola a API key, testa, escolhe o modelo e está pronto para conversar.

---

## 💻 Conversar pelo terminal

O PS Claw agora tem **chat no terminal** — não precisa mais só da interface web!

```bash
# Quickstart guiado (primeiro uso, ou para reconfigurar)
npx ps-claw quickstart

# Conversar direto no terminal
npx ps-claw chat

# Ver modelos disponíveis
npx ps-claw models

# Ver configuração atual
npx ps-claw config
```

### Comandos dentro do `chat`

| Comando | Ação |
|---------|------|
| `/ajuda` | Lista os comandos |
| `/sair` | Encerra o chat |
| `/limpar` | Limpa o histórico |
| `/modelo` | Lista os modelos |

Config salva em `~/.ps-claw/config.json`.

---

## 🌐 Interface Web

### O que é?
Interface visual estilo ChatGPT para conversar com o agente de IA. Salva histórico no navegador, permite trocar modelos, configurar gateways, instalar plugins da **Loja Claw Hub** e rodar tarefas com **Browser Use**.

### Como usar?

```bash
# Abrir a interface web
npx ps-claw web

# Ou executar tudo junto (agente + web)
npx ps-claw all
```

Acesse: **http://localhost:3000**

### Abas da interface

| Aba | Função |
|-----|--------|
| 💬 **Chat** | Conversa com a IA, histórico persistente |
| 🔑 **API Keys** | Configure suas chaves (Anthropic, OpenAI, Google, Mistral) |
| 🤖 **Modelos** | Selecione o modelo padrão |
| 🛒 **Loja** | Catálogo do Claw Hub — instale MCPs, plugins e skills com 1 clique |
| 🌐 **Browser** | Integração Browser Use — IA controla o navegador |
| 🔌 **Gateways** | Conecte a gateways externos (opcional) |
| ⚙️ **Config** | Ajustes de perfil, system prompt, temperatura, etc. |

### Configuração na interface

1. O **Quickstart** aparece automaticamente no primeiro uso — basta seguir os passos.
2. Ou configure manualmente:
   - Aba **🔑 API Keys** → cole sua chave
   - Aba **🤖 Modelos** → clique no modelo desejado
   - Aba **💬 Chat** → comece a conversar!

---

## 🛒 Loja Claw Hub

A aba **🛒 Loja** é uma loja estilo Play Store com **plugins, MCPs e skills** curados do ecossistema Claw Hub. Com 1 clique você instala:

- **🌐 Automação** — Browser Use, Playwright MCP, Puppeteer MCP
- **🧠 Memória** — Memory Server, SQLite, Chroma
- **📁 Documentos** — Filesystem, GitHub, GitLab, Notion
- **🔎 Busca** — Brave Search, Fetch, Tavily
- **💼 Produtividade** — Google Drive, Slack, Gmail
- **🐳 DevOps** — Docker, PostgreSQL
- **🤖 IA** — Ollama Local, OpenRouter, LM Studio
- **🎙️ Mídia** — Whisper, YouTube
- **💻 Skills** — Coder Pro, Writer, Data Analyst, Translator

Cada plugin tem **ícone, descrição, rating, número de downloads** e botão **⬇️ Instalar**. A instalação roda `npm install -g`, `pip install --user` ou cria uma skill local — tudo automático.

---

## 🌐 Browser Use

A aba **🌐 Browser** integra a biblioteca [browser-use](https://github.com/browser-use/browser-use) — a IA controla um navegador real para executar tarefas:

1. Clique em **⬇️ Instalar Browser Use** (instala `browser-use` + `playwright` via pip)
2. Digite a **URL inicial** (opcional) e a **tarefa em linguagem natural**
3. Clique em **▶️ Executar Tarefa**

**Exemplos de tarefas:**
- "Liste as 5 notícias mais populares do Hacker News"
- "Pesquise por 'PS Claw AI agent' e liste os 3 primeiros resultados"
- "Vá em GitHub Trending e liste os 5 repositórios do dia"

> Requer API key da OpenAI configurada (browser-use usa LangChain por padrão).

---

## 🔑 Chaves de API — Como obter

### 🟠 Anthropic (Claude)

1. Acesse https://console.anthropic.com
2. Faça login ou crie conta
3. Vá para **API Keys**
4. Clique **Create Key**
5. Copie a chave `sk-ant-...`
6. Cole na aba **Modelos** do PS Claw

**Grátis?** Sim, Claude oferece créditos iniciais ($5-$20). Depois é por uso.

### 🟢 OpenAI (GPT-4, GPT-4o)

1. Acesse https://platform.openai.com
2. Faça login ou crie conta
3. Vá para **API Keys**
4. Clique **Create new secret key**
5. Copie a chave `sk-...`
6. Cole na aba **Modelos** do PS Claw

**Grátis?** Sim, trial de $5-$18. Depois é por uso (mais barato que Claude).

### 🔵 Google (Gemini)

1. Acesse https://aistudio.google.com/apikey
2. Clique **Create API Key**
3. Selecione um projeto ou crie novo
4. Copie a chave `AIza...`
5. Cole na aba **Modelos** do PS Claw

**Grátis?** Sim, 60 chamadas por minuto para sempre.

### 🟣 Mistral

1. Acesse https://console.mistral.ai
2. Faça login ou crie conta
3. Vá para **API Keys**
4. Clique **Generate a new key**
5. Copie a chave
6. Cole na aba **Modelos** do PS Claw

**Grátis?** Sim, trial de crédito. Depois por uso.

---

## 🚀 Alternativas de Uso

### Via Git Clone (desenvolvedores)

```bash
git clone https://github.com/Pedro21062014/ps-claw-v2.git
cd ps-claw-v2
npm install
npx ps-claw web
```

### Instalar Globalmente

```bash
npm install -g ps-claw@latest
ps-claw web
```

Se não funcionar em Windows, use `npx ps-claw web` em vez disso.

### Atualizar

```bash
npx ps-claw update
# ou
npm install -g ps-claw@latest
```

---

## ⚙️ Configurações Avançadas

### Variáveis de Ambiente

```bash
# Porta da interface web (padrão: 3000)
set PS_CLAW_WEB_PORT=3000

# Porta do gateway PS Claw (padrão: 18789)
set PS_CLAW_GATEWAY_PORT=18789

# Token do gateway (se tiver autenticação)
set OPENCLAW_GATEWAY_TOKEN=seu_token_aqui
```

### Usar outro Gateway

Se você tem um PS Claw rodando em outro servidor:

1. Na interface, aba **🔌 Gateways**
2. Adicione a URL: `http://seu-servidor:18789`
3. Pronto! Usa esse gateway

### Usar API OpenAI-compatível

Muitos serviços são compatíveis com OpenAI API:

- **Ollama** (modelos locais): `http://localhost:11434`
- **Vllm** (inference server): `http://localhost:8000`
- **LiteLLM**: qualquer URL proxy

Configure na aba **Gateways** com a URL do seu servidor.

---

## 📱 Canais (Telegram, Discord, WhatsApp)

Você pode conectar o PS Claw a:

- **Telegram** — Adicionar bot ao chat
- **Discord** — Adicionar bot ao servidor
- **WhatsApp** — Integração via Twilio ou Baileys
- **Slack** — Bot em workspace

Configure na interface ou edite `.env`:

```bash
# .env.example
TELEGRAM_BOT_TOKEN=seu_token
DISCORD_BOT_TOKEN=seu_token
WHATSAPP_PHONE=seu_numero
```

Copie `.env.example` para `.env` e preencha.

---

## 🐳 Docker

```bash
# Build
docker build -t ps-claw .

# Run
docker run -p 3000:3000 ps-claw web
```

---

## ✅ Recursos Incluídos

| Recurso | Status |
|---------|--------|
| Interface web estilo ChatGPT | ✅ |
| Chat com histórico | ✅ |
| Múltiplos modelos | ✅ |
| Telegram, Discord, WhatsApp | ✅ |
| Busca na web | ✅ |
| Memória persistente | ✅ |
| CLI + API | ✅ |
| Suporte MCP/Skills | ✅ |
| Apps iOS/Android | ❌ removido |
| Geração de vídeo/música | ❌ removido |
| Transcrição em tempo real | ❌ removido |

---

## 🆘 Resolução de Problemas

### "ps-claw: comando não encontrado"

**Solução:** Use `npx ps-claw web` em vez de `ps-claw web`

### "localhost:3000 recusou conexão"

**Solução:** Verifique se algum programa já usa a porta 3000:

```bash
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000
```

Se estiver em uso, mude a porta:

```bash
set PS_CLAW_WEB_PORT=3001
npx ps-claw web
```

### "Gateway offline"

**Solução:** Verifique se:

1. A URL está correta (ex: `http://localhost:18789`)
2. O gateway está rodando (se for local, execute `npx ps-claw start`)
3. Firewall não está bloqueando

### "Chave de API inválida"

**Solução:**

1. Copie a chave completa (sem espaços)
2. Verifique se é uma chave válida (não expirou)
3. Cole de novo na aba **Modelos**

---

## 📚 Documentação Completa

- [OpenClaw (original)](https://github.com/openclaw/openclaw)
- [Anthropic Claude](https://console.anthropic.com/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Google Gemini](https://aistudio.google.com/app/apikey)

---

## 📄 Licença

MIT — Baseado no [OpenClaw](https://github.com/openclaw/openclaw) por Peter Steinberger

---

## 🤝 Contribuições

Pull requests bem-vindo! Para mudanças grandes, abra uma issue primeiro.

---

## 💬 Suporte

- GitHub Issues: https://github.com/Pedro21062014/ps-claw-v2/issues
- Discussões: https://github.com/Pedro21062014/ps-claw-v2/discussions

---

**Aproveite o PS Claw! 🦞**

Dúvidas? Abra uma issue no GitHub ou entre em contato! ✨
