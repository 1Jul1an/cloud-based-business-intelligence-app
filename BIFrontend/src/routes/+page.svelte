<script lang="ts">
    import { onMount } from 'svelte';
    import Chart from 'chart.js/auto';
    import Header from "$lib/components/Header.svelte";
    import Footer from "$lib/components/Footer.svelte";
    import { API_BASE, KPI_OPTIONS, AXIS_LABELS, CHART_TYPE_OPTIONS, fetchData } from '$lib/api';

    const CHART_TYPES = [
        { id: "bar", label: "Balkendiagramm" },
        { id: "line", label: "Liniendiagramm" },
        { id: "pie", label: "Kreisdiagramm" }
    ];

    let selectedKpi = KPI_OPTIONS[0].id;
    let selectedChartType = CHART_TYPES[0].id;
    let isLoading = false;
    let kpiData: any = null;
    let error = '';
    let chartRef: HTMLCanvasElement | null = null;
    let chartInstance: Chart | null = null;

    const today = new Date().toISOString().slice(0, 10);
    const oneMonthAgo = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10);
    let fromDate: string = oneMonthAgo;
    let toDate: string = today;

    function getSelectedKpiConf() {
        return KPI_OPTIONS.find(opt => opt.id === selectedKpi);
    }

    $: {
        const allowedTypes = CHART_TYPE_OPTIONS[selectedKpi] || [];
        if (!allowedTypes.includes(selectedChartType)) {
            selectedChartType = allowedTypes.length > 0 ? allowedTypes[0] : '';
        }
    }

    async function fetchKPI() {
        isLoading = true;
        error = '';
        kpiData = null;
        destroyChart();

        try {
            const conf = getSelectedKpiConf();
            if (!conf) throw new Error('Kein KPI ausgewählt.');

            const pathParams: Record<string, string> = {};
            const queryParams: Record<string, string> = conf.queryParam || {};

            // Zeitraum-Parameter für alle relevanten KPIs hinzufügen, inkl. der neuen Zeitreihen
            if (['sales_timeseries', 'sales', 'products', 'shipping_cost_timeseries', 'shipping_delays_timeseries'].includes(conf.id)) { // HIER GEÄNDERT
                if (fromDate) queryParams.from = fromDate;
                if (toDate) queryParams.to = toDate;
            }

            kpiData = await fetchData(conf.endpoint, pathParams, queryParams);
            setTimeout(renderChart, 100);
        } catch (err) {
            error = `Fehler beim Laden der Daten: ${(err as Error).message}`;
            console.error(err);
        } finally {
            isLoading = false;
        }
    }

    function formatValue(key: string, value: any) {
        if (typeof value === 'string' && (key.toLowerCase().includes('date') || key.toLowerCase().includes('ts'))) { // Auch 'ts' für timestamps prüfen
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

    function isDataEmptyForChart() {
        if (!kpiData || !Array.isArray(kpiData) || kpiData.length === 0) return true;

        const relevantKeys = getChartRelevantKeys(kpiData[0]);
        // Wenn keine relevanten numerischen Keys gefunden und es keine bekannte Zeitreihe ist
        if (relevantKeys.length === 0 && !(['sales_timeseries', 'bestseller', 'shipping_cost_timeseries', 'shipping_delays_timeseries'].includes(selectedKpi))) { // HIER GEÄNDERT
            return true;
        }

        return kpiData.every(item => {
            if (['sales_timeseries', 'bestseller', 'shipping_cost_timeseries', 'shipping_delays_timeseries'].includes(selectedKpi)) { // HIER GEÄNDERT
                let hasData = false;
                if (selectedKpi === 'sales_timeseries') {
                    hasData = (item.total_quantity && Number(item.total_quantity) > 0) || (item.total_revenue && Number(item.total_revenue) > 0);
                } else if (selectedKpi === 'bestseller') {
                    hasData = (item.total_quantity && Number(item.total_quantity) > 0) || (item.total_revenue && Number(item.total_revenue) > 0);
                } else if (selectedKpi === 'shipping_cost_timeseries') {
                    hasData = (item.daily_shipping_cost && Number(item.daily_shipping_cost) > 0);
                } else if (selectedKpi === 'shipping_delays_timeseries') {
                    hasData = (item.average_daily_delivery_time_days && Number(item.average_daily_delivery_time_days) > 0);
                }
                return !hasData;
            } else {
                return relevantKeys.every(key => item[key] === null || item[key] === undefined || (typeof item[key] === 'number' && item[key] === 0));
            }
        });
    }

    function getChartLabels(dataItem: any, kpiId: string) {
        switch (kpiId) {
            case 'bestseller':
                return dataItem.name;
            case 'platform_revenue':
                return dataItem.platform;
            case 'sales_timeseries':
                const salesDate = new Date(dataItem.date);
                return !isNaN(salesDate.getTime()) ? salesDate.toLocaleDateString('de-DE') : dataItem.date;
            case 'shipping_cost_timeseries': // HIER NEU
            case 'shipping_delays_timeseries': // HIER NEU
                const shippingDate = new Date(dataItem.order_date);
                return !isNaN(shippingDate.getTime()) ? shippingDate.toLocaleDateString('de-DE') : dataItem.order_date;
            // case 'shipping_cost': // ENTFERNT
            // case 'shipping_delays': // ENTFERNT
            //     return dataItem.supplier_name; // Diese Labels werden für Zeitreihen nicht benötigt
            case 'products':
                return dataItem.name || `Produkt ${dataItem.product_id}`;
            case 'sales':
                return dataItem.sale_id;
            default:
                return dataItem.name || dataItem.label || dataItem.id || `Item ${dataItem.index || ''}`;
        }
    }

    function getChartRelevantKeys(firstDataItem: any) {
        if (!firstDataItem) return [];
        return Object.keys(firstDataItem).filter(k => {
            if (k.toLowerCase().includes('_id')) return false;
            // 'date' und 'order_date' sind jetzt Labels für Zeitreihen, nicht Datenwerte
            if (['name', 'platform', 'date', 'supplier_name', 'label', 'order_date'].includes(k.toLowerCase())) return false; // HIER GEÄNDERT

            // Die alten KPIs sind entfernt, daher auch ihre spezifische Filterung hier entfernen
            // if (selectedKpi === 'shipping_delays') {
            //     return k === 'average_delivery_time_days';
            // }
            // if (selectedKpi === 'shipping_cost') {
            //     return k === 'total_shipping_cost';
            // }

            // NEU: Relevante Keys für die Zeitreihen
            if (selectedKpi === 'shipping_cost_timeseries') {
                return k === 'daily_shipping_cost';
            }
            if (selectedKpi === 'shipping_delays_timeseries') {
                return k === 'average_daily_delivery_time_days';
            }

            if (selectedKpi === 'platform_revenue' && (k === 'total_sales_count' || k === 'total_revenue')) return true;
            if (selectedKpi === 'products' && k === 'ref_cost') return true;

            return typeof firstDataItem[k] === 'number' || !isNaN(Number(firstDataItem[k]));
        });
    }

    function renderChart() {
        if (!chartRef || !kpiData || !(CHART_TYPE_OPTIONS[selectedKpi]?.length > 0)) {
            destroyChart();
            return;
        }

        if (isDataEmptyForChart()) {
            destroyChart();
            return;
        }

        destroyChart();

        const type = selectedChartType;
        let chartData: any;
        let options: any;

        const relevantNumericKeys = getChartRelevantKeys(kpiData[0]);

        const colors = [
            'rgba(59,130,246,0.85)',
            'rgba(16,185,129,0.65)',
            'rgba(234,179,8,0.85)',
            'rgba(244,63,94,0.85)',
            'rgba(120,85,236,0.85)',
            'rgba(247,144,9,0.85)'
        ];

        // Spezialfälle für KPIs mit mehreren definierten Datasets oder Zeitreihen
        if (selectedKpi === 'sales_timeseries') {
            chartData = {
                labels: kpiData.map((x: any) => getChartLabels(x, selectedKpi)),
                datasets: [
                    {
                        label: 'Verkaufte Menge',
                        data: kpiData.map((x: any) => Number(x.total_quantity)),
                        fill: false,
                        borderColor: 'rgba(59,130,246,0.8)',
                        backgroundColor: 'rgba(59,130,246,0.2)',
                        tension: 0.2
                    },
                    {
                        label: 'Umsatz (€)',
                        data: kpiData.map((x: any) => Number(x.total_revenue)),
                        fill: false,
                        borderColor: 'rgba(16,185,129,0.8)',
                        backgroundColor: 'rgba(16,185,129,0.2)',
                        tension: 0.2
                    }
                ]
            };
        } else if (selectedKpi === 'shipping_cost_timeseries') { // HIER NEU
            chartData = {
                labels: kpiData.map((x: any) => getChartLabels(x, selectedKpi)),
                datasets: [
                    {
                        label: 'Versandkosten (€)',
                        data: kpiData.map((x: any) => Number(x.daily_shipping_cost)),
                        fill: false,
                        borderColor: colors[0],
                        backgroundColor: colors[0].replace('0.85', '0.2'),
                        tension: 0.2
                    }
                ]
            };
        } else if (selectedKpi === 'shipping_delays_timeseries') { // HIER NEU
            chartData = {
                labels: kpiData.map((x: any) => getChartLabels(x, selectedKpi)),
                datasets: [
                    {
                        label: 'Durchschnittliche Versanddauer (Tage)',
                        data: kpiData.map((x: any) => Number(x.average_daily_delivery_time_days)),
                        fill: false,
                        borderColor: colors[1], // Andere Farbe für Abgrenzung
                        backgroundColor: colors[1].replace('0.65', '0.2'),
                        tension: 0.2
                    }
                ]
            };
        }
        else if (selectedKpi === 'bestseller') {
            chartData = {
                labels: kpiData.map((b: any) => getChartLabels(b, selectedKpi)),
                datasets: [
                    {
                        label: 'Verkaufte Menge',
                        data: kpiData.map((b: any) => Number(b.total_quantity)),
                        backgroundColor: 'rgba(59, 130, 246, 0.85)',
                        borderRadius: 8,
                        barThickness: 22
                    },
                    {
                        label: 'Umsatz (€)',
                        data: kpiData.map((b: any) => Number(b.total_revenue)),
                        backgroundColor: 'rgba(16, 185, 129, 0.65)',
                        borderRadius: 8,
                        barThickness: 22
                    }
                ]
            };
        } else if (selectedKpi === 'platform_revenue' && kpiData[0]?.total_sales_count !== undefined && kpiData[0]?.total_revenue !== undefined) {
            chartData = {
                labels: kpiData.map((p: any) => getChartLabels(p, selectedKpi)),
                datasets: [
                    {
                        label: 'Anzahl Verkäufe',
                        data: kpiData.map((p: any) => Number(p.total_sales_count)),
                        backgroundColor: colors[0],
                        borderRadius: 8,
                        barThickness: 22
                    },
                    {
                        label: 'Umsatz (€)',
                        data: kpiData.map((p: any) => Number(p.total_revenue)),
                        backgroundColor: colors[1],
                        borderRadius: 8,
                        barThickness: 22
                    }
                ]
            };
        }
        else if (relevantNumericKeys.length > 0) {
            if (type === 'pie' && relevantNumericKeys.length > 0) {
                const keyForPie = relevantNumericKeys[0];
                chartData = {
                    labels: kpiData.map((row: any, idx: number) => getChartLabels(row, selectedKpi) || `Item ${idx + 1}`),
                    datasets: [{
                        label: keyForPie.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        data: kpiData.map((r: any) => Number(r[keyForPie])),
                        backgroundColor: kpiData.map((_: any, i: number) => colors[i % colors.length]),
                    }]
                };
            } else {
                chartData = {
                    labels: kpiData.map((row: any, idx: number) => getChartLabels(row, selectedKpi) || `Item ${idx + 1}`),
                    datasets: relevantNumericKeys.map((key: string, i: number) => ({
                        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        data: kpiData.map((r: any) => Number(r[key])),
                        backgroundColor: colors[i % colors.length],
                        borderColor: (type === 'line') ? colors[i % colors.length].replace('0.85', '1') : undefined,
                        fill: (type === 'line') ? false : undefined,
                        tension: (type === 'line') ? 0.2 : undefined,
                        borderRadius: (type === 'bar') ? 8 : undefined,
                        barThickness: (type === 'bar') ? 22 : undefined,
                    }))
                };
            }
        } else {
            return;
        }

        options = {
            responsive: true,
            maintainAspectRatio: false,
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

    $: if (kpiData && chartRef) {
        const currentKpi = selectedKpi;
        const currentChartType = selectedChartType;
        setTimeout(() => {
            if (selectedKpi === currentKpi && selectedChartType === currentChartType) {
                renderChart();
            }
        }, 50);
    }

    onMount(() => { fetchKPI(); });
</script>

<div class="flex flex-col h-screen overflow-hidden">
    <div class="flex-none">
        <Header title="Mein BI Dashboard" />
    </div>

    <main class="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100">
        <div class="w-full max-w-6xl mx-auto p-6 md:p-10 bg-white rounded-2xl shadow-2xl space-y-8 border border-slate-100 my-6">
            <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
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

                {#if CHART_TYPE_OPTIONS[selectedKpi] && CHART_TYPE_OPTIONS[selectedKpi].length > 0}
                    <div class="flex gap-2 items-center">
                        <label for="chart-type-select" class="text-sm font-semibold text-gray-500">Diagrammtyp:</label>
                        <select
                                id="chart-type-select"
                                bind:value={selectedChartType}
                                on:change={renderChart}
                                class="rounded-xl border border-slate-200 p-2 shadow-sm bg-slate-50 text-slate-700 font-medium"
                        >
                            {#each CHART_TYPES.filter(ct => CHART_TYPE_OPTIONS[selectedKpi].includes(ct.id)) as ct}
                                <option value={ct.id}>{ct.label}</option>
                            {/each}
                        </select>
                    </div>
                {/if}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                {#if CHART_TYPE_OPTIONS[selectedKpi] && CHART_TYPE_OPTIONS[selectedKpi].length > 0}
                    <div class="col-span-1 md:col-span-2 bg-white/90 rounded-xl shadow-md px-4 py-4 border border-slate-100 flex flex-col items-center min-h-[360px] justify-center">
                        {#if isLoading}
                            <div class="text-slate-400 text-xl font-bold animate-pulse">Lädt ...</div>
                        {:else if error}
                            <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-center">{error}</div>
                        {:else if isDataEmptyForChart()}
                            <div class="flex flex-col items-center justify-center text-center">
                                <div class="mb-2 text-slate-500 font-semibold">Keine Daten für das Diagramm vorhanden</div>
                                <div class="text-xs text-slate-400">Für die ausgewählte KPI gibt es aktuell keine geeigneten Werte für ein Diagramm.</div>
                            </div>
                        {:else}
                            <canvas bind:this={chartRef} class="w-full max-w-5xl" height="220"></canvas>
                        {/if}
                    </div>
                {:else}
                    <div class="col-span-1 md:col-span-2 bg-white/90 rounded-xl shadow-md px-4 py-4 border border-slate-100 flex flex-col items-center min-h-[360px] justify-center text-slate-400 text-center">
                        <p class="font-semibold">Kein Diagramm für diese KPI verfügbar.</p>
                        <p class="text-sm mt-1">Diese KPI dient der reinen Datenanzeige in der Tabelle.</p>
                    </div>
                {/if}


                <div class="col-span-1 {CHART_TYPE_OPTIONS[selectedKpi] && CHART_TYPE_OPTIONS[selectedKpi].length > 0 ? '' : 'md:col-span-3'} bg-white/90 rounded-xl shadow-md px-3 py-3 border border-slate-100 flex flex-col">
                    <h3 class="text-base font-semibold text-gray-700 mb-2">KPI Details</h3>
                    <div class="overflow-auto max-h-72">
                        {#if !isLoading && !error && (!isDataEmptyForChart() || !(CHART_TYPE_OPTIONS[selectedKpi] && CHART_TYPE_OPTIONS[selectedKpi].length > 0))}
                            {#if kpiData && Array.isArray(kpiData) && kpiData.length > 0}
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
                            {:else}
                                <div class="text-slate-300 text-center">Keine Daten</div>
                            {/if}
                        {:else if isLoading}
                            <div class="text-slate-300 text-center">Lädt ...</div>
                        {:else if error}
                            <div class="text-red-400">{error}</div>
                        {:else}
                            <div class="text-slate-300 text-center">Keine Daten</div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </main>

    <div class="flex-none">
        <Footer/>
    </div>
</div>