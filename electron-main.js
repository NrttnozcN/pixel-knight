const { app, BrowserWindow, Menu } = require('electron');
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

    // F11 ile tam ekran toggle
    win.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11' && input.type === 'keyDown') {
            win.setFullScreen(!win.isFullScreen());
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});
