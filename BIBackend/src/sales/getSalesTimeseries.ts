import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryBi } from '../db';

export const getSalesTimeseries: APIGatewayProxyHandler = async (event) => {
  try {
    const fromDate = event.queryStringParameters?.from;
    const toDate = event.queryStringParameters?.to;

    let whereClause = '';
    const params = [];
    if (fromDate && toDate) {
      whereClause = 'WHERE fs.date_ts >= ? AND fs.date_ts <= ?';
      params.push(fromDate, toDate);
    }

    const result = await queryBi(`
            SELECT
                DATE_FORMAT(fs.date_ts, '%Y-%m-%d') AS date,
                SUM(fs.quantity) AS total_quantity,
                SUM(fs.quantity * fs.act_price) AS total_revenue,
                SUM(fs.quantity * (fs.act_price - fs.act_cost)) AS total_profit
            FROM fact_sales fs
            ${whereClause}
            GROUP BY DATE_FORMAT(fs.date_ts, '%Y-%m-%d')
            ORDER BY date ASC;
        `, params);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error fetching sales timeseries:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Failed to fetch sales timeseries', error: (error as Error).message }),
    };
  }
};