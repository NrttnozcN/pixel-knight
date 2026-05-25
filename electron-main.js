const _electron = require('electron');
const app         = _electron.app         || _electron.default && _electron.default.app;
const BrowserWindow = _electron.BrowserWindow || _electron.default && _electron.default.BrowserWindow;
const Menu        = _electron.Menu        || _electron.default && _electron.default.Menu;
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 780,
        minWidth: 900,
        minHeight: 600,
        title: 'EREVORN',
        icon: path.join(__dirname, 'gorseller', 'erevorn_mobile_icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#050508',
        show: false // hazır olunca göster (beyaz flash önler)
    });

    // Menü çubuğunu kaldır — sadece oyun görünsün
    Menu.setApplicationMenu(null);

    win.loadFile('index.html');

    // Pencere hazır olunca göster
    win.once('ready-to-show', () => {
        win.show();
    });

    // F11 ile tam ekran toggle, F12 ile DevTools
    win.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown') {
            if (input.key === 'F11') {
                win.setFullScreen(!win.isFullScreen());
            } else if (input.key === 'F12') {
                win.webContents.toggleDevTools();
            }
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});
