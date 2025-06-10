import { APIGatewayProxyHandler } from "aws-lambda";
import { queryBi } from "../db";

export const updateProduct: APIGatewayProxyHandler = async (event) => {
  const id = event.pathParameters?.id;

  if (!id || !event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Produkt-ID oder Body fehlt." }),
    };
  }

  try {
    const { name, sku, ref_cost } = JSON.parse(event.body);

    if (!name || !sku || ref_cost === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Felder name, sku oder ref_cost fehlen oder sind ungültig." }),
      };
    }

    const result = await queryBi(
        `
      UPDATE dim_product
      SET name = ?, sku = ?, ref_cost = ?
      WHERE product_id = ?
      `,
        [name, sku, ref_cost, id]
    );

    const updateResult = result as unknown as mysql.ResultSetHeader;

    if (updateResult && 'affectedRows' in updateResult && updateResult.affectedRows > 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Produkt erfolgreich aktualisiert." }),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Produkt nicht gefunden oder keine Änderungen vorgenommen." }),
      };
    }
  } catch (error) {
    console.error("Error updating product:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};