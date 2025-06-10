import { APIGatewayProxyHandler } from "aws-lambda";
import { queryBi } from "../db";

/**
 * AWS Lambda Handler zum Aktualisieren eines bestehenden Produkts in der BI-Datenbank.
 * Die Produkt-ID wird aus den Pfadparametern extrahiert und die zu aktualisierenden Daten
 * (name, sku, ref_cost) werden aus dem Anfrage-Body gelesen.
 *
 * Die Funktion führt eine SQL-UPDATE-Abfrage aus, um die Produktdetails zu aktualisieren.
 *
 * @param event Das APIGatewayProxyEvent-Objekt, das die Anfrageinformationen enthält,
 * einschließlich `pathParameters.id` für die Produkt-ID und `body` mit den
 * zu aktualisierenden Produktdaten im JSON-Format.
 * @returns Ein APIGatewayProxyResult-Objekt mit dem HTTP-Statuscode, Headern und dem JSON-Antwortkörper.
 * Gibt 200 bei erfolgreicher Aktualisierung zurück, 400 wenn Parameter oder Body fehlen/ungültig sind,
 * 404 wenn das Produkt nicht gefunden wurde oder keine Änderungen vorgenommen wurden,
 * und 500 bei einem internen Serverfehler.
 */
export const updateProduct: APIGatewayProxyHandler = async (event) => {
  const id = event.pathParameters?.id;

  // Überprüfen, ob Produkt-ID oder Request-Body fehlen
  if (!id || !event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Produkt-ID oder Body fehlt." }),
    };
  }

  try {
    // Parsen des JSON-Bodys und Destrukturierung der relevanten Felder
    const { name, sku, ref_cost } = JSON.parse(event.body);

    // Überprüfen, ob die benötigten Felder im Body vorhanden und gültig sind
    if (!name || !sku || ref_cost === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Felder name, sku oder ref_cost fehlen oder sind ungültig." }),
      };
    }

    // Ausführen der UPDATE-SQL-Abfrage in der BI-Datenbank
    const result = await queryBi(
        `
      UPDATE dim_product
      SET name = ?, sku = ?, ref_cost = ?
      WHERE product_id = ?
      `,
        [name, sku, ref_cost, id]
    );

    // Typisierung des Ergebnisses als MySQL ResultSetHeader, um auf affectedRows zugreifen zu können
    const updateResult = result as unknown as mysql.ResultSetHeader;

    // Überprüfen, ob die Aktualisierung erfolgreich war (mindestens eine Zeile betroffen)
    if (updateResult && 'affectedRows' in updateResult && updateResult.affectedRows > 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Produkt erfolgreich aktualisiert." }),
      };
    } else {
      // Produkt nicht gefunden oder keine Änderungen notwendig
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Produkt nicht gefunden oder keine Änderungen vorgenommen." }),
      };
    }
  } catch (error) {
    // Fehlerbehandlung bei Parsing-Fehlern, Datenbankfehlern oder anderen Problemen
    console.error("Error updating product:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};