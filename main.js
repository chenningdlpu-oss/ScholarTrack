/* ScholarTrack 主进程：窗口创建 + 稳定文件存储 */
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

/* ---- 数据存储：原子写入 + 自动备份 ---- */
function dataFilePath(){
  return path.join(app.getPath('userData'), 'data.json');
}
function backupFilePath(){
  return path.join(app.getPath('userData'), 'data.backup.json');
}
function saveDataFile(json){
  const f = dataFilePath();
  try{
    // 已存在有效数据时，先滚动备份
    if(fs.existsSync(f)){
      try{
        const prev = fs.readFileSync(f, 'utf-8');
        if(prev && prev.length > 10) fs.writeFileSync(backupFilePath(), prev, 'utf-8');
      }catch(e){ /* 备份失败不阻塞主保存 */ }
    }
    // 原子写入：先写临时文件再改名，避免写一半损坏
    const tmp = f + '.tmp';
    fs.writeFileSync(tmp, json, 'utf-8');
    fs.renameSync(tmp, f);
    return true;
  }catch(err){
    console.error('saveDataFile failed:', err);
    return false;
  }
}
function loadDataFile(){
  const f = dataFilePath();
  try{
    if(!fs.existsSync(f)) return null;
    const raw = fs.readFileSync(f, 'utf-8');
    if(!raw || !raw.trim()) return null;
    // 主文件损坏时尝试备份
    try{ JSON.parse(raw); }catch(e){
      const bf = backupFilePath();
      if(fs.existsSync(bf)) return fs.readFileSync(bf, 'utf-8');
      return null;
    }
    return raw;
  }catch(err){
    console.error('loadDataFile failed:', err);
    return null;
  }
}
function deleteDataFile(){
  const f = dataFilePath();
  try{ if(fs.existsSync(f)) fs.unlinkSync(f); return true; }catch(e){ return false; }
}
function exportDataFile(targetPath, json){
  try{
    fs.writeFileSync(targetPath, json, 'utf-8');
    return true;
  }catch(e){ return false; }
}

/* ---- IPC 桥接 ---- */
ipcMain.handle('data:save', (e, json) => saveDataFile(json));
ipcMain.handle('data:load', () => loadDataFile());
ipcMain.handle('data:path', () => dataFilePath());
ipcMain.handle('data:backup-path', () => backupFilePath());
ipcMain.handle('data:delete', () => deleteDataFile());
ipcMain.handle('data:export', (e, targetPath, json) => exportDataFile(targetPath, json));
ipcMain.handle('dialog:save-json', async (e, defaultName, json) => {
  const r = await dialog.showSaveDialog({
    title: '导出数据备份',
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if(r.canceled || !r.filePath) return { ok:false };
  return { ok: exportDataFile(r.filePath, json), path: r.filePath };
});
ipcMain.handle('dialog:open-json', async () => {
  const r = await dialog.showOpenDialog({
    title: '导入数据备份',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if(r.canceled || !r.filePaths || !r.filePaths.length) return { ok:false };
  try{
    const raw = fs.readFileSync(r.filePaths[0], 'utf-8');
    JSON.parse(raw); // 校验
    return { ok:true, content: raw, path: r.filePaths[0] };
  }catch(err){
    return { ok:false, error: String(err && err.message || err) };
  }
});

/* ---- 单实例锁 ---- */
const gotLock = app.requestSingleInstanceLock();
if(!gotLock){
  app.quit();
} else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if(w){ if(w.isMinimized()) w.restore(); w.focus(); }
  });

  let mainWindow = null;
  function createWindow(){
    mainWindow = new BrowserWindow({
      width: 1440,
      height: 920,
      minWidth: 1040,
      minHeight: 680,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: '#F4F1EA',
      icon: path.join(__dirname, 'build', 'icon.ico'),
      title: 'ScholarTrack 投稿管理',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false
      }
    });
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.on('closed', () => { mainWindow = null; });
  }

  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => { if(BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });
}
