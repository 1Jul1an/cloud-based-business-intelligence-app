export type KpiId =
    | 'bestseller'
    | 'platform_revenue'
    | 'sales_timeseries'
    | 'products'
    | 'shipping_cost_timeseries'
    | 'shipping_delays_timeseries'
    | 'sales';

export type KpiOption = {
    id: KpiId;
    label: string;
    endpoint: string;
    queryParam?: Record<string, string>;
    description: string;
};

type DemoRow = Record<string, unknown>;
type DemoDashboard = Partial<Record<KpiId, DemoRow[]>> & { generated_at?: string };

const envBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || '';

export const API_BASE = String(envBase).replace(/\/$/, '');
export const USING_DEMO_DATA = API_BASE.length === 0;

export const KPI_OPTIONS: KpiOption[] = [
    {
        id: 'bestseller',
        label: 'Bestseller',
        endpoint: '/products/bestseller',
        description: 'Top-Produkte nach Menge und Umsatz'
    },
    {
        id: 'platform_revenue',
        label: 'Plattformen',
        endpoint: '/sales/summary',
        description: 'Umsatz, Sales Count und Warenkorbwert je Kanal'
    },
    {
        id: 'sales_timeseries',
        label: 'Sales Verlauf',
        endpoint: '/sales/timeseries',
        description: 'Tägliche Menge und Umsatzentwicklung'
    },
    {
        id: 'products',
        label: 'Produkte',
        endpoint: '/products',
        description: 'Produktstamm mit Kosten, Zielpreis und Bestand'
    },
    {
        id: 'shipping_cost_timeseries',
        label: 'Versandkosten',
        endpoint: '/shipping/delays',
        queryParam: { type: 'cost_timeseries' },
        description: 'Tägliche Versandkosten und Kosten je Bestellung'
    },
    {
        id: 'shipping_delays_timeseries',
        label: 'Versandzeit',
        endpoint: '/shipping/delays',
        queryParam: { type: 'delays_timeseries' },
        description: 'Durchschnittliche Lieferdauer und verspätete Bestellungen'
    },
    {
        id: 'sales',
        label: 'Sales Details',
        endpoint: '/sales',
        description: 'Einzelverkäufe mit Plattform, Produkt und Deckungsbeitrag'
    }
];

export const AXIS_LABELS: Record<KpiId, { x: string; y: string }> = {
    bestseller: { x: 'Produkt', y: 'Wert' },
    platform_revenue: { x: 'Plattform', y: 'Wert' },
    sales_timeseries: { x: 'Datum', y: 'Wert' },
    products: { x: 'Produkt', y: 'Kosten / Preis' },
    shipping_cost_timeseries: { x: 'Datum', y: 'Versandkosten' },
    shipping_delays_timeseries: { x: 'Datum', y: 'Tage' },
    sales: { x: 'Sale', y: 'Wert' }
};

export const CHART_TYPE_OPTIONS: Record<KpiId, string[]> = {
    bestseller: ['bar', 'pie'],
    platform_revenue: ['bar', 'pie'],
    sales_timeseries: ['line'],
    products: ['bar'],
    shipping_cost_timeseries: ['line'],
    shipping_delays_timeseries: ['line'],
    sales: ['bar']
};

const endpointFallbackMap: Record<string, KpiId> = {
    '/products/bestseller': 'bestseller',
    '/sales/summary': 'platform_revenue',
    '/sales/timeseries': 'sales_timeseries',
    '/products': 'products',
    '/sales': 'sales'
};

let demoDashboardCache: DemoDashboard | null = null;

async function loadDemoDashboard() {
    if (demoDashboardCache) return demoDashboardCache;

    const response = await fetch('/demo-dashboard.json');
    if (!response.ok) throw new Error(`Could not load local demo data: ${response.status}`);

    demoDashboardCache = (await response.json()) as DemoDashboard;
    return demoDashboardCache;
}

function getDemoKey(endpoint: string, queryParams: Record<string, string>): KpiId {
    if (endpoint === '/shipping/delays') {
        return queryParams.type === 'delays_timeseries'
            ? 'shipping_delays_timeseries'
            : 'shipping_cost_timeseries';
    }

    return endpointFallbackMap[endpoint] ?? 'bestseller';
}

function filterByDateRange(rows: DemoRow[], queryParams: Record<string, string>) {
    const { from, to } = queryParams;

    if (!from && !to) return rows;

    return rows.filter((row) => {
        const rawDate = row.date ?? row.order_date ?? row.date_ts ?? row.order_ts;
        if (typeof rawDate !== 'string') return true;

        const date = rawDate.slice(0, 10);
        if (from && date < from) return false;
        if (to && date > to) return false;
        return true;
    });
}

function cloneDemoRows(rows: DemoRow[]) {
    return JSON.parse(JSON.stringify(rows)) as DemoRow[];
}

export function getDataSourceLabel() {
    return USING_DEMO_DATA ? 'Local sample data' : 'Live API';
}

export async function fetchData(
    endpoint: string,
    params: Record<string, string> = {},
    extraQueryParams: Record<string, string> = {}
) {
    const queryParams = { ...params, ...extraQueryParams };

    if (USING_DEMO_DATA) {
        const demoDashboard = await loadDemoDashboard();
        const demoKey = getDemoKey(endpoint, queryParams);
        const rows = cloneDemoRows(demoDashboard[demoKey] ?? []);
        return filterByDateRange(rows, queryParams);
    }

    const url = new URL(`${API_BASE}${endpoint}`);
    Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== '') url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        try {
            const errorBody = await response.json();
            if (errorBody?.message) message += `: ${errorBody.message}`;
        } catch {
            // Keep the HTTP status as the useful fallback message.
        }
        throw new Error(message);
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) return response.json();

    if (contentType.includes('text/plain')) {
        const text = await response.text();
        return JSON.parse(text);
    }

    throw new Error(`Unexpected response content type: ${contentType || 'unknown'}`);
}
