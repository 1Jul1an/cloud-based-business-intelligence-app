import { APIGatewayProxyHandler } from "aws-lambda";
import { queryBi } from "../db";

/**
 * AWS Lambda Handler zum Speichern eines neuen Verkaufsdatensatzes in der BI-Datenbank.
 * Diese Funktion erwartet die Verkaufsdetails im JSON-Body des API-Gateway-Events.
 *
 * Die erforderlichen Felder im Anfrage-Body sind:
 * - `product_id`: Die ID des verkauften Produkts.
 * - `platform_id`: Die ID der Plattform, auf der der Verkauf stattfand.
 * - `date_ts`: Der Zeitstempel des Verkaufs.
 * - `quantity`: Die Menge der verkauften Produkte.
 * - `act_price`: Der tatsächliche Verkaufspreis pro Einheit.
 * - `act_cost`: Die tatsächlichen Kosten pro Einheit.
 *
 * @param event Das APIGatewayProxyEvent-Objekt, das den JSON-Body mit den Verkaufsdetails enthält.
 * @returns Ein APIGatewayProxyResult-Objekt mit dem HTTP-Statuscode und einem JSON-Antwortkörper.
 * Gibt 201 bei erfolgreicher Speicherung zurück, 400 wenn der Body fehlt oder Pflichtfelder unvollständig sind,
 * und 500 bei einem internen Serverfehler während des Speichervorgangs.
 */
export const postSale: APIGatewayProxyHandler = async (event) => {
  // Überprüfen, ob ein JSON-Body in der Anfrage vorhanden ist
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Kein JSON-Body übergeben." }),
    };
  }

  try {
    // Parsen des JSON-Bodys und Destrukturierung der benötigten Verkaufsdetails
    const { product_id, platform_id, date_ts, quantity, act_price, act_cost } = JSON.parse(event.body);

    // Überprüfen, ob alle Pflichtfelder im Request-Body vorhanden sind
    if (!product_id || !platform_id || !date_ts || !quantity || !act_price || !act_cost) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Pflichtfelder fehlen (product_id, platform_id, date_ts, quantity, act_price, act_cost)." }),
      };
    }

    // Ausführen der INSERT-SQL-Abfrage, um den neuen Verkauf in der fact_sales Tabelle zu speichern
    await queryBi(
        `
      INSERT INTO fact_sales (product_id, platform_id, date_ts, quantity, act_price, act_cost)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
        [product_id, platform_id, date_ts, quantity, act_price, act_cost]
    );

    // Bei Erfolg: HTTP 201 Created Status und eine Erfolgsmeldung zurückgeben
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Verkauf erfolgreich gespeichert." }),
    };
  } catch (error) {
    // Bei einem Fehler: Konsolenausgabe des Fehlers und Rückgabe eines HTTP 500 Status
    // mit einer Fehlermeldung im JSON-Format
    console.error("Error posting sale:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};