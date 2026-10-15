#!/bin/sh
# روی سرور ایران اجرا می‌شود: آخرین داده را از گیت‌هاب می‌گیرد و دیتابیس را دوباره می‌سازد
set -e
cd "$(dirname "$0")/.."
git pull --ff-only
node scripts/build_sqlite.mjs data/fa /var/www/yani-chi-db/yani.db
