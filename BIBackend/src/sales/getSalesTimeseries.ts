import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryBi } from '../db';

/**
 * AWS Lambda Handler zum Abrufen von Verkaufsdaten als Zeitreihe aus der BI-Datenbank.
 * Diese Funktion ermöglicht es, Verkaufsmetriken (Gesamtmenge, Gesamtumsatz, Gesamtgewinn)
 * nach Datum zu aggregieren. Optional können ein Start- und Enddatum für die Filterung
 * der Daten angegeben werden.
 *
 * Die Abfrage liefert für jedes Datum im angegebenen oder gesamten Zeitraum folgende Informationen:
 * - date (Datum der Verkäufe im Format YYYY-MM-DD)
 * - total_quantity (Gesamtmenge der an diesem Datum verkauften Produkte)
 * - total_revenue (Gesamtumsatz an diesem Datum)
 * - total_profit (Gesamtgewinn an diesem Datum)
 *
 * @param event Das APIGatewayProxyEvent-Objekt, das Abfrageparameter enthalten kann:
 * - `queryStringParameters.from` (optional): Startdatum im Format YYYY-MM-DD zur Filterung der Verkäufe.
 * - `queryStringParameters.to` (optional): Enddatum im Format YYYY-MM-DD zur Filterung der Verkäufe.
 * @returns Ein APIGatewayProxyResult-Objekt mit dem HTTP-Statuscode, Headern und dem JSON-Antwortkörper.
 * Gibt 200 bei Erfolg zurück, 500 bei einem internen Serverfehler während der Abfrage.
 */
export const getSalesTimeseries: APIGatewayProxyHandler = async (event) => {
  try {
    // Extrahieren der optionalen 'from' und 'to' Datumsfilter aus den Query-Parametern
    const fromDate = event.queryStringParameters?.from;
    const toDate = event.queryStringParameters?.to;

    let whereClause = '';
    const params = [];

    // Wenn 'from' und 'to' Daten vorhanden sind, wird eine WHERE-Klausel für den Datumsbereich erstellt.
    if (fromDate && toDate) {
      whereClause = 'WHERE fs.date_ts >= ? AND fs.date_ts <= ?';
      params.push(fromDate, toDate);
    }

    // Führt eine SQL-Abfrage auf der BI-Datenbank aus, um Verkaufsdaten nach Datum zu aggregieren.
    // Die WHERE-Klausel wird dynamisch basierend auf den vorhandenen Datumsfiltern hinzugefügt.
    const result = await queryBi(`
            SELECT
                DATE_FORMAT(fs.date_ts, '%Y-%m-%d') AS date,
                SUM(fs.quantity) AS total_quantity,
                SUM(fs.quantity * fs.act_price) AS total_revenue,
                SUM(fs.quantity * (fs.act_price - fs.act_cost)) AS total_profit
            FROM fact_sales fs
            ${whereClause}
            GROUP BY DATE_FORMAT(fs.date_ts, '%Y-%m-%d')
            ORDER BY date ASC;
        `, params);

    // Bei Erfolg: HTTP 200 OK Status und die aggregierten Zeitreihendaten als JSON zurückgeben.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    // Bei einem Fehler: Konsolenausgabe des Fehlers und Rückgabe eines HTTP 500 Status
    // mit einer Fehlermeldung im JSON-Format.
    console.error('Error fetching sales timeseries:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Failed to fetch sales timeseries', error: (error as Error).message }),
    };
  }
};