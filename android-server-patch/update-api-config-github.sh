#!/data/data/com.termux/files/usr/bin/bash
if [ -z "$GITHUB_TOKEN" ] || [ -z "$GITHUB_USER" ] || [ -z "$GITHUB_REPO" ] || [ -z "$CF_URL" ]; then
  echo "Thiếu GITHUB_TOKEN/GITHUB_USER/GITHUB_REPO/CF_URL"
  exit 1
fi
CONFIG_PATH="${CONFIG_PATH:-api-config.json}"
API_URL="https://api.github.com/repos/$GITHUB_USER/$GITHUB_REPO/contents/$CONFIG_PATH"
OLD_SHA=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "$API_URL" | grep -o '"sha": *"[^"]*"' | head -n 1 | cut -d '"' -f4)
JSON_CONTENT=$(cat <<EOF
{
  "apiBaseUrl": "$CF_URL",
  "updatedAt": "$(date -Iseconds)",
  "source": "termux-android-server"
}
EOF
)
BASE64_CONTENT=$(printf "%s" "$JSON_CONTENT" | base64 | tr -d '\n')
if [ -z "$OLD_SHA" ]; then
  curl -s -X PUT -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "$API_URL" -d "{"message":"create api config","content":"$BASE64_CONTENT"}"
else
  curl -s -X PUT -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "$API_URL" -d "{"message":"update api config","content":"$BASE64_CONTENT","sha":"$OLD_SHA"}"
fi
echo "Updated online config: $CF_URL"
