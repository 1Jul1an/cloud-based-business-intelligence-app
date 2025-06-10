import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryBi } from '../db';

/**
 * AWS Lambda Handler zum Abrufen aller Produkte aus der BI-Datenbank.
 * Diese Funktion führt eine SQL-Abfrage aus, um Produktinformationen wie
 * Produkt-ID, SKU, Name und Referenzkosten abzurufen und als JSON zu liefern.
 *
 * @param event Das APIGatewayProxyEvent-Objekt, das die Anfrageinformationen enthält.
 * @returns Ein APIGatewayProxyResult-Objekt mit dem HTTP-Statuscode, Headern und dem JSON-Antwortkörper.
 */
export const getProducts: APIGatewayProxyHandler = async (event) => {
  try {
    const result = await queryBi(`
            SELECT
                product_id,
                sku,
                name,
                ref_cost
            FROM dim_product;
        `);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error fetching all products:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Failed to fetch all products', error: error.message }),
    };
  }
};