import mysql from 'mysql2/promise';

// Konfiguration für die WaWi-Datenbank
const wawiPool = mysql.createPool({
  host: process.env.WAWI_DB_HOST,
  user: process.env.WAWI_DB_USER,
  password: process.env.WAWI_DB_PASSWORD,
  database: process.env.WAWI_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Konfiguration für die BI-Datenbank
const biPool = mysql.createPool({
  host: process.env.BI_DB_HOST,
  user: process.env.BI_DB_USER,
  password: process.env.BI_DB_PASSWORD,
  database: process.env.BI_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Führt eine SQL-Abfrage auf der WaWi-Datenbank aus.
 * @param sql Der SQL-String.
 * @param params Optionale Parameter für die Abfrage.
 * @returns Ein Array von Ergebnisszeilen.
 */
export async function queryWawi(sql: string, params?: any[]): Promise<any[]> {
  try {
    const [rows] = await wawiPool.execute(sql, params);
    return rows as any[];
  } catch (error) {
    console.error("Error executing WaWi query:", error);
    throw error; // Fehler weiterwerfen, damit der aufrufende Lambda ihn behandeln kann
  }
}

/**
 * Führt eine SQL-Abfrage auf der BI-Datenbank aus.
 * @param sql Der SQL-String.
 * @param params Optionale Parameter für die Abfrage.
 * @returns Ein Array von Ergebnisszeilen.
 */
export async function queryBi(sql: string, params?: any[]): Promise<any[]> {
  try {
    const [rows] = await biPool.execute(sql, params);
    return rows as any[];
  } catch (error) {
    console.error("Error executing BI query:", error);
    throw error; // Fehler weiterwerfen
  }
}