import { APIGatewayProxyHandler } from "aws-lambda";
import { queryBi } from "../db";

export const getProductById: APIGatewayProxyHandler = async (event) => {
  const id = event.pathParameters?.id;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Produkt-ID fehlt in der URL." }),
    };
  }

  try {
    const rows = await queryBi(
        `
      SELECT
        p.product_id,
        p.sku,
        p.name,
        p.ref_cost,
        r.ref_price
      FROM dim_product p
      LEFT JOIN product_reprice r ON p.product_id = r.product_id
      WHERE p.product_id = ?
      `,
        [id]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows[0]),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Produkt nicht gefunden." }),
      };
    }
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};