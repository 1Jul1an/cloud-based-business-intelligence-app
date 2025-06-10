import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryBi } from '../db';

export const getBestsellers: APIGatewayProxyHandler = async (event) => {
  try {
    const result = await queryBi(`
            SELECT
                dp.name AS name,
                SUM(fs.quantity) AS total_quantity,
                SUM(fs.quantity * fs.act_price) AS total_revenue,
                SUM(fs.quantity * (fs.act_price - fs.act_cost)) AS total_profit
            FROM fact_sales fs
            JOIN dim_product dp ON fs.product_id = dp.product_id
            GROUP BY dp.name
            ORDER BY total_quantity DESC
            LIMIT 10;
        `);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error fetching bestseller products:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Failed to fetch bestseller products', error: (error as Error).message }),
    };
  }
};