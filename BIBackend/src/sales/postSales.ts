import { APIGatewayProxyHandler } from "aws-lambda";
import { queryBi } from "../db";

export const postSale: APIGatewayProxyHandler = async (event) => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Kein JSON-Body übergeben." }),
    };
  }

  try {
    const { product_id, platform_id, date_ts, quantity, act_price, act_cost } = JSON.parse(event.body);

    if (!product_id || !platform_id || !date_ts || !quantity || !act_price || !act_cost) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Pflichtfelder fehlen (product_id, platform_id, date_ts, quantity, act_price, act_cost)." }),
      };
    }

    await queryBi(
        `
      INSERT INTO fact_sales (product_id, platform_id, date_ts, quantity, act_price, act_cost)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
        [product_id, platform_id, date_ts, quantity, act_price, act_cost]
    );

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Verkauf erfolgreich gespeichert." }),
    };
  } catch (error) {
    console.error("Error posting sale:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};