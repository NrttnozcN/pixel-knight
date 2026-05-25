const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
    // Ensure www exists
    if (!fs.existsSync('www')) {
        fs.mkdirSync('www');
    }

    // Copy index.html, style.css, splash.jpg and menu_bg.jpg
    fs.copyFileSync('index.html', path.join('www', 'index.html'));
    fs.copyFileSync('style.css', path.join('www', 'style.css'));
    if (fs.existsSync('splash.jpg')) {
        fs.copyFileSync('splash.jpg', path.join('www', 'splash.jpg'));
    }
    if (fs.existsSync('menu_bg.jpg')) {
        fs.copyFileSync('menu_bg.jpg', path.join('www', 'menu_bg.jpg'));
    }
    if (fs.existsSync('iron_belltomb.mp3')) {
        fs.copyFileSync('iron_belltomb.mp3', path.join('www', 'iron_belltomb.mp3'));
    }

    // Copy js folder recursively
    function copyDir(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (let entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                copyDir(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    copyDir('js', path.join('www', 'js'));
    if (fs.existsSync('sprites')) {
        copyDir('sprites', path.join('www', 'sprites'));
    }
    if (fs.existsSync('sesler')) {
        copyDir('sesler', path.join('www', 'sesler'));
    }
    if (fs.existsSync('gorseller')) {
        copyDir('gorseller', path.join('www', 'gorseller'));
    }
    console.log('Files copied to www successfully.');

    // Run npx cap sync android
    console.log('Running capacitor sync...');
    execSync('npx cap sync android', { stdio: 'inherit' });
    console.log('Capacitor sync completed successfully!');
} catch (err) {
    console.error('Error during sync:', err);
    process.exit(1);
}
