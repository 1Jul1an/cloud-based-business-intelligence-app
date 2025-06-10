import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryBi } from '../db';

export const getSalesSummary: APIGatewayProxyHandler = async (event) => {
  try {
    const result = await queryBi(`
            SELECT
                dp.name AS platform,
                SUM(fs.quantity) AS total_sales_count,
                SUM(fs.quantity * fs.act_price) AS total_revenue,
                SUM(fs.quantity * (fs.act_price - fs.act_cost)) AS total_profit
            FROM fact_sales fs
            JOIN dim_platform dp ON fs.platform_id = dp.platform_id
            GROUP BY dp.name
            ORDER BY total_revenue DESC;
        `);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Failed to fetch sales summary', error: (error as Error).message }),
    };
  }
};