import { APIGatewayProxyHandler } from "aws-lambda";
import { queryBi } from "../db";

export const getProductSummary: APIGatewayProxyHandler = async (event) => {
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
    console.error("Error fetching product summary:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};