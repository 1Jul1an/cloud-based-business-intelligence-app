import { APIGatewayProxyHandler } from "aws-lambda";
import { queryBi } from "../db"; // <<< WICHTIG: queryBi importieren

export const getDashboard: APIGatewayProxyHandler = async (event) => {
  const userName = event.pathParameters?.user;

  if (!userName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Benutzername fehlt in der URL." }),
    };
  }

  try {
    const rows = await queryBi("SELECT config_json FROM dashboard WHERE user_name = ?", [userName]); // <<< WICHTIG: queryBi verwenden

    if (Array.isArray(rows) && rows.length > 0) {
      const configJson = (rows[0] as any).config_json;
      let parsedConfig;
      try {
        parsedConfig = JSON.parse(configJson);
      } catch (parseError) {
        console.error("Failed to parse config_json for user", userName, ":", parseError);
        // Je nach Anwendungsfall: Fehler werfen, Raw-String zurückgeben oder Standardwert
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "Fehler beim Parsen der Dashboard-Konfiguration." }),
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedConfig),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Keine Dashboard-Konfiguration gefunden." }),
      };
    }
  } catch (error) {
    console.error("Error fetching dashboard config:", error); // Bessere Fehlermeldung
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
};