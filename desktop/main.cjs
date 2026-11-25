const {app,BrowserWindow,ipcMain,dialog} = require('electron');
const {spawn} = require('node:child_process');
const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');
let backend;
const token=crypto.randomBytes(32).toString('hex');
if(!app.requestSingleInstanceLock()) app.quit();
ipcMain.on('studio-token',(event)=>{event.returnValue=token});
async function startBackend(){
 const base=path.join(__dirname,'..');
 const resources=app.isPackaged?app.getAppPath()+'.unpacked':base;
 const env={...process.env,STUDIO_FRONTEND:path.join(resources,'frontend','dist'),STUDIO_TOKEN:token,STUDIO_DATA:path.join(app.getPath('userData'),'data'),STUDIO_NODE:process.execPath,STUDIO_LINTER:path.join(resources,'tools','lint.mjs')};
 const exe=app.isPackaged?path.join(process.resourcesPath,'backend','studio-backend.exe'):path.join(base,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
 const args=app.isPackaged?[]:[path.join(base,'backend','run.py')];
 if(!fs.existsSync(exe))throw Error('Backend assente. Eseguire prima scripts/setup.ps1 o il packaging del backend.');
 backend=spawn(exe,args,{cwd:app.isPackaged?process.resourcesPath:base,env,windowsHide:true,stdio:'pipe'});
 const log=fs.createWriteStream(path.join(app.getPath('userData'),'backend.log'),{flags:'a'});
 backend.stdout.pipe(log);backend.stderr.pipe(log);
 let failed;
 backend.on('error',e=>{failed=e});
 backend.on('exit',code=>{failed=new Error('Backend terminato: '+code)});
 for(let i=0;i<100;i++){
   if(failed)throw failed;
   try{const r=await fetch('http://127.0.0.1:8765/api/health',{headers:{'X-Studio-Token':token}});if(r.ok)return;}catch{}
   await new Promise(r=>setTimeout(r,200));
 }
 throw Error('Backend non pronto sulla porta 8765. Consultare backend.log e liberare la porta.');
}
app.whenReady().then(async()=>{
 try{await startBackend();}catch(e){dialog.showErrorBox('Avvio non riuscito',e.message);app.quit();return;}
 const win=new BrowserWindow({width:1510,height:950,minWidth:1100,minHeight:720,title:'Schneider PLC AI Studio',backgroundColor:'#12171e',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',event=>event.preventDefault());
 win.loadURL('http://127.0.0.1:8765/');
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{if(backend&&!backend.killed)backend.kill()});
