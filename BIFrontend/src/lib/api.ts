// src/lib/api.ts

// Die Basis-URL für deine AWS API Gateway Endpunkte. Alle API-Aufrufe werden mit dieser URL beginnen.
export const API_BASE = 'https://zgcb9j8xcj.execute-api.eu-central-1.amazonaws.com';

/**
 * Definiert die verfügbaren Key Performance Indicators (KPIs) für das Dashboard.
 * Jede Option enthält:
 * - `id`: Ein eindeutiger Bezeichner für den KPI.
 * - `label`: Der Anzeigetext für den KPI im Frontend (z.B. in Dropdown-Menüs).
 * - `endpoint`: Der API-Pfad, der aufgerufen werden muss, um die Daten für diesen KPI abzurufen.
 * - `queryParam` (optional): Ein Objekt mit zusätzlichen Query-Parametern, die an den Endpunkt gesendet werden sollen.
 * Dies ist nützlich für Endpunkte, die verschiedene Arten von Daten über einen Parameter steuern (z.B. `type`).
 */
export const KPI_OPTIONS = [
    { id: 'bestseller', label: 'Bestseller Produkte', endpoint: '/products/bestseller' },
    { id: 'platform_revenue', label: 'Plattform Umsatz/Verkäufe', endpoint: '/sales/summary' },
    // Die folgenden Zeilen wurden entfernt, da sie durch Zeitreihen-KPIs ersetzt wurden.
    // { id: 'shipping_cost', label: 'Versandkosten nach Lieferant', endpoint: '/shipping/delays', queryParam: { type: 'cost' } },
    { id: 'sales_timeseries', label: 'Sales Verlauf nach Datum', endpoint: '/sales/timeseries' },
    { id: 'products', label: 'Alle Produkte', endpoint: '/products' },
    // Die folgenden Zeilen wurden entfernt, da sie durch Zeitreihen-KPIs ersetzt wurden.
    // { id: 'shipping_delays', label: 'Versanddauer nach Lieferant', endpoint: '/shipping/delays'},
    { id: 'shipping_cost_timeseries', label: 'Versandkosten Verlauf nach Datum', endpoint: '/shipping/delays', queryParam: { type: 'cost_timeseries' } }, // NEU: KPI für den Zeitverlauf der Versandkosten
    { id: 'shipping_delays_timeseries', label: 'Versandzeit Verlauf nach Datum', endpoint: '/shipping/delays', queryParam: { type: 'delays_timeseries' } }, // NEU: KPI für den Zeitverlauf der durchschnittlichen Versandzeit
    { id: 'sales', label: 'Alle Sales', endpoint: '/sales' }
];

/**
 * Definiert die Beschriftungen für die X- und Y-Achsen der Diagramme,
 * spezifisch für jeden KPI. Dies hilft, die Diagramme informativer zu gestalten.
 * Die Schlüssel des Objekts entsprechen den `id`s der KPIs in `KPI_OPTIONS`.
 */
export const AXIS_LABELS: Record<string, { x: string; y: string }> = {
    bestseller:         { x: "Produktname",      y: "Wert" },
    platform_revenue:   { x: "Plattform",    y: "Umsatz/Verkäufe" },
    sales_timeseries:   { x: "Datum",        y: "Wert" },
    // Die folgenden Zeilen wurden entfernt, da die entsprechenden KPIs ebenfalls entfernt wurden.
    // shipping_cost:      { x: "Lieferant",    y: "Versandkosten (€)" },
    products:           { x: "Produkt",      y: "Referenzkosten (€)" },
    // Die folgenden Zeilen wurden entfernt, da die entsprechenden KPIs ebenfalls entfernt wurden.
    // shipping_delays:    { x: "Lieferant",    y: "Durchschnittliche Dauer (Tage)" },
    shipping_cost_timeseries: { x: "Datum", y: "Versandkosten (€)" }, // NEU: Achsenbeschriftungen für Versandkosten-Zeitreihe
    shipping_delays_timeseries: { x: "Datum", y: "Durchschnittliche Dauer (Tage)" }, // NEU: Achsenbeschriftungen für Versandzeit-Zeitreihe
    sales:              { x: "Sales ID",     y: "Wert" }
};

/**
 * Definiert, welche Diagrammtypen für welchen KPI erlaubt sind.
 * Dies steuert die Auswahlmöglichkeiten im Frontend und verhindert die Anzeige von
 * ungeeigneten Diagrammtypen für bestimmte Daten (z.B. Liniendiagramm für 'Alle Produkte').
 * Die Schlüssel des Objekts entsprechen den `id`s der KPIs. Die Werte sind Arrays von String-IDs
 * der erlaubten Diagrammtypen (z.B. 'bar', 'line', 'pie').
 */
