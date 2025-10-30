const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let wsServerProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 960,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');
}

function startWebSocketServer() {
  console.log('Attempting to start WebSocket server...');
  
  wsServerProcess = spawn('./server.pl');

  wsServerProcess.stdout.on('data', (data) => {
    console.log(`WebSocket Server stdout: ${data}`);
  });

  wsServerProcess.stderr.on('data', (data) => {
    console.error(`WebSocket Server stderr: ${data}`);
  });

  wsServerProcess.on('close', (code) => {
    console.log(`WebSocket Server process exited with code ${code}`);
  });

  wsServerProcess.on('error', (err) => {
    console.error('Failed to start WebSocket server process.', err);
  });
}

app.whenReady().then(() => {
  startWebSocketServer();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('Terminating WebSocket server process...');
  if (wsServerProcess) {
    wsServerProcess.kill();
  }
});
