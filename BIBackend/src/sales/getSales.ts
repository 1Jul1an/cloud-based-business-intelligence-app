import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryBi } from '../db';

/**
 * AWS Lambda Handler zum Abrufen aller Verkaufsdaten aus der BI-Datenbank.
 * Diese Funktion führt eine komplexe SQL-Abfrage aus, um detaillierte Verkaufsdatensätze
 * zu aggregieren, einschließlich Produktinformationen und Plattformdetails.
 *
 * Die Abfrage liefert für jeden Verkaufsdatensatz folgende Informationen:
 * - sale_id (Verkaufs-ID)
 * - product_name (Name des Produkts)
 * - platform_name (Name der Verkaufsplattform)
 * - date (Verkaufsdatum und -zeit)
 * - quantity (Verkaufte Menge)
 * - sell_price (Tatsächlicher Verkaufspreis pro Einheit)
 * - ref_cost (Referenzkosten pro Einheit)
 * - profit (Berechneter Gewinn für den gesamten Verkaufsposten)
 *
 * @param event Das APIGatewayProxyEvent-Objekt. Da dieser Handler keine spezifischen
 * Pfad- oder Abfrageparameter benötigt, wird das Event-Objekt hier
 * hauptsächlich für die Lambda-Signatur verwendet.
 * @returns Ein APIGatewayProxyResult-Objekt mit dem HTTP-Statuscode, Headern und dem JSON-Antwortkörper.
 * Gibt 200 bei Erfolg zurück, 500 bei einem internen Serverfehler während der Abfrage.
 */
export const getSales: APIGatewayProxyHandler = async (event) => {
  try {
    // Führt eine SQL-Abfrage auf der BI-Datenbank aus, um alle Verkaufsdaten
    // zusammen mit relevanten Produkt- und Plattforminformationen abzurufen.
    const result = await queryBi(`
            SELECT
                fs.sale_id,
                dp.name AS product_name,
                dplat.name AS platform_name,
                fs.date_ts AS date,
                fs.quantity,
                fs.act_price AS sell_price,
                fs.act_cost AS ref_cost,
                (fs.act_price - fs.act_cost) * fs.quantity AS profit
            FROM fact_sales fs
            JOIN dim_product dp ON fs.product_id = dp.product_id
            JOIN dim_platform dplat ON fs.platform_id = dplat.platform_id;
        `);

    // Bei Erfolg: HTTP 200 OK Status und die abgefragten Verkaufsdaten als JSON zurückgeben.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    // Bei einem Fehler: Konsolenausgabe des Fehlers und Rückgabe eines HTTP 500 Status
    // mit einer Fehlermeldung im JSON-Format.
    console.error('Error fetching all sales:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Failed to fetch all sales', error: (error as Error).message }),
    };
  }
};