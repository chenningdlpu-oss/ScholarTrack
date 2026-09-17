/* ScholarTrack 预加载：安全桥接文件存储能力到页面 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  save: (json) => ipcRenderer.invoke('data:save', json),
  load: () => ipcRenderer.invoke('data:load'),
  dataPath: () => ipcRenderer.invoke('data:path'),
  backupPath: () => ipcRenderer.invoke('data:backup-path'),
  deleteData: () => ipcRenderer.invoke('data:delete'),
  exportToFile: (defaultName, json) => ipcRenderer.invoke('dialog:save-json', defaultName, json),
  importFromFile: () => ipcRenderer.invoke('dialog:open-json')
});
