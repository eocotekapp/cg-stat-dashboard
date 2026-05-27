# CG Quán Ăn - Dashboard Thống Kê Riêng

Project riêng cho dashboard doanh thu/lợi nhuận/thống kê.

## Không sửa web chính
Project này chỉ đọc dữ liệu từ database `cg_quan_an`.

## Deploy Vercel
Thêm biến môi trường:

```env
DATABASE_URL=postgresql://...
DASHBOARD_TOKEN=mat_khau_dashboard
```

## Chạy migration
Mở:

```txt
/api/run-migration?token=mat_khau_dashboard
```

## Công thức lợi nhuận
```txt
Lãi = (PRICE - ORIGINAL_PRICE) × quantity
```

Trong đó:
- `PRICE`: giá bán
- `ORIGINAL_PRICE`: giá gốc / giá vốn

## Xuất Excel năm
```txt
/api/export-year?year=2026&token=mat_khau_dashboard
```

File export được lưu metadata 30 ngày trong `yearly_exports`.
