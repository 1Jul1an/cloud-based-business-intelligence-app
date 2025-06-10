import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryBi } from '../db';

/**
 * AWS Lambda Handler zum Abrufen von Versanddaten und Lieferverzögerungen aus der BI-Datenbank.
 * Diese Funktion unterstützt verschiedene Abfragetypen, die über den `type`-Query-Parameter gesteuert werden können.
 * Optional können auch Zeiträume (`from` und `to` Datum) für die Filterung der Daten angegeben werden.
 *
 * Unterstützte `type`-Parameter und deren Rückgabewerte:
 * - `cost`: Gibt die Gesamtkosten pro Lieferanten zurück, absteigend sortiert.
 * - Felder: `supplier_name`, `total_shipping_cost`
 * - `delays`: Gibt die durchschnittliche Lieferzeit in Tagen pro Lieferanten zurück, aufsteigend sortiert.
 * - Felder: `supplier_name`, `average_delivery_time_days`
 * - `cost_timeseries`: Gibt die täglichen Versandkosten als Zeitreihe zurück.
 * - Felder: `order_date`, `daily_shipping_cost`
 * - `delays_timeseries`: Gibt die durchschnittliche tägliche Lieferzeit in Tagen als Zeitreihe zurück.
 * - Felder: `order_date`, `average_daily_delivery_time_days`
 * - (kein `type` oder unbekannter `type`): Standardmäßig werden die Gesamtkosten und die durchschnittliche Lieferzeit
 * pro Lieferanten zurückgegeben.
 * - Felder: `supplier_name`, `total_shipping_cost`, `average_delivery_time_days`
 *
 * @param event Das APIGatewayProxyEvent-Objekt, das folgende optionale Query-Parameter enthalten kann:
 * - `queryStringParameters.type` (optional): Bestimmt den Typ der abzurufenden Versanddaten ('cost', 'delays', 'cost_timeseries', 'delays_timeseries').
 * - `queryStringParameters.from` (optional): Startdatum im Format YYYY-MM-DD zur Filterung der Daten.
 * - `queryStringParameters.to` (optional): Enddatum im Format YYYY-MM-DD zur Filterung der Daten.
 * @returns Ein APIGatewayProxyResult-Objekt mit dem HTTP-Statuscode, Headern und dem JSON-Antwortkörper.
 * Gibt 200 bei Erfolg zurück, 500 bei einem internen Serverfehler während der Abfrage.
 */
export const getShippingDelays: APIGatewayProxyHandler = async (event) => {
  try {
    // Extrahieren der optionalen Query-Parameter
    const type = event.queryStringParameters?.type;
    const fromDate = event.queryStringParameters?.from;
    const toDate = event.queryStringParameters?.to;

    let sqlQuery: string;
    let params: any[] = [];

    // Dynamische Erstellung einer Datumsfilter-Klausel, falls 'from' und 'to' Daten angegeben sind
    let dateFilterClause = '';
    if (fromDate && toDate) {
      dateFilterClause = 'AND order_ts >= ? AND order_ts <= ?';
      params.push(fromDate, toDate);
    }

    // Bestimmen der SQL-Abfrage basierend auf dem 'type'-Parameter
    if (type === 'cost') {
      sqlQuery = `
                SELECT
                    supplier_name,
                    SUM(ship_cost) AS total_shipping_cost
                FROM fact_shipping
                WHERE 1=1 ${dateFilterClause}
                GROUP BY supplier_name
                ORDER BY total_shipping_cost DESC;
            `;
    } else if (type === 'delays') {
      sqlQuery = `
                SELECT
                    supplier_name,
                    AVG(TIMESTAMPDIFF(DAY, order_ts, arrival_ts)) AS average_delivery_time_days
                FROM fact_shipping
                WHERE arrival_ts IS NOT NULL AND order_ts IS NOT NULL ${dateFilterClause}
                GROUP BY supplier_name
                ORDER BY average_delivery_time_days ASC;
            `;
    } else if (type === 'cost_timeseries') {
      sqlQuery = `
                SELECT
                    DATE(order_ts) AS order_date,
                    SUM(ship_cost) AS daily_shipping_cost
                FROM fact_shipping
                WHERE 1=1 ${dateFilterClause}
                GROUP BY DATE(order_ts)
                ORDER BY order_date ASC;
            `;
    } else if (type === 'delays_timeseries') {
      sqlQuery = `
                SELECT
                    DATE(order_ts) AS order_date,
                    AVG(TIMESTAMPDIFF(DAY, order_ts, arrival_ts)) AS average_daily_delivery_time_days
                FROM fact_shipping
                WHERE arrival_ts IS NOT NULL AND order_ts IS NOT NULL ${dateFilterClause}
                GROUP BY DATE(order_ts)
                ORDER BY order_date ASC;
            `;
    }
    else {
      // Standardabfrage, wenn kein oder ein unbekannter 'type' angegeben ist
      sqlQuery = `
                SELECT
                    supplier_name,
                    SUM(ship_cost) AS total_shipping_cost,
                    AVG(TIMESTAMPDIFF(DAY, order_ts, arrival_ts)) AS average_delivery_time_days
                FROM fact_shipping
                WHERE arrival_ts IS NOT NULL AND order_ts IS NOT NULL ${dateFilterClause}
                GROUP BY supplier_name;
            `;
    }

    // Ausführen der ausgewählten SQL-Abfrage in der BI-Datenbank
    const result = await queryBi(sqlQuery, params);

    // Bei Erfolg: HTTP 200 OK Status und die abgefragten Versanddaten als JSON zurückgeben.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    // Bei einem Fehler: Konsolenausgabe des Fehlers und Rückgabe eines HTTP 500 Status
    // mit einer Fehlermeldung im JSON-Format.
    console.error('Error fetching shipping details:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Failed to fetch shipping details', error: (error as Error).message }),
    };
  }
};