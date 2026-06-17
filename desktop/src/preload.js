'use strict';

/**
 * PS Claw Desktop — Preload Bridge
 *
 * Expõe uma API mínima e segura para o renderer (web-ui) comunicar-se
 * com o main process do Electron via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('psClawDesktop', {
  /** Versão do app desktop */
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  /** Porta do servidor web embutido */
  getServerPort: () => ipcRenderer.invoke('app:getServerPort'),

  /** Abre URL externa no navegador do sistema */
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),

  /** Reinicia o app (útil para aplicar mudanças) */
  relaunch: () => ipcRenderer.invoke('app:relaunch'),

  /** Indica que está rodando dentro do Electron */
  isDesktop: true,

  /** Plataforma */
  platform: process.platform,
});
