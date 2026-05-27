const { Pool } = require("pg");

let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("Thiếu DATABASE_URL");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined
    });
  }
  return pool;
}

function query(text, params = []) {
  return getPool().query(text, params);
}

function rows(result) {
  return result?.rows || [];
}

function requireToken(req, res) {
  const token =
    req.query?.token ||
    req.headers["x-dashboard-token"] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!process.env.DASHBOARD_TOKEN) return true;

  if (token !== process.env.DASHBOARD_TOKEN) {
    res.status(401).json({ ok: false, error: "Sai token dashboard" });
    return false;
  }

  return true;
}

module.exports = { query, rows, requireToken };
