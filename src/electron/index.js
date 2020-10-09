const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');
const { promisify } = require('bluebird');
const readdirAboslute = require('readdir-absolute');

const readdir = promisify(readdirAboslute);

app.setName('WaveMP');

const isMac = process.platform === 'darwin';

const openDialog = (type = 'file') => {
  const properties = ['multiSelections'];
  if (type === 'both') properties.unshift('openDirectory', 'openFile');
  else if (type === 'folder') properties.unshift('openDirectory');
  else if (type === 'file') properties.unshift('openFile');

  dialog.showOpenDialog(mainWindow, {
    properties,
    filters: [
      {name: 'Musicas', extensions: ['mp3']},
    ]
  }, filePaths => {
    if (!filePaths) return;
    const flatten = arr => {
        let flatted = [];
        for(let i = 0; i < arr.length; i++) {
            if (Array.isArray(arr[i])) {
              flatted = flatted.concat(flatten(arr[i]));
            } else flatted.push(arr[i]);
        }
        return flatted;
    }
    const paths = filePaths.map(path => {
      if(fs.lstatSync(path).isDirectory()) return readdir(path);
      return Promise.resolve(path);
    });
    Promise.all(paths).then(values => {
      if (values.length === 1) values[0] = [values[0]];
      const filteredPaths = flatten(values)
        .filter(path => path.endsWith('.mp3'));
        mainWindow.webContents.send('files:open', filteredPaths);
    });
  });
}

// Menu

const fileSub = [
  {
    label: isMac ? 'Abrir' : 'Abrir Archivo',
    click() {
      openDialog(isMac ? 'both' : 'file');
    },
    accelerator: isMac ? 'Command+O' : 'Ctrl+O',
  }
];

const mainMenuTemplate = [
  {
    label: 'Archivo',
    submenu: fileSub,
  }
];

if (isMac) {
  mainMenuTemplate.unshift({
    label: app.getName(),
    submenu: [
      { role: 'about'},
      { type: 'separator'},
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      {
        label: 'Salir',
        accelerator: isMac ? 'Command+Q' : 'Ctrl+Q',
        click() {
          app.quit();
        }
      },
    ]
  })
} else {
  fileSub.push({
    label: 'Abrir Carpeta',
    click() {
      openDialog('Carpeta');
    },
    accelerator: 'Ctrl+Shift+O',
  })
}

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    titleBarStyle: 'hidden',
    webPreferences: { webSecurity: false },
    icon: path.join(__dirname, '../assets/icons/png/64x64.png'),
  });
  mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../../build/index.html')}`);
  mainWindow.on('closed', () => { mainWindow = null });
  mainWindow.setMinimumSize(420, 530);
  mainWindow.setMaximumSize(1600, 900);
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  Menu.setApplicationMenu(mainMenu);
}

if (isDev) {
  mainMenuTemplate.push({
    label: 'Herramientas de Desarrollo',
    submenu: [
      {
        label: 'Mostrar DevTools',
        accelerator: isMac ? 'Command+I' : 'Ctrl+I',
        click(item, focusedWindow) {
          focusedWindow.toggleDevTools();
        }
      },
      { role: 'reload' }
    ]
  })
}

// open dialog from the app
ipcMain.on('dialog:open', openDialog);

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate',() => {
  if (mainWindow === null) {
    createWindow()
  }
});
