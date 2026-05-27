#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
POSTGRES_DIR="$PREFIX/var/lib/postgresql"
pg_ctl -D "$POSTGRES_DIR" status >/dev/null 2>&1
[ $? -ne 0 ] && pg_ctl -D "$POSTGRES_DIR" start -l "$HOME/postgres.log"
for i in {1..30}; do pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && break; sleep 1; done
pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 || exit 1
cd ~/android-server || exit 1
pm2 resurrect
sleep 3
pm2 describe cg-api >/dev/null 2>&1
if [ $? -ne 0 ]; then pm2 start server.js --name cg-api; else pm2 restart cg-api; fi
sleep 5
pkill -9 -f cloudflared
sleep 2
rm -f ~/android-server/cloudflare.log
nohup cloudflared tunnel --url http://localhost:3000 > ~/android-server/cloudflare.log 2>&1 &
CF_URL=""
for i in {1..60}; do
  CF_URL=$(grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' ~/android-server/cloudflare.log | tail -n 1)
  [ -n "$CF_URL" ] && break
  sleep 1
done
export GITHUB_TOKEN="GITHUB_TOKEN_CUA_BAN"
export GITHUB_USER="GITHUB_USERNAME_CUA_BAN"
export GITHUB_REPO="cg-online-config"
export CONFIG_PATH="api-config.json"
export CF_URL="$CF_URL"
[ -n "$CF_URL" ] && bash ~/android-server/update-api-config-github.sh
BOT_TOKEN="TELEGRAM_BOT_TOKEN_CUA_BAN"
CHAT_ID="TELEGRAM_CHAT_ID_CUA_BAN"
curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" -d chat_id="$CHAT_ID" -d text="🚀 Server CG Quán Ăn đã online

🌍 Cloudflare URL mới:
$CF_URL

🕒 $(date)"
