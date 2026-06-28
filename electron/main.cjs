const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const path = require('path');

let phpServer = null;

function appRoot() {
    return app.isPackaged ? process.resourcesPath + path.sep + 'app' : path.join(__dirname, '..');
}

function phpBinary() {
    if (!app.isPackaged) {
        return process.env.PHP_BINARY || 'php';
    }

    const binary = process.platform === 'win32' ? 'php.exe' : 'php';
    return path.join(process.resourcesPath, 'php', binary);
}

function ensureDirectory(directory) {
    fs.mkdirSync(directory, { recursive: true });
}

function ensureRuntimeFiles() {
    const dataPath = app.getPath('userData');
    const databasePath = path.join(dataPath, 'database.sqlite');
    const storagePath = path.join(dataPath, 'storage');

    ensureDirectory(dataPath);
    ensureDirectory(storagePath);
    ensureDirectory(path.join(storagePath, 'framework', 'cache'));
    ensureDirectory(path.join(storagePath, 'framework', 'sessions'));
    ensureDirectory(path.join(storagePath, 'framework', 'testing'));
    ensureDirectory(path.join(storagePath, 'framework', 'views'));
    ensureDirectory(path.join(storagePath, 'logs'));

    const createdDatabase = !fs.existsSync(databasePath);
    if (createdDatabase) {
        fs.closeSync(fs.openSync(databasePath, 'w'));
    }

    const keyPath = path.join(dataPath, 'app.key');
    if (!fs.existsSync(keyPath)) {
        const key = 'base64:' + crypto.randomBytes(32).toString('base64');
        fs.writeFileSync(keyPath, key, 'utf8');
    }

    return {
        appKey: fs.readFileSync(keyPath, 'utf8').trim(),
        createdDatabase,
        databasePath,
        storagePath,
    };
}

function laravelEnv(port, runtime) {
    return {
        ...process.env,
        APP_NAME: 'CHEMSA',
        APP_ENV: 'production',
        APP_DEBUG: 'false',
        APP_KEY: runtime.appKey,
        APP_URL: `http://127.0.0.1:${port}`,
        DB_CONNECTION: 'sqlite',
        DB_DATABASE: runtime.databasePath,
        CACHE_STORE: 'database',
        SESSION_DRIVER: 'database',
        QUEUE_CONNECTION: 'database',
        LOG_CHANNEL: 'single',
        VIEW_COMPILED_PATH: path.join(runtime.storagePath, 'framework', 'views'),
        LARAVEL_STORAGE_PATH: runtime.storagePath,
    };
}

function findFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
    });
}

function runArtisan(args, env) {
    return new Promise((resolve, reject) => {
        const child = spawn(phpBinary(), ['artisan', ...args], {
            cwd: appRoot(),
            env,
            windowsHide: true,
        });

        let output = '';
        child.stdout.on('data', (chunk) => {
            output += chunk.toString();
        });
        child.stderr.on('data', (chunk) => {
            output += chunk.toString();
        });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                resolve(output);
                return;
            }

            reject(new Error(output || `php artisan ${args.join(' ')} exited with code ${code}`));
        });
    });
}

function waitForServer(url, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;

    return new Promise((resolve, reject) => {
        const attempt = () => {
            fetch(url)
                .then(() => resolve())
                .catch((error) => {
                    if (Date.now() > deadline) {
                        reject(error);
                        return;
                    }

                    setTimeout(attempt, 300);
                });
        };

        attempt();
    });
}

async function startLaravel() {
    const runtime = ensureRuntimeFiles();
    const port = await findFreePort();
    const env = laravelEnv(port, runtime);

    await runArtisan(['migrate', '--force'], env);
    await runArtisan(['settings:chemsa-currency'], env);
    if (runtime.createdDatabase) {
        const seeders = [
            'Database\\Seeders\\UserSeeder',
            'Database\\Seeders\\UnitSeeder',
            'Database\\Seeders\\CategorySeeder',
            'Database\\Seeders\\FinanceCategorySeeder',
            'Database\\Seeders\\SettingSeeder',
        ];

        for (const seeder of seeders) {
            await runArtisan(['db:seed', `--class=${seeder}`, '--force'], env);
        }
    }

    const viewCacheMarker = path.join(app.getPath('userData'), `.views-cached-${app.getVersion()}`);
    if (!fs.existsSync(viewCacheMarker)) {
        await runArtisan(['view:cache'], env);
        fs.writeFileSync(viewCacheMarker, new Date().toISOString(), 'utf8');
    }

    phpServer = spawn(phpBinary(), ['artisan', 'serve', '--host=127.0.0.1', `--port=${port}`], {
        cwd: appRoot(),
        env,
        windowsHide: true,
    });

    phpServer.on('exit', () => {
        phpServer = null;
    });

    const url = `http://127.0.0.1:${port}`;
    await waitForServer(url);

    return url;
}

function createWindow(url) {
    const win = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 1024,
        minHeight: 700,
        title: 'CHEMSA',
        icon: path.join(appRoot(), 'public', 'images', 'chemsa-logo.jpg'),
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
        const parsedTarget = new URL(targetUrl);
        const parsedApp = new URL(url);

        if (parsedTarget.origin !== parsedApp.origin) {
            return { action: 'deny' };
        }

        return {
            action: 'allow',
            overrideBrowserWindowOptions: {
                width: 980,
                height: 720,
                minWidth: 820,
                minHeight: 560,
                title: 'CHEMSA Receipt',
                icon: path.join(appRoot(), 'public', 'images', 'chemsa-logo.jpg'),
                parent: win,
                webPreferences: {
                    contextIsolation: true,
                    nodeIntegration: false,
                },
            },
        };
    });

    win.once('ready-to-show', () => win.show());
    win.loadURL(url);
}

app.whenReady()
    .then(startLaravel)
    .then(createWindow)
    .catch((error) => {
        dialog.showErrorBox('Chemsa could not start', error.message);
        app.quit();
    });

app.on('window-all-closed', () => {
    app.quit();
});

app.on('before-quit', () => {
    if (phpServer) {
        phpServer.kill();
    }
});
