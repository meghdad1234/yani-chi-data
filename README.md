# yani-chi-data

داده و اسکریپت‌های «یعنی‌چی؟».

- `scripts/fetch_kaikki.mjs`: دانلود واژه‌های فارسی از Kaikki.org و ذخیره در `data/fa`
- `scripts/build_sqlite.mjs`: ساخت دیتابیس SQLite روی سرور
- `scripts/update_server.sh`: pull و ساخت مجدد (برای cron)

## منبع و مجوز
داده‌ها از ویکی‌واژه (Wiktionary) استخراج شده‌اند و از طریق Kaikki.org / wiktextract منتشر می‌شوند.
مجوز: CC BY-SA 4.0 — در سایت باید ذکر منبع (ویکی‌واژه) و انتشار با همان مجوز رعایت شود.
هیچ کلید یا رمزی در این مخزن نگذارید؛ کلیدها فقط در GitHub Secrets.
