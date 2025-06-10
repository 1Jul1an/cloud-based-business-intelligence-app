import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryBi } from '../db';

export const getSales: APIGatewayProxyHandler = async (event) => {
  try {
    const result = await queryBi(`
            SELECT
                fs.sale_id,
                dp.name AS product_name,
                dplat.name AS platform_name,
                fs.date_ts AS date, 
                fs.quantity,
                fs.act_price AS sell_price, 
                fs.act_cost AS ref_cost,   
                (fs.act_price - fs.act_cost) * fs.quantity AS profit
            FROM fact_sales fs
            JOIN dim_product dp ON fs.product_id = dp.product_id
            JOIN dim_platform dplat ON fs.platform_id = dplat.platform_id;
        `);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error fetching all sales:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Failed to fetch all sales', error: (error as Error).message }),
    };
  }
};