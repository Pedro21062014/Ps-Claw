# PS Claw Desktop 🦞

Aplicativo desktop profissional do PS Claw construído com **Electron**. Permite usar todos os recursos do PS Claw (chat com IA, loja de plugins, Browser Use) sem precisar de linha de comando.

## Download

Baixe a versão mais recente em: **[Releases](https://github.com/Pedro21062014/Ps-Claw/releases)**

| Plataforma | Arquivo |
|------------|---------|
| 🐧 Linux (x64) | `PS-Claw-1.2.0-x64.AppImage` ou `ps-claw-desktop_1.2.0_amd64.deb` |
| 🪟 Windows (x64) | `PS-Claw-1.2.0-x64.zip` ou installer NSIS |

## Instalação

### Linux
```bash
# AppImage (sem instalar, só rodar)
chmod +x PS-Claw-1.2.0-x64.AppImage
./PS-Claw-1.2.0-x64.AppImage

# DEB (instala no sistema)
sudo dpkg -i ps-claw-desktop_1.2.0_amd64.deb
sudo apt-get install -f  # resolve dependências
ps-claw-desktop  # ou procure "PS Claw" no menu de aplicativos
```

### Windows
1. Baixe `PS-Claw-1.2.0-x64.zip`
2. Extraia em qualquer pasta
3. Execute `PS Claw.exe`
4. (Ou use o installer `.exe` NSIS para instalação completa)

## Como funciona

O app Electron embute o servidor web do PS Claw (`web-ui/server.mjs`) e abre uma janela nativa apontando para `http://127.0.0.1:<porta>`. Tudo acontece localmente — sem servidores externos, sem CORS, sem complicações.

```
┌──────────────────────────────────────────┐
│  Janela Electron (Chromium)              │
│  ┌────────────────────────────────────┐  │
│  │  web-ui/public/index.html          │  │
│  │  (interface ChatGPT-like)          │  │
│  └────────────┬───────────────────────┘  │
│               │ fetch /proxy              │
│  ┌────────────▼───────────────────────┐  │
│  │  web-ui/server.mjs (Node.js)       │  │
│  │  - proxy para APIs de IA           │  │
│  │  - loja Claw Hub                   │  │
│  │  - integração Browser Use          │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

## Build do zero

### Pré-requisitos
- Node.js v22+
- npm

### Passo a passo
```bash
cd desktop
npm install

# Build para plataforma atual
npm run build:linux   # AppImage + .deb + tar.gz
npm run build:win     # .zip + .exe (NSIS)
npm run build:mac     # .dmg

# Ou todas as plataformas suportadas pelo host atual
npm run build:all
```

Os binários ficam em `dist-desktop/`.

## Estrutura

```
desktop/
├── build/
│   ├── icon.png          # ícone Linux (512×512)
│   ├── icon.ico          # ícone Windows (multi-res)
│   ├── icon.svg          # fonte do ícone
│   └── splash.png        # splash screen
├── src/
│   ├── main.js           # processo principal do Electron
│   └── preload.js        # bridge seguro main→renderer
├── package.json          # config do app + electron-builder
└── README.md             # este arquivo
```

## Recursos

- ✅ Janela nativa com ícone e menu profissional
- ✅ Splash screen animada no boot
- ✅ Servidor web embutido (sem precisar rodar `npx ps-claw web`)
- ✅ Single-instance lock (só um PS Claw aberto por vez)
- ✅ Links externos abrem no navegador do sistema
- ✅ Menu Ajuda com links para GitHub/docs
- ✅ Diálogo "Sobre" com versão e créditos
- ✅ Auto-update via GitHub releases (configurado, pronto pra ativar)
- ✅ Deep linking `ps-claw://` (preparado para futuro)

## Licença

MIT — mesmo licença do projeto principal.
