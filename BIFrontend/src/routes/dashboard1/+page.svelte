<script lang="ts">
    import { onMount } from 'svelte';
    import Chart from 'chart.js/auto';
    import Header from "$lib/components/Header.svelte";
    import Footer from "$lib/components/Footer.svelte";

    // KPIs und Endpunkte
    const KPI_OPTIONS = [
        { id: 'bestseller', label: 'Bestseller Produkte', endpoint: '/products/bestseller' },
        { id: 'platform_sales', label: 'Plattform Sales', endpoint: '/sales/summary' },
        { id: 'platform_revenue', label: 'Plattform Umsatz', endpoint: '/sales/summary' },
        { id: 'shipping_cost', label: 'Versandkosten', endpoint: '/shipping/delays' },
        { id: 'sales_timeseries', label: 'Sales Verlauf', endpoint: '/sales/timeseries' },
        { id: 'products', label: 'Alle Produkte', endpoint: '/products' },
        { id: 'platforms', label: 'Alle Plattformen', endpoint: '/dev/platforms' },
        { id: 'shipping_delays', label: 'Versanddauer', endpoint: '/shipping/delays' },
        { id: 'sales', label: 'Sales', endpoint: '/sales' }
    ];

    // Achsenlabels pro KPI
    const AXIS_LABELS: Record<string, { x: string; y: string }> = {
        bestseller:         { x: "Produkt",      y: "Stückzahl / Umsatz (€)" },
        platform_sales:     { x: "Plattform",    y: "Stückzahl / Umsatz (€)" },
        platform_revenue:   { x: "Plattform",    y: "Stückzahl / Umsatz (€)" },
        sales_timeseries:   { x: "Datum",        y: "Stückzahl / Umsatz (€)" },
        shipping_cost:      { x: "Lieferant",    y: "Versandkosten (€)" },
        products:           { x: "Produkt",      y: "Eigenschaften" },
        platforms:          { x: "Plattform",    y: "Eigenschaften" },
        shipping_delays:    { x: "Lieferung",    y: "Versanddauer (Tage)" },
        sales:              { x: "Datensatz",    y: "Eigenschaften" }
    };

    // Charttypen Dropdown
    const CHART_TYPES = [
        { id: "bar", label: "Balkendiagramm" },
        { id: "line", label: "Liniendiagramm" },
        { id: "pie", label: "Kreisdiagramm" }
    ];

    let selectedKpi = KPI_OPTIONS[0].id;
    let selectedChartType = 'bar';
    let isLoading = false;
    let kpiData: any = null;
    let error = '';
    let chartRef: HTMLCanvasElement | null = null;
    let chartInstance: Chart | null = null;
    const apiBase = 'https://ybevph0fy7.execute-api.eu-central-1.amazonaws.com';

    // Zeitraum-Filter
    const today = new Date().toISOString().slice(0, 10);
    const oneMonthAgo = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10);
    let fromDate: string = oneMonthAgo;
    let toDate: string = today;

    function getSelectedKpiConf() {
        return KPI_OPTIONS.find(opt => opt.id === selectedKpi);
    }


    async function fetchKPI() {
        isLoading = true;
        error = '';
        kpiData = null;
        destroyChart();

        try {
            const conf = getSelectedKpiConf();
            if (!conf) throw new Error('No KPI selected');

            const url = new URL(apiBase + conf.endpoint);

            const res = await fetch(url.toString());

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const contentType = res.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                kpiData = await res.json();
            } else if (contentType.includes('text/plain')) {
                const text = await res.text();
                try {
                    kpiData = JSON.parse(text);
                } catch (parseErr) {
                    throw new Error('Plain Text ist kein gültiges JSON');
                }
            } else {
                throw new Error(`Unerwarteter Content-Type: ${contentType}`);
            }

            setTimeout(renderChart, 100);
        } catch (err) {
            error = 'Fehler beim Laden der Daten';
            console.error(err);
        } finally {
            isLoading = false;
        }
    }

    //Datumsanzeige formatieren
    function formatValue(key: string, value: any) {
        if (typeof value === 'string' && key.toLowerCase().includes('date')) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('de-DE');
            }
        }
        return value;
    }



    function destroyChart() {
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
    }

    function isDataEmpty() {
        if (!kpiData) return true;
        if (Array.isArray(kpiData) && kpiData.length === 0) return true;
        if (Array.isArray(kpiData) && kpiData.every((x) =>
            Object.values(x).every(v => !v || v === 0))) return true;
        if (typeof kpiData === 'object' && Object.values(kpiData).every(v => !v || v === 0)) return true;
        return false;
    }

    // Diagramm-Logik mit Typ und Achsenlabels
    function renderChart() {
        if (!chartRef || !kpiData || isDataEmpty()) return;
        destroyChart();

        // Charttyp bestimmen (Special-Case für Sales Verlauf)
        let type = selectedChartType;
        if (selectedKpi === 'sales_timeseries') type = 'line';

        let chartData, options;

        // Spezialfall: Timeseries als Liniendiagramm
        if (selectedKpi === 'sales_timeseries' && Array.isArray(kpiData) && kpiData[0]?.date) {
            chartData = {
                labels: kpiData.map(x => {
                    const d = new Date(x.date);
                    return !isNaN(d.getTime()) ? d.toLocaleDateString('de-DE') : x.date;
                }),                datasets: [
                    {
                        label: 'Verkaufte Menge',
                        data: kpiData.map(x => Number(x.total_quantity)),
                        fill: false,
                        borderColor: 'rgba(59,130,246,0.8)',
                        backgroundColor: 'rgba(59,130,246,0.2)',
                        tension: 0.2
                    },
                    {
                        label: 'Umsatz (€)',
                        data: kpiData.map(x => Number(x.total_revenue)),
                        fill: false,
                        borderColor: 'rgba(16,185,129,0.8)',
                        backgroundColor: 'rgba(16,185,129,0.2)',
                        tension: 0.2
                    }
                ]
            };
        }
        // Bestseller etc.
        else if (selectedKpi === 'bestseller' && Array.isArray(kpiData) && kpiData[0]?.name) {
            chartData = {
                labels: kpiData.map((b) => b.name),
                datasets: [
                    {
                        label: 'Verkaufte Menge',
                        data: kpiData.map((b) => Number(b.total_quantity)),
                        backgroundColor: 'rgba(59, 130, 246, 0.85)',
                        borderRadius: 8,
                        barThickness: 22
                    },
                    {
                        label: 'Umsatz (€)',
                        data: kpiData.map((b) => Number(b.total_revenue)),
                        backgroundColor: 'rgba(16, 185, 129, 0.65)',
                        borderRadius: 8,
                        barThickness: 22
                    }
                ]
            };
        }
        // Dynamisch für alle anderen Listen
        else if (Array.isArray(kpiData) && typeof kpiData[0] === 'object') {
            const keys = Object.keys(kpiData[0]).filter(k => typeof kpiData[0][k] === 'number' || !isNaN(Number(kpiData[0][k])));
            // Pie-Charts zeigen nur das erste Numeric-Feld als Summenverteilung!
            if (type === 'pie' && keys.length > 0) {
                chartData = {
                    labels: kpiData.map((row, idx) => row.name || row.platform || row.supplier_name || row.date || `Item ${idx + 1}`),
                    datasets: [{
                        label: keys[0],
                        data: kpiData.map(r => Number(r[keys[0]])),
                        backgroundColor: [
                            'rgba(59,130,246,0.85)',
                            'rgba(16,185,129,0.65)',
                            'rgba(234,179,8,0.85)',
                            'rgba(244,63,94,0.85)',
                            'rgba(120,85,236,0.85)',
                            'rgba(247,144,9,0.85)'
                        ]
                    }]
                };
            } else {
                chartData = {
                    labels: kpiData.map((row, idx) => row.name || row.platform || row.supplier_name || row.date || `Item ${idx + 1}`),
                    datasets: keys.map((key, i) => ({
                        label: key,
                        data: kpiData.map(r => Number(r[key])),
                        backgroundColor: [
                            'rgba(59,130,246,0.85)',
                            'rgba(16,185,129,0.65)',
                            'rgba(234,179,8,0.85)',
                            'rgba(244,63,94,0.85)',
                            'rgba(120,85,236,0.85)',
                            'rgba(247,144,9,0.85)'
                        ][i % 6],
                        borderRadius: 8,
                        barThickness: 22
                    }))
                };
            }
        } else {
            // Kein Chart wenn kein passendes Mapping
            return;
        }

        options = {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: false }
            },
            scales: (type === 'pie') ? {} : {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 12 } },
                    title: {
                        display: true,
                        text: AXIS_LABELS[selectedKpi]?.x || ""
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "#eee" },
                    ticks: { font: { size: 12 } },
                    title: {
                        display: true,
                        text: AXIS_LABELS[selectedKpi]?.y || ""
                    }
                }
            }
        };

        chartInstance = new Chart(chartRef, { type, data: chartData, options });
    }

    function getTableHeaders() {
        if (!kpiData || !Array.isArray(kpiData) || kpiData.length === 0) return [];
        return Object.keys(kpiData[0]);
    }

    // Chart neu rendern wenn Daten neu oder Charttyp gewechselt!
    $: if (kpiData && !isDataEmpty()) {
        setTimeout(renderChart, 50);
    }
    $: if (selectedChartType && kpiData && !isDataEmpty()) {
        setTimeout(renderChart, 60);
    }

    onMount(() => { fetchKPI(); });
