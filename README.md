# PS Claw 🦞

**PS Claw** é uma versão leve do [OpenClaw](https://github.com/openclaw/openclaw) — agente de IA autônomo multi-canal com interface web estilo ChatGPT.

Fork enxuto com foco em leveza e facilidade de uso, sem apps mobile, geração de mídia pesada ou componentes desnecessários.

---

## ⚡ Instalação rápida

### Requisitos
- [Node.js](https://nodejs.org/) v22.19 ou superior

### Instalar via npm (recomendado)

```bash
npm i ps-claw
```

Pronto! O comando `ps-claw` fica disponível globalmente se instalado com `-g`:

```bash
npm i -g ps-claw
```

### Instalar via npx (sem instalar)

```bash
npx ps-claw --help
```

### Instalar a partir do código-fonte

```bash
git clone https://github.com/Pedro21062014/Ps-Claw.git
cd Ps-Claw
pnpm install
pnpm build
```

---

## 🚀 Usando o PS Claw

### CLI — Linha de comando

Após instalar com `npm i -g ps-claw`:

```bash
ps-claw --help           # Mostra todos os comandos
ps-claw --version        # Versão instalada
ps-claw web              # Inicia a interface web
ps-claw gateway run      # Inicia o gateway
ps-claw gateway status   # Verifica status do gateway
ps-claw doctor           # Diagnóstico do sistema
ps-claw models list      # Lista modelos disponíveis
ps-claw secrets set openai    # Configura chave OpenAI
ps-claw secrets set anthropic # Configura chave Anthropic
ps-claw configure        # Configuração interativa
```

### Interface Web

```bash
ps-claw web
```

Acesse **http://localhost:3000** no navegador.

A interface web tem 4 abas:
- 💬 **Chat** — conversas com histórico salvo localmente
- 🔗 **Gateways** — conectar e gerenciar APIs (OpenAI, Anthropic, Ollama, LM Studio, etc.)
- 🧠 **Modelos** — selecionar modelos por provedor (GPT-4o, Claude Opus 4.5, Gemini 2.5 Pro, DeepSeek...)
- ⚙️ **Config** — temperatura, max tokens, system prompt, chaves de API, export/import de configurações

### Variáveis de ambiente

```bash
PS_CLAW_WEB_PORT=3000              # Porta da interface web (padrão: 3000)
PS_CLAW_GATEWAY_PORT=18789         # Porta do gateway (padrão: 18789)
OPENCLAW_GATEWAY_TOKEN=            # Token de autenticação do gateway
OPENAI_API_KEY=sk-...              # Chave OpenAI
ANTHROPIC_API_KEY=sk-ant-...       # Chave Anthropic
GEMINI_API_KEY=...                 # Chave Google/Gemini
DEEPSEEK_API_KEY=sk-...            # Chave DeepSeek
OPENROUTER_API_KEY=sk-or-...       # Chave OpenRouter
```

Ou configure as chaves na aba **Config** da interface web.

---

## 🔄 Atualizar o PS Claw

```bash
npm update -g ps-claw
```

Ou se instalou via código-fonte:

```bash
cd Ps-Claw
git pull
pnpm install
pnpm build
```

---

## ✅ O que está incluído

| Recurso | Status |
|---|---|
| Core do agente autônomo | ✅ |
| Provedores: OpenAI, Anthropic, Google, DeepSeek, OpenRouter | ✅ |
| Interface web com gateways, modelos e configurações | ✅ |
| CLI com comandos completos | ✅ |
| Pacote npm publicado | ✅ |
| Busca na web (DuckDuckGo, Brave) | ✅ |
| Suporte a MCP / Skills | ✅ |
| Memória persistente | ✅ |
| Docker | ✅ |
| Apps iOS / Android / macOS | ❌ removido |
| Geração de vídeo / música / imagem | ❌ removido |
| Transcrição em tempo real / TTS | ❌ removido |

---

## 🐳 Docker

```bash
docker-compose up
```

---

## 📁 Estrutura

```
Ps-Claw/
├── ps-claw.mjs        ← Binário CLI principal
├── scripts/
│   └── build-all.mjs  ← Script de build
├── web-ui/
│   ├── server.mjs     ← Servidor da interface web
│   └── public/
│       └── index.html ← Interface web (Chat, Gateways, Modelos, Config)
├── src/               ← Código-fonte TypeScript
├── extensions/        ← Provedores (OpenAI, Anthropic, DeepSeek...)
├── packages/          ← Bibliotecas internas
├── .env.example       ← Exemplo de configuração
└── package.json
```

---

## 📦 npm

Disponível em: [https://www.npmjs.com/package/ps-claw](https://www.npmjs.com/package/ps-claw)

```bash
npm i ps-claw
```

---

## 📄 Licença

MIT — baseado no [OpenClaw](https://github.com/openclaw/openclaw) por Peter Steinberger e contribuidores.
