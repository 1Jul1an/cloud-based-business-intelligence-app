import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryBi } from '../db';

export const getProducts: APIGatewayProxyHandler = async (event) => { // <<< WICHTIG: Exportierter Name
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