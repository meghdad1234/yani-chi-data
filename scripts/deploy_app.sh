#!/bin/sh
# روی سرور اجرا می‌شود: فایل‌های برنامه را از این مخزن به پروژهٔ سایت کپی می‌کند (با بکاپ)
# اجرا: sh scripts/deploy_app.sh
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
APP="${APP_DIR:-/var/www/yani-chi}"
TS=$(date +%Y%m%d%H%M%S)

for f in src/lib/wikidb.ts src/lib/infographic.ts src/lib/labels.ts src/components/WikiResult.tsx src/app/api/lookup/route.ts src/app/globals.css; do
  if [ -f "$APP/$f" ]; then cp "$APP/$f" "$APP/$f.bak-v3-$TS"; fi
done

mkdir -p "$APP/src/lib" "$APP/src/components" "$APP/src/app/api/lookup"
cp "$REPO/app/src/lib/types.ts" "$APP/src/lib/types.ts"
cp "$REPO/app/src/lib/wikidb.ts" "$APP/src/lib/wikidb.ts"
cp "$REPO/app/src/lib/infographic.ts" "$APP/src/lib/infographic.ts"
cp "$REPO/app/src/components/WikiResult.tsx" "$APP/src/components/WikiResult.tsx"
cp "$REPO/app/src/app/api/lookup/route.ts" "$APP/src/app/api/lookup/route.ts"

if ! grep -q "LANG_FA" "$APP/src/lib/labels.ts"; then cat "$REPO/app/src/lib/labels_add.ts" >> "$APP/src/lib/labels.ts"; fi
if ! grep -q "wiki-origin" "$APP/src/app/globals.css"; then cat "$REPO/app/css_add.css" >> "$APP/src/app/globals.css"; fi

echo "DEPLOY_FILES_OK (بکاپ‌ها با پسوند .bak-v3-$TS)"
