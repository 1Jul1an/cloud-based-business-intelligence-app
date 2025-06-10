import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryBi } from '../db';

/**
 * AWS Lambda Handler zum Abrufen einer aggregierten Verkaufszusammenfassung pro Plattform aus der BI-Datenbank.
 * Diese Funktion führt eine SQL-Abfrage aus, um wichtige Kennzahlen wie die Gesamtzahl der Verkäufe,
 * den Gesamtumsatz und den Gesamtgewinn, gruppiert nach Verkaufsplattform, zu ermitteln.
 * Die Ergebnisse werden absteigend nach dem Gesamtumsatz sortiert.
 *
 * Die Abfrage liefert für jede Plattform folgende zusammenfassende Informationen:
 * - platform (Name der Verkaufsplattform)
 * - total_sales_count (Gesamtzahl der verkauften Einheiten)
 * - total_revenue (Gesamtumsatz über alle Verkäufe auf dieser Plattform)
 * - total_profit (Gesamtgewinn über alle Verkäufe auf dieser Plattform)
 *
 * @param event Das APIGatewayProxyEvent-Objekt. Da dieser Handler keine spezifischen
 * Pfad- oder Abfrageparameter benötigt, wird das Event-Objekt hier
 * hauptsächlich für die Lambda-Signatur verwendet.
 * @returns Ein APIGatewayProxyResult-Objekt mit dem HTTP-Statuscode, Headern und dem JSON-Antwortkörper.
 * Gibt 200 bei Erfolg zurück, 500 bei einem internen Serverfehler während der Abfrage.
 */
export const getSalesSummary: APIGatewayProxyHandler = async (event) => {
  try {
    // Führt eine SQL-Abfrage auf der BI-Datenbank aus, um Verkaufsdaten pro Plattform zu aggregieren.
    const result = await queryBi(`
            SELECT
                dp.name AS platform,
                SUM(fs.quantity) AS total_sales_count,
                SUM(fs.quantity * fs.act_price) AS total_revenue,
                SUM(fs.quantity * (fs.act_price - fs.act_cost)) AS total_profit
            FROM fact_sales fs
            JOIN dim_platform dp ON fs.platform_id = dp.platform_id
            GROUP BY dp.name
            ORDER BY total_revenue DESC;
        `);

    // Bei Erfolg: HTTP 200 OK Status und die aggregierten Verkaufsdaten als JSON zurückgeben.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    // Bei einem Fehler: Konsolenausgabe des Fehlers und Rückgabe eines HTTP 500 Status
    // mit einer Fehlermeldung im JSON-Format.
    console.error('Error fetching sales summary:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Failed to fetch sales summary', error: (error as Error).message }),
    };
  }
};