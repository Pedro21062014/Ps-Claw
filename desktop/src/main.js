'use strict';

/**
 * PS Claw Desktop — Electron Main Process
 *
 * Responsabilidades:
 *  - Inicia o servidor web embutido (web-ui/server.mjs) em porta automática
 *  - Mostra splash screen durante o boot
 *  - Abre janela principal apontando para http://localhost:<port>
 *  - Configura menu, ícone, deep links, auto-update (futuro)
 *  - Trata lifecycle do app (quit, activate, etc.)
 */

const { app, BrowserWindow, Menu, shell, dialog, ipcMain, nativeImage } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const { spawn } = require('child_process');

// ─── Globals ──────────────────────────────────────────────────────────────
let splashWindow = null;
let mainWindow = null;
let serverProcess = null;
let serverPort = 0;
let isDev = process.argv.includes('--dev');
let isQuitting = false;

const RESOURCES_PATH = app.isPackaged
  ? process.resourcesPath
  : path.join(__dirname, '..');

const WEB_UI_PATH = path.join(RESOURCES_PATH, 'web-ui', 'server.mjs');
const SPLASH_PATH = path.join(__dirname, '..', 'build', 'splash.png');

// ─── Porta automática ─────────────────────────────────────────────────────
function pickPort() {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

// ─── Servidor web embutido ────────────────────────────────────────────────
async function startWebServer() {
  if (!fs.existsSync(WEB_UI_PATH)) {
    throw new Error(`web-ui/server.mjs não encontrado em: ${WEB_UI_PATH}`);
  }
  serverPort = await pickPort();

  return new Promise((resolve, reject) => {
    // CRÍTICO: no Electron empacotado, process.execPath é o binário do
    // Electron (não Node.js). Para rodar um script Node como child process,
    // precisamos definir ELECTRON_RUN_AS_NODE=1 — isso faz o Electron
    // esquecer o modo "janela" e rodar como Node puro.
    const env = {
      ...process.env,
      PS_CLAW_WEB_PORT: String(serverPort),
      PS_CLAW_DESKTOP: '1',
      ELECTRON_RUN_AS_NODE: '1',
    };

    serverProcess = spawn(process.execPath, [WEB_UI_PATH], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let bootstrapped = false;
    let stderrBuf = '';
    const bootstrapTimeout = setTimeout(() => {
      if (!bootstrapped) {
        const tail = stderrBuf.slice(-500);
        reject(new Error(
          `Timeout ao iniciar o servidor web (10s).\n` +
          (tail ? `Saída de erro:\n${tail}` : 'Sem saída de erro.')
        ));
      }
    }, 10000);

    serverProcess.stdout.on('data', (chunk) => {
      const txt = chunk.toString();
      if (isDev) console.log('[server]', txt.trim());
      if (!bootstrapped && txt.includes('Rodando em')) {
        bootstrapped = true;
        clearTimeout(bootstrapTimeout);
        resolve(serverPort);
      }
    });

    serverProcess.stderr.on('data', (chunk) => {
      const txt = chunk.toString();
      stderrBuf += txt;
      if (isDev) console.error('[server:err]', txt.trim());
    });

    serverProcess.on('error', (err) => {
      clearTimeout(bootstrapTimeout);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      if (isDev) console.log('[server] exited with', code);
      if (!isQuitting && code !== 0) {
        dialog.showErrorBox(
          'PS Claw — Erro no servidor',
          `O servidor web interno encerrou inesperadamente (código ${code}).\n\n` +
          `Saída de erro:\n${stderrBuf.slice(-800) || '(vazia)'}\n\n` +
          `Reinicie o aplicativo.`
        );
      }
    });
  });
}

function stopWebServer() {
  if (serverProcess && !serverProcess.killed) {
    try {
      serverProcess.kill('SIGTERM');
      // força kill após 3s se não tiver morrido
      setTimeout(() => {
        try { serverProcess.kill('SIGKILL'); } catch {}
      }, 3000);
    } catch {}
  }
}

// ─── Splash window ────────────────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 600,
    height: 380,
    frame: false,
    transparent: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    backgroundColor: '#0a0a0c',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Splash screen profissional em HTML embutido
  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8"/>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        width: 100%; height: 100%; overflow: hidden;
        background: #0a0a0c;
        background-image:
          radial-gradient(at 0% 0%, rgba(124,106,247,.08) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(58,210,159,.06) 0px, transparent 50%),
          radial-gradient(at 50% 35%, rgba(124,106,247,.15) 0px, transparent 60%);
        color: #ededf2;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        user-select: none; -webkit-user-select: none;
        position: relative;
      }
      .logo {
        width: 124px; height: 124px; border-radius: 28px;
        background: linear-gradient(135deg, #6d5cf0 0%, #7c6af7 50%, #9b6fff 100%);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 18px 56px rgba(124,106,247,.55),
                    inset 0 1px 0 rgba(255,255,255,.25),
                    0 0 0 1px rgba(255,255,255,.08);
        margin-bottom: 28px;
        animation: pulse 2.4s ease-in-out infinite;
        position: relative;
        overflow: hidden;
      }
      .logo::after {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%;
        background: linear-gradient(to bottom, rgba(255,255,255,.22), transparent);
        border-radius: 28px 28px 0 0;
        pointer-events: none;
      }
      .logo svg { width: 90%; height: 90%; position: relative; z-index: 1; }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.04); }
      }
      h1 {
        font-size: 30px; font-weight: 800; letter-spacing: -.6px;
        background: linear-gradient(135deg, #fff 0%, #9b8fff 100%);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
        margin-bottom: 6px;
      }
      .sub {
        font-size: 11px; color: #9494a8; letter-spacing: 2px;
        text-transform: uppercase; font-weight: 600;
      }
      .spinner {
        margin-top: 32px;
        width: 32px; height: 32px;
        border: 3px solid rgba(124,106,247,.15);
        border-top-color: #7c6af7;
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .ver {
        position: absolute; bottom: 16px; right: 20px;
        font-size: 10px; color: #5a5a6e; letter-spacing: .5px;
        font-weight: 500;
      }
      .brand {
        position: absolute; bottom: 16px; left: 20px;
        font-size: 10px; color: #5a5a6e; letter-spacing: .5px;
      }
    </style>
    </head>
    <body>
      <div class="logo">
        <svg viewBox="-180 -200 360 380" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ff6b4a"/>
              <stop offset="50%" stop-color="#e84830"/>
              <stop offset="100%" stop-color="#b8281c"/>
            </linearGradient>
            <linearGradient id="bodyHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffb098" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#ff6b4a" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="clawGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ff8b6a"/>
              <stop offset="100%" stop-color="#d8401e"/>
            </linearGradient>
            <linearGradient id="clawGradDark" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#d8401e"/>
              <stop offset="100%" stop-color="#9a2010"/>
            </linearGradient>
            <filter id="ls" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.45"/>
            </filter>
          </defs>
          <g filter="url(#ls)">
            <!-- Antenas -->
            <g stroke-linecap="round" fill="none">
              <path d="M -38 -120 Q -85 -160, -130 -190" stroke="url(#bodyGrad)" stroke-width="5"/>
              <path d="M -130 -190 L -150 -198" stroke="url(#bodyGrad)" stroke-width="3"/>
              <path d="M 38 -120 Q 85 -160, 130 -190" stroke="url(#bodyGrad)" stroke-width="5"/>
              <path d="M 130 -190 L 150 -198" stroke="url(#bodyGrad)" stroke-width="3"/>
            </g>
            <!-- Garra direita (frente) -->
            <path d="M 50 -50 C 90 -90, 140 -80, 145 -30 C 148 0, 130 25, 100 25 C 80 25, 65 15, 60 0 L 75 -10 L 90 -25 L 80 -40 Z" fill="url(#clawGradDark)"/>
            <path d="M 100 25 C 80 25, 65 15, 60 0 L 75 -10 L 90 -25 L 100 -10 L 105 5 Z" fill="url(#clawGrad)"/>
            <path d="M 50 -50 C 90 -90, 140 -80, 145 -30 C 148 -15, 140 -5, 125 -5 L 110 -15 L 95 -35 L 80 -45 Z" fill="url(#clawGrad)"/>
            <path d="M 60 -55 C 90 -85, 130 -78, 138 -38 C 138 -28, 130 -22, 122 -22 L 108 -32 L 92 -50 L 75 -55 Z" fill="url(#bodyHighlight)" opacity="0.7"/>
            <!-- Garra esquerda (atrás) -->
            <path d="M -50 -50 C -90 -85, -135 -75, -138 -32 C -140 -10, -125 8, -100 10 C -82 12, -68 4, -62 -8 L -78 -18 L -90 -32 L -80 -45 Z" fill="url(#clawGradDark)"/>
            <path d="M -60 -55 C -90 -80, -125 -72, -130 -38 L -118 -42 L -100 -50 L -80 -55 Z" fill="url(#bodyHighlight)" opacity="0.5"/>
            <!-- Cefalotórax -->
            <ellipse cx="0" cy="-50" rx="55" ry="60" fill="url(#bodyGrad)"/>
            <ellipse cx="-12" cy="-65" rx="32" ry="38" fill="url(#bodyHighlight)" opacity="0.6"/>
            <!-- Abdômen segmentado -->
            <ellipse cx="0" cy="20" rx="48" ry="22" fill="url(#bodyGrad)"/>
            <ellipse cx="0" cy="50" rx="42" ry="20" fill="url(#bodyGrad)"/>
            <ellipse cx="0" cy="78" rx="35" ry="17" fill="url(#bodyGrad)"/>
            <ellipse cx="0" cy="103" rx="28" ry="14" fill="url(#bodyGrad)"/>
            <!-- Leque caudal -->
            <path d="M -35 115 L -45 130 L -25 138 L 0 140 L 25 138 L 45 130 L 35 115 Z" fill="url(#clawGradDark)"/>
            <!-- Olhos -->
            <line x1="-25" y1="-95" x2="-35" y2="-108" stroke="url(#bodyGrad)" stroke-width="4" stroke-linecap="round"/>
            <circle cx="-37" cy="-110" r="7" fill="#1a1a22"/>
            <circle cx="-39" cy="-112" r="2.5" fill="#fff"/>
            <line x1="25" y1="-95" x2="35" y2="-108" stroke="url(#bodyGrad)" stroke-width="4" stroke-linecap="round"/>
            <circle cx="37" cy="-110" r="7" fill="#1a1a22"/>
            <circle cx="35" cy="-112" r="2.5" fill="#fff"/>
            <!-- Patas -->
            <g stroke-linecap="round" fill="none">
              <path d="M -45 -10 Q -75 0, -95 25" stroke="url(#bodyGrad)" stroke-width="6"/>
              <path d="M -95 25 L -100 45" stroke="url(#bodyGrad)" stroke-width="4"/>
              <path d="M -48 5 Q -80 18, -100 50" stroke="url(#bodyGrad)" stroke-width="6"/>
              <path d="M -100 50 L -108 70" stroke="url(#bodyGrad)" stroke-width="4"/>
              <path d="M 45 -10 Q 75 0, 95 25" stroke="url(#bodyGrad)" stroke-width="6"/>
              <path d="M 95 25 L 100 45" stroke="url(#bodyGrad)" stroke-width="4"/>
              <path d="M 48 5 Q 80 18, 100 50" stroke="url(#bodyGrad)" stroke-width="6"/>
              <path d="M 100 50 L 108 70" stroke="url(#bodyGrad)" stroke-width="4"/>
            </g>
            <!-- Rostro (bico) -->
            <path d="M -10 -105 L 0 -118 L 10 -105 Z" fill="url(#clawGradDark)"/>
          </g>
        </svg>
      </div>
      <h1>PS Claw</h1>
      <div class="sub">AI Agent Gateway</div>
      <div class="spinner"></div>
      <div class="brand">Pedro21062014</div>
      <div class="ver">v${app.getVersion()}</div>
    </body>
    </html>
  `;
  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });
}

// ─── Main window ──────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'PS Claw',
    backgroundColor: '#0a0a0c',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  // Carrega a URL do servidor local
  const target = `http://127.0.0.1:${serverPort}/`;
  mainWindow.loadURL(target);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Links externos abrem no navegador do sistema
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      // permite apenas URLs externas; internas (localhost) abrem na própria janela
      if (!targetUrl.includes('127.0.0.1') && !targetUrl.includes('localhost')) {
        shell.openExternal(targetUrl);
        return { action: 'deny' };
      }
      return { action: 'allow' };
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    // bloqueia navegação pra fora do nosso servidor
    const parsed = new URL(targetUrl);
    if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
      event.preventDefault();
      shell.openExternal(targetUrl);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // menu customizado
  buildMenu();
}

// ─── Menu ─────────────────────────────────────────────────────────────────
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about', label: 'Sobre o PS Claw' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'Arquivo',
      submenu: [
        isMac ? { role: 'close', label: 'Fechar Janela' } : { role: 'quit', label: 'Sair' }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Desfazer' },
        { role: 'redo', label: 'Refazer' },
        { type: 'separator' },
        { role: 'cut', label: 'Recortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' },
        { role: 'selectAll', label: 'Selecionar tudo' }
      ]
    },
    {
      label: 'Exibir',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'forceReload', label: 'Forçar recarga' },
        { role: 'toggleDevTools', label: 'Ferramentas de desenvolvedor' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom 100%' },
        { role: 'zoomIn', label: 'Aproximar' },
        { role: 'zoomOut', label: 'Afastar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela cheia' }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Documentação online',
          click: () => shell.openExternal('https://github.com/Pedro21062014/Ps-Claw#readme')
        },
        {
          label: 'Reportar um problema',
          click: () => shell.openExternal('https://github.com/Pedro21062014/Ps-Claw/issues')
        },
        {
          label: 'Ver no GitHub',
          click: () => shell.openExternal('https://github.com/Pedro21062014/Ps-Claw')
        },
        { type: 'separator' },
        {
          label: 'Sobre o PS Claw',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'PS Claw',
              message: 'PS Claw Desktop',
              detail: `Versão: ${app.getVersion()}\n` +
                      `Electron: ${process.versions.electron}\n` +
                      `Node: ${process.versions.node}\n` +
                      `Chrome: ${process.versions.chrome}\n\n` +
                      `Agente de IA autônomo leve com interface desktop profissional.\n` +
                      `Multi-provedor: Claude, GPT-4, Gemini, Mistral.\n\n` +
                      `Copyright © 2025 Pedro21062014`,
              buttons: ['OK'],
              icon: path.join(__dirname, '..', 'build', 'icon.png'),
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── IPC handlers (preload bridge) ────────────────────────────────────────
ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getServerPort', () => serverPort);
ipcMain.handle('app:openExternal', (e, u) => {
  if (typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))) {
    shell.openExternal(u);
  }
});
ipcMain.handle('app:relaunch', () => {
  isQuitting = true;
  app.relaunch();
  app.quit();
});

// ─── Lifecycle ────────────────────────────────────────────────────────────
// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    createSplash();

    try {
      await startWebServer();
      createMainWindow();
    } catch (err) {
      console.error('Falha no boot:', err);
      dialog.showErrorBox(
        'PS Claw — Falha na inicialização',
        `Não foi possível iniciar o servidor web interno:\n\n${err.message}\n\n` +
        `Tente reinstalar o aplicativo ou contate o suporte.`
      );
      app.quit();
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
    stopWebServer();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplash();
      startWebServer().then(createMainWindow).catch(err => {
        dialog.showErrorBox('PS Claw — Falha', err.message);
        app.quit();
      });
    }
  });
}
