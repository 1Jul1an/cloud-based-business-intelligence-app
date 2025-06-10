import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryBi } from '../db';

export const getShippingDelays: APIGatewayProxyHandler = async (event) => {
  try {
    const type = event.queryStringParameters?.type;
    const fromDate = event.queryStringParameters?.from;
    const toDate = event.queryStringParameters?.to;

    let sqlQuery: string;
    let params: any[] = [];

    let dateFilterClause = '';
    if (fromDate && toDate) {
      dateFilterClause = 'AND order_ts >= ? AND order_ts <= ?';
      params.push(fromDate, toDate);
    }

    if (type === 'cost') {
      sqlQuery = `
                SELECT
                    supplier_name,
                    SUM(ship_cost) AS total_shipping_cost
                FROM fact_shipping
                WHERE 1=1 ${dateFilterClause}
                GROUP BY supplier_name
                ORDER BY total_shipping_cost DESC;
            `;
    } else if (type === 'delays') {
      sqlQuery = `
                SELECT
                    supplier_name,
                    AVG(TIMESTAMPDIFF(DAY, order_ts, arrival_ts)) AS average_delivery_time_days
                FROM fact_shipping
                WHERE arrival_ts IS NOT NULL AND order_ts IS NOT NULL ${dateFilterClause}
                GROUP BY supplier_name
                ORDER BY average_delivery_time_days ASC;
            `;
    } else if (type === 'cost_timeseries') {
      sqlQuery = `
                SELECT
                    DATE(order_ts) AS order_date,
                    SUM(ship_cost) AS daily_shipping_cost
                FROM fact_shipping
                WHERE 1=1 ${dateFilterClause}
                GROUP BY DATE(order_ts)
                ORDER BY order_date ASC;
            `;
    } else if (type === 'delays_timeseries') {
      sqlQuery = `
                SELECT
                    DATE(order_ts) AS order_date,
                    AVG(TIMESTAMPDIFF(DAY, order_ts, arrival_ts)) AS average_daily_delivery_time_days
                FROM fact_shipping
                WHERE arrival_ts IS NOT NULL AND order_ts IS NOT NULL ${dateFilterClause}
                GROUP BY DATE(order_ts)
                ORDER BY order_date ASC;
            `;
    }
    else {
      sqlQuery = `
                SELECT
                    supplier_name,
                    SUM(ship_cost) AS total_shipping_cost,
                    AVG(TIMESTAMPDIFF(DAY, order_ts, arrival_ts)) AS average_delivery_time_days
                FROM fact_shipping
                WHERE arrival_ts IS NOT NULL AND order_ts IS NOT NULL ${dateFilterClause}
                GROUP BY supplier_name;
            `;
    }

    const result = await queryBi(sqlQuery, params);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error fetching shipping details:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Failed to fetch shipping details', error: (error as Error).message }),
    };
  }
};