export const CHART_TYPE_OPTIONS: Record<string, string[]> = {
    bestseller:         ['bar', 'pie'],
    platform_revenue:   ['bar', 'pie'],
    sales_timeseries:   ['line'], // Zeitreihen werden typischerweise als Liniendiagramme dargestellt.
    // Die folgenden Zeilen wurden entfernt, da die entsprechenden KPIs ebenfalls entfernt wurden.
    // shipping_cost:      ['bar', 'pie'],
    products:           ['bar', 'pie'],
    // Die folgenden Zeilen wurden entfernt, da die entsprechenden KPIs ebenfalls entfernt wurden.
    // shipping_delays:    ['bar', 'pie'],
    shipping_cost_timeseries: ['line'], // NEU: Nur Liniendiagramm für diese Zeitreihe.
    shipping_delays_timeseries: ['line'], // NEU: Nur Liniendiagramm für diese Zeitreihe.
    sales:              ['bar']
};

/**
 * Eine generische Funktion zum Abrufen von Daten von der API.
 * Sie konstruiert die URL, sendet die Anfrage und verarbeitet die Antwort.
 *
 * @param endpoint Der spezifische API-Pfad (z.B. '/products/bestseller').
 * @param params Ein Objekt von Pfad-Parametern, die in die URL eingebettet werden (aktuell nicht verwendet, aber flexibel).
 * @param extraQueryParams Ein Objekt von zusätzlichen Query-Parametern, die an die URL angehängt werden.
 * @returns Eine Promise, die mit den geparsten JSON-Daten aufgelöst wird.
 * @throws {Error} Wenn die HTTP-Anfrage fehlschlägt, der Content-Type unerwartet ist oder JSON-Parsing fehlschlägt.
 */
export async function fetchData(endpoint: string, params: Record<string, string> = {}, extraQueryParams: Record<string, string> = {}) {
    // Konstruiert die vollständige URL unter Verwendung der Basis-URL und des Endpunkts.
    const url = new URL(API_BASE + endpoint);

    // Fügt Pfad-Parameter zur URL hinzu (aktuell nicht genutzt, aber für zukünftige Erweiterungen vorbereitet).
    // Beachte: Wenn `params` verwendet werden, müssen diese im `endpoint`-String als Platzhalter vorhanden sein
    // und hier entsprechend ersetzt werden (z.B. `/product/{id}`). Die aktuelle Implementierung hängt sie als Query-Parameter an.
    // Dies müsste angepasst werden, falls echte Pfad-Parameter benötigt werden.
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    // Fügt zusätzliche Query-Parameter zur URL hinzu.
    Object.keys(extraQueryParams).forEach(key => url.searchParams.append(key, extraQueryParams[key]));

    // Führt die HTTP-Anfrage durch.
    const res = await fetch(url.toString());

    // Überprüft, ob die HTTP-Antwort erfolgreich war (Statuscode 2xx).
    if (!res.ok) {
        let errorMsg = `HTTP-Fehler: ${res.status}`;
        try {
            // Versucht, eine detailliertere Fehlermeldung aus dem JSON-Antwortkörper zu extrahieren.
            const errorJson = await res.json();
            if (errorJson && errorJson.message) {
                errorMsg += ` - ${errorJson.message}`;
            }
        } catch (e) {
            // Ignoriert Fehler beim Parsen des JSON-Bodys, wenn der Body kein gültiges JSON ist.
        }
        // Wirft einen Fehler mit der konstruierten Fehlermeldung.
        throw new Error(errorMsg);
    }

    // Ermittelt den Content-Type des Antwortkörpers.
    const contentType = res.headers.get('content-type') || '';

    // Verarbeitet die Antwort basierend auf dem Content-Type.
    if (contentType.includes('application/json')) {
        // Wenn der Content-Type JSON ist, wird der Body als JSON geparst.
        return await res.json();
    } else if (contentType.includes('text/plain')) {
        // Wenn der Content-Type Text ist, versucht, den Text als JSON zu parsen.
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (parseErr) {
            // Wirft einen Fehler, wenn der Text nicht als JSON geparst werden kann.
            throw new Error('Plain Text konnte nicht als JSON geparst werden.');
        }
    } else {
        // Wirft einen Fehler für unerwartete Content-Types.
        throw new Error(`Unerwarteter Content-Type: ${contentType}`);
    }
}