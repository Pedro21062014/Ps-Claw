# PS Claw - Lightweight Fork of OpenClaw

**PS Claw** is a lightweight fork of [OpenClaw](https://github.com/openclaw/openclaw), the personal AI assistant gateway. It strips away unnecessary components to deliver a lean, focused experience with only the essential channels and providers.

## What Makes PS Claw Lighter

PS Claw removes significant bulk from the original OpenClaw codebase (~265MB down to a fraction), making it faster to clone, install, and deploy.

### Removed Directories

| Directory | Size | Reason |
|-----------|------|--------|
| `apps/` | ~17MB | Mobile/desktop apps (iOS, Android, macOS) |
| `docs/` | ~15MB | Documentation (use upstream docs) |
| `scripts/` | ~7.4MB | Build/deploy scripts |
| `ui/` | ~7.1MB | Control UI |
| `test/` | ~4.4MB | Test suites |
| `deploy/` | - | Deployment configs |
| `security/` | - | Security policies |
| `qa/` | - | QA tooling |
| `patches/` | - | Patch files |
| `git-hooks/` | - | Git hook scripts |
| `skills/` | - | Bundled skills |
| `config/` | - | Config templates |
| `.github/` | - | CI/CD workflows |
| `.agents/` | - | Agent configs |

### Removed Files

- `CHANGELOG.md` (2.4MB)
- `SECURITY.md`, `CONTRIBUTING.md`, `AGENTS.md`, `VISION.md`
- `Dockerfile`, `docker-compose.yml`
- `appcast.xml`, `fly.toml`, `render.yaml`
- Various lint/format/deploy configs

### Removed Extensions (134 out of 141)

Only 7 essential extensions are kept:

| Extension | Type | Purpose |
|-----------|------|---------|
| `discord/` | Channel | Primary messaging channel |
| `anthropic/` | LLM Provider | Claude models |
| `deepseek/` | LLM Provider | DeepSeek models |
| `openai/` | LLM Provider | GPT models |
| `browser/` | Tool | Web browsing |
| `brave/` | Tool | Web search |
| `duckduckgo/` | Tool | Alternative web search |

### Removed Test Files

All `*.test.ts` and `*.spec.ts` files removed from `src/`, `packages/`, and `extensions/`.

## What's Kept

- **`src/`** - Core gateway functionality
- **`packages/`** - Core libraries (agent-core, llm-core, plugin-sdk, etc.)
- **7 essential extensions** - Discord + key LLM providers + web tools
- **Build config** - tsconfig, tsdown, vitest, pnpm workspace
- **Entry point** - `ps-claw.mjs` (renamed from `openclaw.mjs`)

## Setup

### Prerequisites

- Node.js 22.19+ (Node 24 recommended)
- pnpm

### Install from Source

```bash
git clone <your-repo-url>/ps-claw.git
cd ps-claw

pnpm install
pnpm build
```

### Configure

1. Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

2. Set at least one LLM provider key:
   - `ANTHROPIC_API_KEY` for Claude
   - `OPENAI_API_KEY` for GPT
   - `DEEPSEEK_API_KEY` for DeepSeek

3. Set your Discord bot token:
   - `DISCORD_BOT_TOKEN`

4. Create config at `~/.ps-claw/ps-claw.json`:

```json
{
  "agent": {
    "model": "anthropic/claude-sonnet-4-20250514"
  }
}
```

### Run

```bash
# Foreground mode
pnpm ps-claw gateway --port 18789 --verbose

# Or after global install
ps-claw gateway --port 18789 --verbose
```

## Environment Variables

PS Claw uses `PS_CLAW_` prefixed environment variables instead of `OPENCLAW_`:

| Variable | Purpose |
|----------|---------|
| `PS_CLAW_GATEWAY_TOKEN` | Gateway authentication token |
| `PS_CLAW_HOME` | Home directory override |
| `PS_CLAW_STATE_DIR` | State directory override |
| `PS_CLAW_CONFIG_PATH` | Config file path override |

Provider keys remain unchanged (e.g., `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).

## Credits

PS Claw is a lightweight fork of [OpenClaw](https://github.com/openclaw/openclaw) by Peter Steinberger and the OpenClaw community. All core functionality, architecture, and the plugin SDK are the work of the original OpenClaw project.

- Upstream: [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)
- License: MIT (same as OpenClaw)

## License

MIT - See [LICENSE](LICENSE) for details.
