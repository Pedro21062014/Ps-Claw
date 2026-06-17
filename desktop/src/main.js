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
    const env = {
      ...process.env,
      PS_CLAW_WEB_PORT: String(serverPort),
      PS_CLAW_DESKTOP: '1',
    };

    serverProcess = spawn(process.execPath, [WEB_UI_PATH], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let bootstrapped = false;
    const bootstrapTimeout = setTimeout(() => {
      if (!bootstrapped) {
        reject(new Error('Timeout ao iniciar o servidor web (10s)'));
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
          `O servidor web interno encerrou inesperadamente (código ${code}).\n` +
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
    width: 480,
    height: 320,
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
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // splash em HTML embutido
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
        background-image: radial-gradient(at 0% 0%, rgba(124,106,247,.08) 0px, transparent 50%),
                          radial-gradient(at 100% 100%, rgba(58,210,159,.06) 0px, transparent 50%);
        color: #ededf2;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        user-select: none; -webkit-user-select: none;
      }
      .logo {
        width: 96px; height: 96px; border-radius: 22px;
        background: linear-gradient(135deg, #5c4fe0 0%, #7c6af7 50%, #9b8fff 100%);
        display: flex; align-items: center; justify-content: center;
        font-size: 50px;
        box-shadow: 0 12px 40px rgba(124,106,247,.45), inset 0 1px 0 rgba(255,255,255,.2);
        margin-bottom: 24px;
        animation: pulse 2s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 12px 40px rgba(124,106,247,.45), inset 0 1px 0 rgba(255,255,255,.2); }
        50% { transform: scale(1.05); box-shadow: 0 16px 50px rgba(124,106,247,.6), inset 0 1px 0 rgba(255,255,255,.3); }
      }
      h1 { font-size: 22px; font-weight: 700; letter-spacing: -.3px; margin-bottom: 4px; }
      .sub { font-size: 11px; color: #9494a8; letter-spacing: .5px; }
      .spinner {
        margin-top: 28px;
        width: 28px; height: 28px;
        border: 2.5px solid rgba(255,255,255,.1);
        border-top-color: #7c6af7;
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .ver { position: absolute; bottom: 14px; right: 18px; font-size: 10px; color: #5a5a6e; }
    </style>
    </head>
    <body>
      <div class="logo">🦞</div>
      <h1>PS Claw</h1>
      <div class="sub">AI Agent Gateway</div>
      <div class="spinner"></div>
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
