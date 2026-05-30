# PS Claw 🦞

**PS Claw** é uma versão leve do [OpenClaw](https://github.com/openclaw/openclaw) — agente de IA autônomo multi-canal com interface web estilo ChatGPT.

Fork enxuto com foco em leveza e facilidade de uso, sem apps mobile, geração de mídia pesada ou componentes desnecessários.

---

## ⚡ Instalação rápida

### Requisitos
- [Node.js](https://nodejs.org/) v22.19 ou superior
- [pnpm](https://pnpm.io/) ou npm

### 1. Clonar o repositório

```bash
git clone https://github.com/Pedro21062014/ps-claw-v2.git
cd ps-claw-v2
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar

```bash
cp .env.example .env
# Edite o .env com sua chave de API
```

### 4. Iniciar o PS Claw

```bash
node openclaw.mjs
```

### 5. Abrir a interface web

Em outro terminal:

```bash
node web-ui/server.mjs
```

Acesse **http://localhost:3000** no navegador e aproveite a interface! 🎉

---

## 🌐 Interface Web

O PS Claw vem com uma interface estilo ChatGPT embutida. Para usar:

```bash
# Terminal 1 — inicia o agente
node openclaw.mjs

# Terminal 2 — inicia a interface web
node web-ui/server.mjs
```

Depois acesse: **http://localhost:3000**

### Funcionalidades da interface
- 💬 Chat com o agente em tempo real
- 🗂️ Histórico de conversas salvo localmente
- 🔄 Troca de modelo (Claude, GPT-4o, Gemini...)
- ⚙️ Painel de configurações
- 📱 Responsivo para mobile

### Variáveis de ambiente da interface

```bash
PS_CLAW_WEB_PORT=3000       # Porta da interface (padrão: 3000)
PS_CLAW_GATEWAY_PORT=18789  # Porta do gateway PS Claw (padrão: 18789)
```

---

## 🔄 Atualizar o PS Claw

Para atualizar para a versão mais recente, execute o script de atualização:

**Linux / macOS:**
```bash
bash update.sh
```

**Windows (Git Bash ou WSL):**
```bash
bash update.sh
```

O script vai:
1. Verificar se há uma versão nova disponível
2. Baixar as atualizações do GitHub
3. Reinstalar dependências se necessário
4. Mostrar o que mudou

---

## ✅ O que está incluído

| Recurso | Status |
|---|---|
| Core do agente autônomo | ✅ |
| Telegram, Discord, WhatsApp | ✅ |
| Busca na web | ✅ |
| Suporte a MCP / Skills | ✅ |
| Memória persistente | ✅ |
| Interface web estilo ChatGPT | ✅ |
| CLI e Docker | ✅ |
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
ps-claw-v2/
├── openclaw.mjs      ← Binário principal do agente
├── update.sh         ← Script de atualização
├── web-ui/
│   ├── server.mjs    ← Servidor da interface web
│   └── public/
│       └── index.html ← Interface estilo ChatGPT
├── src/              ← Código-fonte do agente
├── .env.example      ← Exemplo de configuração
└── package.json
```

---

## 📄 Licença

MIT — baseado no [OpenClaw](https://github.com/openclaw/openclaw) por Peter Steinberger e contribuidores.