</script>

<!-- Layout mit Header/Footer, NUR DROPDOWNS, KEINE BUTTONS -->
<div class="flex flex-col h-screen overflow-hidden">
    <div class="flex-none">
        <Header title="Mein BI Dashboard" />
    </div>

    <main class="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100">
        <div class="w-full max-w-6xl mx-auto p-6 md:p-10 bg-white rounded-2xl shadow-2xl space-y-8 border border-slate-100 my-6">
            <!-- Zeitraum + KPI Auswahl -->
            <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
                <!-- Zeitraum -->
                <div class="flex gap-2 items-center">
                    <label class="text-sm font-semibold text-gray-500 mr-2">Von:</label>
                    <input type="date" bind:value={fromDate} max={toDate} class="rounded-xl border border-slate-200 p-1 px-2 shadow-sm"
                           on:change={fetchKPI}
                    />
                    <label class="text-sm font-semibold text-gray-500 mx-2">Bis:</label>
                    <input type="date" bind:value={toDate} min={fromDate} max={today} class="rounded-xl border border-slate-200 p-1 px-2 shadow-sm"
                           on:change={fetchKPI}
                    />
                </div>

                <!-- KPI Dropdown -->
                <div class="flex gap-2 items-center">
                    <label for="kpi-select" class="text-sm font-semibold text-gray-500">KPI:</label>
                    <select
                            id="kpi-select"
                            bind:value={selectedKpi}
                            on:change={fetchKPI}
                            class="rounded-xl border border-slate-200 p-2 shadow-sm bg-slate-50 text-slate-700 font-medium"
                    >
                        {#each KPI_OPTIONS as kpi}
                            <option value={kpi.id}>{kpi.label}</option>
                        {/each}
                    </select>
                </div>

                <!-- Chart-Type Dropdown -->
                <div class="flex gap-2 items-center">
                    <label for="chart-type-select" class="text-sm font-semibold text-gray-500">Diagrammtyp:</label>
                    <select
                            id="chart-type-select"
                            bind:value={selectedChartType}
                            on:change={renderChart}
                            class="rounded-xl border border-slate-200 p-2 shadow-sm bg-slate-50 text-slate-700 font-medium"
                    >
                        {#each CHART_TYPES as ct}
                            <option value={ct.id}>{ct.label}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <!-- Chart + Tabelle -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Chart -->
                <div class="col-span-1 md:col-span-2 bg-white/90 rounded-xl shadow-md px-4 py-4 border border-slate-100 flex flex-col items-center min-h-[360px] justify-center">
                    {#if isLoading}
                        <div class="text-slate-400 text-xl font-bold animate-pulse">Lädt ...</div>
                    {:else if error}
                        <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-center">{error}</div>
                    {:else if isDataEmpty()}
                        <div class="flex flex-col items-center justify-center text-center">
                            <div class="mb-2 text-slate-500 font-semibold">Keine Daten vorhanden</div>
                            <div class="text-xs text-slate-400">Für die ausgewählte KPI gibt es aktuell keine Werte.</div>
                        </div>
                    {:else}
                        <canvas bind:this={chartRef} class="w-full max-w-5xl" height="220"></canvas>
                    {/if}
                </div>

                <!-- Tabelle -->
                <div class="col-span-1 bg-white/90 rounded-xl shadow-md px-3 py-3 border border-slate-100 flex flex-col">
                    <h3 class="text-base font-semibold text-gray-700 mb-2">KPI Details</h3>
                    <div class="overflow-auto max-h-72">
                        {#if !isLoading && !error && !isDataEmpty()}
                            <table class="w-full text-sm text-left">
                                <thead>
                                <tr>
                                    {#each getTableHeaders() as h}
                                        <th class="py-1 px-1 text-gray-400 font-medium capitalize">{h.replace('_', ' ')}</th>
                                    {/each}
                                </tr>
                                </thead>
                                <tbody>
                                {#each kpiData as row}
                                    <tr class="hover:bg-slate-50 transition rounded">
                                        {#each getTableHeaders() as h}
                                            <td class="py-1 px-1 font-medium text-slate-700 truncate">{formatValue(h, row[h])}</td>
                                        {/each}
                                    </tr>
                                {/each}
                                </tbody>
                            </table>
                        {:else if isLoading}
                            <div class="text-slate-300 text-center">Lädt ...</div>
                        {:else if error}
                            <div class="text-red-400">{error}</div>
                        {:else if isDataEmpty()}
                            <div class="text-slate-300 text-center">Keine Daten</div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </main>

    <div class="flex-none">
        <Footer />
    </div>
</div>
