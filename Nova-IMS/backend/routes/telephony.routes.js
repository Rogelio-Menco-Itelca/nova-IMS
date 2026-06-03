const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");

// GET /api/telephony/lookup/:phone
router.get("/lookup/:phone", async (req, res) => {
  try {
    const phone = req.params.phone;

    const [rows] = await pool.query(
      "SELECT * FROM people WHERE phone = ? LIMIT 1",
      [phone],
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Número no registrado",
      });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("Error lookup:", error);

    return res.status(500).json({
      message: "Error interno",
    });
  }
});

module.exports = router;
