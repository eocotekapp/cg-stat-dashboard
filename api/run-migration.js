const fs = require("fs");
const path = require("path");
const { query, requireToken } = require("./_db");

module.exports = async function handler(req, res) {
  try {
    if (!requireToken(req, res)) return;
    const sql = fs.readFileSync(path.join(process.cwd(), "sql", "migration.sql"), "utf8");
    await query(sql);
    return res.status(200).json({ ok: true, message: "Migration OK" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
