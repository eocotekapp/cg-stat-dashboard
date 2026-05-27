const XLSX = require("xlsx");
const { query, rows, requireToken } = require("./_db");

const num = v => Number(v || 0) || 0;
const norm = v => String(v || "").trim().toLowerCase();

function parseItems(v) {
  if (Array.isArray(v)) return v;
  try {
    const x = JSON.parse(v || "[]");
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}

async function getMenuMap() {
  const result = await query("SELECT id, name, category, original_price, price FROM menu").catch(() => ({ rows: [] }));
  const map = new Map();
  for (const m of rows(result)) {
    const data = { id: m.id, name: m.name, category: m.category, sell: num(m.price), cost: num(m.original_price) };
    [m.id, m.name].map(norm).filter(Boolean).forEach(k => map.set(k, data));
  }
  return map;
}

function lookupMenu(item, map) {
  const keys = [item.id, item.slug, item.menuId, item.menu_id, item.name, item.title].map(norm).filter(Boolean);
  for (const k of keys) if (map.has(k)) return map.get(k);
  return null;
}

module.exports = async function handler(req, res) {
  try {
    if (!requireToken(req, res)) return;

    const year = Number(req.query.year || new Date().getFullYear());
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const menuMap = await getMenuMap();

    const orderResult = await query(`
      SELECT *
      FROM orders
      WHERE COALESCE(created_at, updated_at, now()) >= $1
        AND COALESCE(created_at, updated_at, now()) < $2
      ORDER BY COALESCE(created_at, updated_at, now()) ASC
    `, [start.toISOString(), end.toISOString()]).catch(() => ({ rows: [] }));

    const bookingsResult = await query(`
      SELECT *
      FROM bookings
      WHERE COALESCE(created_at, updated_at, now()) >= $1
        AND COALESCE(created_at, updated_at, now()) < $2
      ORDER BY COALESCE(created_at, updated_at, now()) ASC
    `, [start.toISOString(), end.toISOString()]).catch(() => ({ rows: [] }));

    const inventoryResult = await query("SELECT * FROM inventory ORDER BY name ASC").catch(() => ({ rows: [] }));

    const detailRows = [];
    const dailyMap = new Map();
    const itemMap = new Map();

    for (const order of rows(orderResult)) {
      const done = ["done", "completed", "complete", "paid", "success", "finished", "closed"].includes(norm(order.status));
      if (!done) continue;

      const date = new Date(order.created_at || order.updated_at || Date.now()).toISOString().slice(0, 10);
      const items = parseItems(order.items || order.menu_items || order.order_items);

      for (const item of items) {
        const menu = lookupMenu(item, menuMap);
        const qty = num(item.qty ?? item.quantity ?? item.count ?? 1) || 1;
        const price = num(item.price ?? item.sellPrice ?? item.salePrice) || num(menu?.sell);
        const cost = num(item.originalPrice ?? item.original_price ?? item.cost ?? item.capital) || num(menu?.cost);
        const revenue = price * qty;
        const totalCost = cost * qty;
        const profit = revenue - totalCost;
        const name = item.name || item.title || menu?.name || "Món";

        detailRows.push({ Ngày: date, "Mã đơn": order.id || order.order_code || "", "Tên món": name, "Số lượng": qty, "Giá bán": price, "Giá vốn": cost, "Doanh thu": revenue, "Tổng vốn": totalCost, "Lãi": profit, "Bàn": order.table_id || order.table || "", "Trạng thái": order.status || "" });

        const d = dailyMap.get(date) || { Ngày: date, "Doanh thu": 0, "Giá vốn": 0, "Lãi": 0, "Số món": 0 };
        d["Doanh thu"] += revenue;
        d["Giá vốn"] += totalCost;
        d["Lãi"] += profit;
        d["Số món"] += qty;
        dailyMap.set(date, d);

        const im = itemMap.get(name) || { "Tên món": name, "Số lượng": 0, "Doanh thu": 0, "Giá vốn": 0, "Lãi": 0 };
        im["Số lượng"] += qty;
        im["Doanh thu"] += revenue;
        im["Giá vốn"] += totalCost;
        im["Lãi"] += profit;
        itemMap.set(name, im);
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([...dailyMap.values()]), "Theo ngày");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), "Chi tiết đơn");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([...itemMap.values()]), "Theo món");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows(bookingsResult)), "Đặt bàn");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows(inventoryResult)), "Tồn kho");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `cg-quan-an-report-${year}.xlsx`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await query("DELETE FROM yearly_exports WHERE export_year = $1", [year]).catch(() => null);
    await query("INSERT INTO yearly_exports(export_year, file_name, file_base64, expires_at) VALUES($1, $2, $3, $4)", [year, fileName, buffer.toString("base64"), expiresAt.toISOString()]).catch(() => null);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("export-year error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
