import { APIGatewayProxyHandler } from "aws-lambda";
import { queryBi } from "../db";

export const getPlatforms: APIGatewayProxyHandler = async () => {
  try {
    const rows = await queryBi("SELECT * FROM dim_platform");
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    };
  } catch (error) {
    console.error("Error fetching platforms:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};