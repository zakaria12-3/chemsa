#!/usr/bin/env sh
set -eu

cd /var/www/html

if [ -n "${RENDER_EXTERNAL_URL:-}" ] && [ -z "${APP_URL:-}" ]; then
    export APP_URL="$RENDER_EXTERNAL_URL"
fi

if [ -z "${APP_KEY:-}" ]; then
    export APP_KEY="$(php artisan key:generate --show --no-ansi)"
fi

mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/testing storage/framework/views storage/logs bootstrap/cache

php artisan optimize:clear --no-ansi || true
php artisan migrate --force --no-ansi
php artisan db:seed --class=Database\\Seeders\\UserSeeder --force --no-ansi
php artisan db:seed --class=Database\\Seeders\\UnitSeeder --force --no-ansi
php artisan db:seed --class=Database\\Seeders\\CategorySeeder --force --no-ansi
php artisan db:seed --class=Database\\Seeders\\FinanceCategorySeeder --force --no-ansi
php artisan db:seed --class=Database\\Seeders\\SettingSeeder --force --no-ansi
php artisan settings:chemsa-currency --no-ansi
php artisan storage:link --no-ansi || true
php artisan config:cache --no-ansi
php artisan route:cache --no-ansi
php artisan view:cache --no-ansi

exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"
