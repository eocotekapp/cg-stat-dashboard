const { query, rows, requireToken } = require("./_db");

module.exports = async function handler(req, res) {
  try {
    if (!requireToken(req, res)) return;
    await query("DELETE FROM yearly_exports WHERE expires_at < now()").catch(() => null);
    const result = await query(`
      SELECT id, export_year, file_name, expires_at, download_count, created_at
      FROM yearly_exports
      ORDER BY export_year DESC, created_at DESC
    `).catch(() => ({ rows: [] }));
    return res.status(200).json({ ok: true, items: rows(result) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};
