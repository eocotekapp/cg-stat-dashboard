# Setup từ đầu tới cuối

## 1. Tạo repo config online

Tạo repo GitHub mới:

```txt
cg-online-config
```

Tạo file:

```txt
api-config.json
```

Nội dung:

```json
{
  "apiBaseUrl": "https://tam-thoi.trycloudflare.com",
  "updatedAt": "init",
  "source": "manual"
}
```

Lấy raw URL:

```txt
https://raw.githubusercontent.com/USER/cg-online-config/main/api-config.json
```

## 2. Sửa dashboard

Mở `config.js`, sửa:

```js
CONFIG_URL: "RAW_URL_Ở_TRÊN"
DASHBOARD_TOKEN: "TOKEN_CỦA_BẠN"
```

Push project dashboard này lên GitHub rồi deploy Vercel.

Vercel không cần DATABASE_URL.

## 3. Cài patch vào Android server

Copy:

```txt
android-server-patch/api/dashboard-analytics.js
android-server-patch/api/dashboard-export-year.js
```

vào:

```bash
~/android-server/api/
```

Copy:

```txt
android-server-patch/update-api-config-github.sh
```

vào:

```bash
~/android-server/update-api-config-github.sh
chmod +x ~/android-server/update-api-config-github.sh
```

Mở:

```bash
nano ~/android-server/server.js
```

Thêm route:

```js
"/api/dashboard-analytics": require("./api/dashboard-analytics"),
"/api/dashboard-export-year": require("./api/dashboard-export-year"),
```

## 4. Thêm token dashboard vào Android server

Trong `~/android-server/.env` thêm:

```env
DASHBOARD_TOKEN=TOKEN_CỦA_BẠN
```

Restart:

```bash
pm2 restart cg-api
pm2 save
```

Test:

```bash
curl "http://127.0.0.1:3000/api/dashboard-analytics?token=TOKEN_CỦA_BẠN"
```

## 5. GitHub token để Android tự cập nhật link

Tạo GitHub token có quyền:

```txt
Contents: Read and write
```

Chỉ cấp cho repo `cg-online-config`.

## 6. Sửa boot script

Tham khảo file:

```txt
android-server-patch/start-server-template.sh
```

Quan trọng phải có đoạn:

```bash
export GITHUB_TOKEN="..."
export GITHUB_USER="..."
export GITHUB_REPO="cg-online-config"
export CF_URL="$CF_URL"
bash ~/android-server/update-api-config-github.sh
```

## 7. Test

Chạy:

```bash
bash ~/.termux/boot/start-server.sh
```

Mở raw config, phải thấy link Cloudflare mới.

Mở dashboard Vercel, bấm **Tải dữ liệu**.

## Công thức lãi

```txt
Lãi = (PRICE - ORIGINAL_PRICE) × quantity
```
