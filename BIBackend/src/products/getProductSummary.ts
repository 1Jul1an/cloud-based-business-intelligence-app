import { APIGatewayProxyHandler } from "aws-lambda";
import { queryBi } from "../db";

/**
 * AWS Lambda Handler zum Abrufen einer Zusammenfassung der Verkaufsdaten für ein bestimmtes Produkt.
 * Die Produkt-ID wird aus den Pfadparametern des API-Gateway-Events extrahiert.
 *
 * Die Funktion führt eine SQL-Abfrage auf der BI-Datenbank aus, um folgende Informationen zu erhalten:
 * - product_id
 * - name
 * - sku
 * - total_sales (Gesamtzahl der Verkäufe)
 * - total_quantity (Gesamtverkaufte Menge)
 * - avg_price (Durchschnittlicher Verkaufspreis, gerundet auf 2 Dezimalstellen)
 * - total_revenue (Gesamtumsatz)
 *
 * @param event Das APIGatewayProxyEvent-Objekt, das die Anfrageinformationen enthält,
 * einschließlich `pathParameters.id` für die Produkt-ID.
 * @returns Ein APIGatewayProxyResult-Objekt mit dem HTTP-Statuscode, Headern und dem JSON-Antwortkörper.
 * Gibt 200 bei Erfolg zurück, 400 wenn die Produkt-ID fehlt, 404 wenn das Produkt nicht gefunden wird,
 * und 500 bei einem internen Serverfehler.
 */
export const getProductSummary: APIGatewayProxyHandler = async (event) => {
  const id = event.pathParameters?.id;

  // Prüfen, ob die Produkt-ID in den Pfadparametern vorhanden ist
  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Produkt-ID fehlt in der URL." }),
    };
  }

  try {
    // SQL-Abfrage zur Ermittlung der Produktzusammenfassung basierend auf der Produkt-ID
    const rows = await queryBi(
        `
      SELECT
        p.product_id,
        p.name,
        p.sku,
        COUNT(s.sale_id) AS total_sales,
        SUM(s.quantity) AS total_quantity,
        ROUND(AVG(s.act_price), 2) AS avg_price,
        SUM(s.quantity * s.act_price) AS total_revenue
      FROM dim_product p
      LEFT JOIN fact_sales s ON p.product_id = s.product_id
      WHERE p.product_id = ?
      GROUP BY p.product_id
      `,
        [id]
    );

    // Wenn Ergebnisse gefunden wurden, das erste Ergebnis zurückgeben
    if (Array.isArray(rows) && rows.length > 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows[0]),
      };
    } else {
      // Wenn keine Ergebnisse gefunden wurden, bedeutet das, dass das Produkt nicht existiert
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Produkt nicht gefunden." }),
      };
    }
  } catch (error) {
    // Fehlerbehandlung bei Problemen mit der Datenbankabfrage oder anderen Fehlern
    console.error("Error fetching product summary:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};