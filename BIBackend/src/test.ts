import { pool } from "./db";

(async () => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    console.log(rows);
  } catch (error) {
    console.error("Fehler bei der DB-Verbindung:", error);
  }
})();