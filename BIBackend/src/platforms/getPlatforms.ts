import { APIGatewayProxyHandler } from "aws-lambda";
import { queryBi } from "../db"; // <<< WICHTIG: queryBi importieren

export const getPlatforms: APIGatewayProxyHandler = async () => {
  try {
    const rows = await queryBi("SELECT * FROM dim_platform"); // <<< WICHTIG: queryBi verwenden
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    };
  } catch (error) {
    console.error("Error fetching platforms:", error); // Bessere Fehlermeldung
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};