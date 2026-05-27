module.exports = async function handler(req, res) {
  return res.status(501).json({ ok: false, error: "Tạm thời dùng nút Xuất dữ liệu hiện tại trên dashboard." });
};
