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

function getRange(range, start, end) {
  const now = new Date();
  const to = end ? new Date(end) : now;
  const from = start ? new Date(start) : new Date(now);
  const key = String(range || "today");

  if (!start) {
    if (key === "week") from.setDate(now.getDate() - 6);
    else if (key === "month") {
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    } else if (key === "year") {
      from.setMonth(0);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    } else if (key === "all") {
      from.setFullYear(2020);
      from.setMonth(0);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    } else from.setHours(0, 0, 0, 0);
  }

  return { key, from, to };
}

function groupKey(date, mode) {
  const d = new Date(date);
  if (mode === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (mode === "year") return String(d.getFullYear());
  if (mode === "hour") return String(d.getHours()).padStart(2, "0") + ":00";
  return d.toISOString().slice(0, 10);
}

function itemQty(item) {
  return num(item.qty ?? item.quantity ?? item.count ?? 1) || 1;
}

function itemSell(item) {
  return num(item.price ?? item.sellPrice ?? item.salePrice ?? item.unitPrice ?? 0);
}

function itemCost(item) {
  return num(item.originalPrice ?? item.original_price ?? item.cost ?? item.capital ?? item.basePrice ?? 0);
}

function itemName(item) {
  return String(item.name || item.title || item.id || item.slug || "Món");
}

function itemKeys(item) {
  return [item.id, item.slug, item.menuId, item.menu_id, item.name, item.title].map(norm).filter(Boolean);
}

async function getMenuMap() {
  const result = await query("SELECT id, name, category, original_price, price FROM menu").catch(() => ({ rows: [] }));
  const map = new Map();

  for (const m of rows(result)) {
    const data = {
      id: m.id,
      name: m.name,
      category: m.category,
      sell: num(m.price),
      cost: num(m.original_price)
    };
    [m.id, m.name].map(norm).filter(Boolean).forEach(k => map.set(k, data));
  }

  return map;
}

function lookupMenu(item, map) {
  for (const k of itemKeys(item)) if (map.has(k)) return map.get(k);
  return null;
}

function isDone(order) {
  return ["done", "completed", "complete", "paid", "success", "finished", "closed"].includes(norm(order.status));
}

function isCancelled(order) {
  return ["cancelled", "canceled", "cancel", "deleted"].includes(norm(order.status));
}

module.exports = async function handler(req, res) {
  try {
    if (!requireToken(req, res)) return;

    const range = getRange(req.query.range, req.query.start, req.query.end);
    const groupBy = String(req.query.groupBy || "day");
    const menuMap = await getMenuMap();

    const orderResult = await query(`
      SELECT *
      FROM orders
      WHERE COALESCE(created_at, updated_at, now()) >= $1
        AND COALESCE(created_at, updated_at, now()) <= $2
      ORDER BY COALESCE(created_at, updated_at, now()) ASC
    `, [range.from.toISOString(), range.to.toISOString()]).catch(() => ({ rows: [] }));

    const bookingResult = await query(`
      SELECT *
      FROM bookings
      WHERE COALESCE(created_at, updated_at, now()) >= $1
        AND COALESCE(created_at, updated_at, now()) <= $2
    `, [range.from.toISOString(), range.to.toISOString()]).catch(() => ({ rows: [] }));

    const inventoryResult = await query("SELECT * FROM inventory ORDER BY name ASC").catch(() => ({ rows: [] }));

    const orders = rows(orderResult);
    const bookings = rows(bookingResult);
    const inventory = rows(inventoryResult);
    const completed = orders.filter(isDone);
    const cancelled = orders.filter(isCancelled);

    let revenue = 0, cost = 0, profit = 0, productsSold = 0;
    const seriesMap = new Map();
    const hourMap = new Map();
    const itemMap = new Map();
    const tableMap = new Map();
    const customers = new Set();

    for (const order of completed) {
      const created = new Date(order.created_at || order.updated_at || Date.now());
      const tableId = String(order.table_id || order.table || order.tableId || "Mang về");
      const phone = String(order.phone || order.customer_phone || order.customer?.phone || "").trim();
      if (phone) customers.add(phone);

      const items = parseItems(order.items || order.menu_items || order.order_items);
      let orderRevenue = 0, orderCost = 0, orderQty = 0;

      for (const item of items) {
        const menu = lookupMenu(item, menuMap);
        const quantity = itemQty(item);
        const price = itemSell(item) || num(menu?.sell);
        const original = itemCost(item) || num(menu?.cost);
        const lineRevenue = price * quantity;
        const lineCost = original * quantity;
        const lineProfit = lineRevenue - lineCost;

        orderRevenue += lineRevenue;
        orderCost += lineCost;
        orderQty += quantity;
        productsSold += quantity;

        const name = itemName(item);
        const row = itemMap.get(name) || { name, category: menu?.category || item.category || "", quantity: 0, revenue: 0, cost: 0, profit: 0, marginPercent: 0 };
        row.quantity += quantity;
        row.revenue += lineRevenue;
        row.cost += lineCost;
        row.profit += lineProfit;
        row.marginPercent = row.revenue ? row.profit / row.revenue * 100 : 0;
        itemMap.set(name, row);
      }

      if (!orderRevenue) orderRevenue = num(order.total || order.amount || order.price);
      if (!orderCost) orderCost = num(order.cost || order.original_price || order.capital);

      const orderProfit = orderRevenue - orderCost;
      revenue += orderRevenue;
      cost += orderCost;
      profit += orderProfit;

      const g = groupKey(created, groupBy);
      const s = seriesMap.get(g) || { label: g, revenue: 0, cost: 0, profit: 0, orders: 0, items: 0 };
      s.revenue += orderRevenue;
      s.cost += orderCost;
      s.profit += orderProfit;
      s.orders += 1;
      s.items += orderQty;
      seriesMap.set(g, s);

      const h = groupKey(created, "hour");
      const hr = hourMap.get(h) || { label: h, revenue: 0, orders: 0 };
      hr.revenue += orderRevenue;
      hr.orders += 1;
      hourMap.set(h, hr);

      const t = tableMap.get(tableId) || { table: tableId, revenue: 0, cost: 0, profit: 0, orders: 0, items: 0 };
      t.revenue += orderRevenue;
      t.cost += orderCost;
      t.profit += orderProfit;
      t.orders += 1;
      t.items += orderQty;
      tableMap.set(tableId, t);
    }

    const lowStock = inventory.map(x => ({
      id: x.id,
      name: x.name || x.item_name || x.title || "Hàng",
      quantity: num(x.quantity || x.qty || x.stock),
      minQuantity: num(x.min_quantity || x.minQty || x.warning_quantity),
      unit: x.unit || ""
    })).filter(x => x.minQuantity > 0 && x.quantity <= x.minQuantity).sort((a, b) => a.quantity - b.quantity);

    return res.status(200).json({
      ok: true,
      range: { key: range.key, from: range.from.toISOString(), to: range.to.toISOString(), groupBy },
      summary: {
        revenue,
        cost,
        profit,
        marginPercent: revenue ? profit / revenue * 100 : 0,
        completedOrders: completed.length,
        cancelledOrders: cancelled.length,
        totalOrders: orders.length + bookings.length,
        shipOrders: orders.length,
        tableOrders: bookings.length,
        productsSold,
        customers: customers.size,
        avgOrder: completed.length ? revenue / completed.length : 0,
        lowStockCount: lowStock.length
      },
      series: [...seriesMap.values()],
      hourly: [...hourMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
      items: [...itemMap.values()].sort((a, b) => b.revenue - a.revenue),
      tables: [...tableMap.values()].sort((a, b) => b.revenue - a.revenue),
      inventory: { totalItems: inventory.length, lowStock }
    });
  } catch (error) {
    console.error("analytics error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
