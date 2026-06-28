const { spawnSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

const root = path.resolve(__dirname, '..');
const buildDir = path.join(root, 'build');
const phpDir = path.join(buildDir, 'php');
const phpZip = path.join(buildDir, 'php.zip');
const composerPhar = path.join(buildDir, 'composer.phar');
const phpUrl = process.env.PHP_ZIP_URL || 'https://downloads.php.net/~windows/releases/latest/php-8.4-nts-Win32-vs17-x64-latest.zip';
const composerUrl = process.env.COMPOSER_PHAR_URL || 'https://getcomposer.org/download/latest-stable/composer.phar';

function download(url, destination) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });

    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
                response.resume();
                download(response.headers.location, destination).then(resolve, reject);
                return;
            }

            if (response.statusCode !== 200) {
                response.resume();
                reject(new Error(`Download failed (${response.statusCode}): ${url}`));
                return;
            }

            const file = fs.createWriteStream(destination);
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
            file.on('error', reject);
        });

        request.on('error', reject);
    });
}

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: root,
        stdio: 'inherit',
        shell: false,
        ...options,
    });

    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed`);
    }
}

async function ensurePhp() {
    const phpExe = path.join(phpDir, 'php.exe');
    if (!fs.existsSync(phpExe)) {
        console.log(`Downloading PHP runtime from ${phpUrl}`);
        await download(phpUrl, phpZip);

        fs.rmSync(phpDir, { recursive: true, force: true });
        fs.mkdirSync(phpDir, { recursive: true });
        run('powershell.exe', [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            `Expand-Archive -LiteralPath '${phpZip}' -DestinationPath '${phpDir}' -Force`,
        ]);
    }

    const phpIni = path.join(phpDir, 'php.ini');
    fs.writeFileSync(phpIni, [
        'zend_extension=opcache',
        'extension_dir=ext',
        'extension=curl',
        'extension=fileinfo',
        'extension=mbstring',
        'extension=openssl',
        'extension=pdo_sqlite',
        'extension=sqlite3',
        'extension=zip',
        'memory_limit=512M',
        'opcache.enable=1',
        'opcache.enable_cli=1',
        'opcache.memory_consumption=192',
        'opcache.interned_strings_buffer=16',
        'opcache.max_accelerated_files=20000',
        'opcache.validate_timestamps=0',
        'opcache.save_comments=1',
        'realpath_cache_size=4096K',
        'realpath_cache_ttl=600',
        'variables_order=EGPCS',
        'date.timezone=UTC',
        '',
    ].join('\n'));

    return phpExe;
}

async function ensureComposer() {
    if (!fs.existsSync(composerPhar)) {
        console.log(`Downloading Composer from ${composerUrl}`);
        await download(composerUrl, composerPhar);
    }
}

async function main() {
    if (process.platform !== 'win32') {
        throw new Error('The bundled PHP installer build currently targets Windows.');
    }

    const phpExe = await ensurePhp();
    await ensureComposer();

    run(phpExe, [composerPhar, 'install', '--no-dev', '--optimize-autoloader', '--no-interaction', '--prefer-dist']);
    run(phpExe, ['artisan', 'route:cache'], {
        env: {
            ...process.env,
            APP_NAME: 'CHEMSA',
            APP_ENV: 'production',
            APP_DEBUG: 'false',
            APP_KEY: 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        },
    });

    if (!fs.existsSync(path.join(root, 'public', 'build'))) {
        console.log('public/build is missing; npm run build will create it next.');
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
