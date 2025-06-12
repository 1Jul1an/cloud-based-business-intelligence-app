<script lang="ts">
    import { onMount } from 'svelte'; // Svelte Lifecycle-Hook, der ausgeführt wird, wenn die Komponente im DOM initialisiert ist.
    import Chart from 'chart.js/auto'; // Importiert die Chart.js Bibliothek für die Diagrammerstellung. 'auto' lädt alle notwendigen Module.
    import Header from "$lib/components/Header.svelte"; // Importiert die Header-Komponente.
    import Footer from "$lib/components/Footer.svelte"; // Importiert die Footer-Komponente.
    // Importiert Hilfsfunktionen und Konstanten aus der API-Datei, um Daten zu fetchen und Konfigurationen bereitzustellen.
    import { API_BASE, KPI_OPTIONS, AXIS_LABELS, CHART_TYPE_OPTIONS, fetchData } from '$lib/api';
    // Importiert Authentifizierungsfunktionen, um den Login-Status und die Benutzerrolle zu überprüfen.
import { isLoggedIn} from '$lib/auth';

    // Schutz: Weiterleitung wenn nicht eingeloggt oder falsche Rolle
    onMount(() => {
        if (!isLoggedIn()) {
            window.location.href = '/';
        } else {
            fetchKPI();
        }
    });

    // Definiert statische Optionen für die verfügbaren Diagrammtypen.
    const CHART_TYPES = [
        { id: "bar", label: "Balkendiagramm" },
        { id: "line", label: "Liniendiagramm" },
        { id: "pie", label: "Kreisdiagramm" }
    ];

    // --- Reactive Svelte States ---
    // Der aktuell ausgewählte KPI (Key Performance Indicator). Standardmäßig der erste aus KPI_OPTIONS.
    let selectedKpi = KPI_OPTIONS[0].id;
    // Der aktuell ausgewählte Diagrammtyp. Standardmäßig der erste aus CHART_TYPES.
    let selectedChartType = CHART_TYPES[0].id;
    // Ladezustand für die Datenabfrage.
    let isLoading = false;
    // Speichert die von der API abgerufenen KPI-Daten.
    let kpiData: any = null;
    // Speichert Fehlermeldungen, die während des Datenabrufs oder der Diagrammerstellung auftreten.
    let error = '';
    // Referenz auf das Canvas-Element, in dem das Diagramm gerendert wird.
    let chartRef: HTMLCanvasElement | null = null;
    // Die Instanz des Chart.js-Diagramms. Wird verwendet, um das Diagramm zu aktualisieren oder zu zerstören.
    let chartInstance: Chart | null = null;

    // Standardwerte für den Datumsbereich: Heute und ein Monat zuvor.
    const today = new Date().toISOString().slice(0, 10); // Aktuelles Datum im YYYY-MM-DD Format.
    const oneMonthAgo = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10); // Datum vor einem Monat.
    let fromDate: string = oneMonthAgo; // Startdatum für den Filter.
    let toDate: string = today; // Enddatum für den Filter.

    /**
     * Ermittelt die Konfiguration des aktuell ausgewählten KPIs aus KPI_OPTIONS.
     * @returns Die KPI-Konfiguration oder `undefined`, wenn kein passender KPI gefunden wurde.
     */
    function getSelectedKpiConf() {
        return KPI_OPTIONS.find(opt => opt.id === selectedKpi);
    }

    // --- Reaktivität: Wenn sich `selectedKpi` ändert, wird der `selectedChartType` angepasst. ---
    // Dies stellt sicher, dass nur erlaubte Diagrammtypen für den jeweiligen KPI ausgewählt sind.
    $: {
        const allowedTypes = CHART_TYPE_OPTIONS[selectedKpi] || []; // Erlaubte Diagrammtypen für den KPI.
        if (!allowedTypes.includes(selectedChartType)) { // Wenn der aktuelle Diagrammtyp nicht erlaubt ist...
            selectedChartType = allowedTypes.length > 0 ? allowedTypes[0] : ''; // ...wird der erste erlaubte Typ ausgewählt (oder leer, wenn keine erlaubt sind).
        }
    }

    /**
     * Asynchrone Funktion zum Abrufen der KPI-Daten von der Backend-API.
     * Setzt Ladezustände, leert Fehler und Daten und rendert anschließend das Diagramm.
     */
    async function fetchKPI() {
        isLoading = true; // Ladezustand aktivieren.
        error = ''; // Vorherige Fehlermeldung löschen.
        kpiData = null; // Vorherige Daten löschen.
        destroyChart(); // Vorhandenes Diagramm zerstören, bevor neue Daten geladen werden.

        try {
            const conf = getSelectedKpiConf(); // Konfiguration des aktuellen KPIs abrufen.
            if (!conf) throw new Error('Kein KPI ausgewählt.'); // Fehler, wenn keine Konfiguration gefunden wurde.

            const pathParams: Record<string, string> = {}; // Für Pfad-Parameter (hier nicht genutzt, aber vorbereitet).
            const queryParams: Record<string, string> = conf.queryParam || {}; // Initialisiert Query-Parameter aus der KPI-Konfiguration.

            // Hinzufügen der Datumsfilter (from/to) zu den Query-Parametern für bestimmte KPIs.
            // Die neuen Zeitreihen-KPIs für Versanddaten sind hier hinzugefügt.
            if (['sales_timeseries', 'sales', 'products', 'shipping_cost_timeseries', 'shipping_delays_timeseries'].includes(conf.id)) {
                if (fromDate) queryParams.from = fromDate;
                if (toDate) queryParams.to = toDate;
            }

            // Daten von der API abrufen.
            kpiData = await fetchData(conf.endpoint, pathParams, queryParams);
            // Kleiner Timeout, um sicherzustellen, dass das DOM aktualisiert ist, bevor das Diagramm gerendert wird.
            setTimeout(renderChart, 100);
        } catch (err) {
            // Fehlerbehandlung: Fehlermeldung setzen und in der Konsole loggen.
            error = `Fehler beim Laden der Daten: ${(err as Error).message}`;
            console.error(err);
        } finally {
            isLoading = false; // Ladezustand deaktivieren.
        }
    }

    /**
     * Formatiert einen Wert basierend auf seinem Schlüssel und Typ.
     * Speziell für Datums- und Zeitstempelwerte.
     * @param key Der Schlüssel des Werts (z.B. 'date', 'order_ts').
     * @param value Der zu formatierende Wert.
     * @returns Der formatierte Wert.
     */
    function formatValue(key: string, value: any) {
        // Prüft, ob der Schlüssel ein Datum oder Zeitstempel ist und der Wert ein String ist.
        if (typeof value === 'string' && (key.toLowerCase().includes('date') || key.toLowerCase().includes('ts'))) {
            const d = new Date(value);
            // Prüft, ob das Datum gültig ist.
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('de-DE'); // Formatiert das Datum für die deutsche Darstellung.
            }
        }
        return value; // Gibt den ursprünglichen Wert zurück, wenn keine spezielle Formatierung nötig ist.
    }

    /**
     * Zerstört die aktuelle Chart.js-Instanz, falls vorhanden.
     * Dies ist wichtig, um Speicherlecks und falsche Diagrammdarstellungen zu vermeiden.
     */
    function destroyChart() {
        if (chartInstance) {
            chartInstance.destroy(); // Zerstört die Chart.js-Instanz.
            chartInstance = null; // Setzt die Referenz auf null.
        }
    }

    /**
     * Überprüft, ob die aktuellen Daten leer oder ungeeignet für die Diagrammerstellung sind.
     * Dies hilft, leere oder fehlerhafte Diagramme zu vermeiden.
     * @returns `true`, wenn keine geeigneten Daten für ein Diagramm vorhanden sind, sonst `false`.
     */
    function isDataEmptyForChart() {
        // Grundlegende Prüfung auf das Vorhandensein und den Typ der Daten.
        if (!kpiData || !Array.isArray(kpiData) || kpiData.length === 0) return true;

        const relevantKeys = getChartRelevantKeys(kpiData[0]);
        // Wenn keine relevanten numerischen Schlüssel gefunden wurden
        // und es sich nicht um einen bekannten Zeitreihen- oder Bestseller-KPI handelt.
        if (relevantKeys.length === 0 && !(['sales_timeseries', 'bestseller', 'shipping_cost_timeseries', 'shipping_delays_timeseries'].includes(selectedKpi))) {
            return true;
        }

        // Spezifische Prüfungen für Zeitreihen- und Bestseller-KPIs, ob wirklich Datenwerte vorhanden sind.
        return kpiData.every(item => {
            if (['sales_timeseries', 'bestseller', 'shipping_cost_timeseries', 'shipping_delays_timeseries'].includes(selectedKpi)) {
                let hasData = false;
                if (selectedKpi === 'sales_timeseries') {
                    hasData = (item.total_quantity && Number(item.total_quantity) > 0) || (item.total_revenue && Number(item.total_revenue) > 0);
                } else if (selectedKpi === 'bestseller') {
                    hasData = (item.total_quantity && Number(item.total_quantity) > 0) || (item.total_revenue && Number(item.total_revenue) > 0);
                } else if (selectedKpi === 'shipping_cost_timeseries') { // NEU: Prüfung für Versandkosten-Zeitreihe
                    hasData = (item.daily_shipping_cost && Number(item.daily_shipping_cost) > 0);
                } else if (selectedKpi === 'shipping_delays_timeseries') { // NEU: Prüfung für Lieferverzögerungen-Zeitreihe
                    hasData = (item.average_daily_delivery_time_days && Number(item.average_daily_delivery_time_days) > 0);
                }
                return !hasData; // Wenn keine Daten vorhanden sind, ist die Bedingung erfüllt.
            } else {
                // Für andere KPIs: Prüft, ob alle relevanten Schlüssel null, undefined oder 0 sind.
                return relevantKeys.every(key => item[key] === null || item[key] === undefined || (typeof item[key] === 'number' && item[key] === 0));
            }
        });
    }

    /**
     * Ermittelt die passenden Labels für die X-Achse (oder Segmente bei Kreisdiagrammen)
     * basierend auf dem Typ des KPIs.
     * @param dataItem Ein einzelnes Datenelement aus `kpiData`.
     * @param kpiId Die ID des aktuellen KPIs.
     * @returns Den passenden Label-String.
     */
    function getChartLabels(dataItem: any, kpiId: string) {
        switch (kpiId) {
            case 'bestseller':
                return dataItem.name; // Produktname für Bestseller.
            case 'platform_revenue':
                return dataItem.platform; // Plattformname für Plattformumsatz.
            case 'sales_timeseries':
                const salesDate = new Date(dataItem.date);
                // Formatiert das Datum, wenn es gültig ist, sonst den Originalwert.
                return !isNaN(salesDate.getTime()) ? salesDate.toLocaleDateString('de-DE') : dataItem.date;
            case 'shipping_cost_timeseries': // NEU: Labels für Versandkosten-Zeitreihe
            case 'shipping_delays_timeseries': // NEU: Labels für Lieferverzögerungen-Zeitreihe
                const shippingDate = new Date(dataItem.order_date);
                return !isNaN(shippingDate.getTime()) ? shippingDate.toLocaleDateString('de-DE') : dataItem.order_date;
            case 'products':
                return dataItem.name || `Produkt ${dataItem.product_id}`; // Produktname oder Fallback.
            case 'sales':
                return dataItem.sale_id; // Verkaufs-ID für einzelne Verkäufe.
            default:
                // Standard-Fallback-Labels.
                return dataItem.name || dataItem.label || dataItem.id || `Item ${dataItem.index || ''}`;
        }
    }

    /**
     * Filtert die Schlüssel eines Datenelements, um nur die für das Diagramm relevanten numerischen Werte zu erhalten.
     * Ignoriert IDs und bestimmte Label-Schlüssel.
     * @param firstDataItem Das erste Datenelement aus `kpiData`, um die Schlüsselstruktur zu ermitteln.
     * @returns Ein Array von relevanten numerischen Schlüsseln.
     */
    function getChartRelevantKeys(firstDataItem: any) {
        if (!firstDataItem) return [];
        return Object.keys(firstDataItem).filter(k => {
            if (k.toLowerCase().includes('_id')) return false; // Ignoriert ID-Spalten.
            // Ignoriert Schlüssel, die als Labels verwendet werden.
            if (['name', 'platform', 'date', 'supplier_name', 'label', 'order_date'].includes(k.toLowerCase())) return false;

            // NEU: Spezifische Filterung für die neuen Zeitreihen-KPIs im Versandbereich.
            if (selectedKpi === 'shipping_cost_timeseries') {
                return k === 'daily_shipping_cost'; // Nur dieser Schlüssel ist relevant.
            }
            if (selectedKpi === 'shipping_delays_timeseries') {
                return k === 'average_daily_delivery_time_days'; // Nur dieser Schlüssel ist relevant.
            }

            // Spezifische Filterung für 'platform_revenue' und 'products' KPIs.
            if (selectedKpi === 'platform_revenue' && (k === 'total_sales_count' || k === 'total_revenue')) return true;
            if (selectedKpi === 'products' && k === 'ref_cost') return true;

            // Standard: Wenn der Wert numerisch ist oder in eine Zahl umgewandelt werden kann.
            return typeof firstDataItem[k] === 'number' || !isNaN(Number(firstDataItem[k]));
        });
    }

    /**
     * Rendert das Chart.js-Diagramm basierend auf den `kpiData` und der `selectedChartType`.
     * Zerstört ein vorhandenes Diagramm, bevor ein neues erstellt wird.
     */
    function renderChart() {
        // Abbruchbedingungen, wenn das Canvas-Element nicht vorhanden ist, keine Daten vorliegen
        // oder keine Diagrammtypen für den ausgewählten KPI erlaubt sind.
        if (!chartRef || !kpiData || !(CHART_TYPE_OPTIONS[selectedKpi]?.length > 0)) {
            destroyChart();
            return;
        }

        // Prüft, ob die Daten leer sind oder nicht für ein Diagramm geeignet.
        if (isDataEmptyForChart()) {
            destroyChart();
            return;
        }

        destroyChart(); // Zerstört eine vorhandene Diagramminstanz.

        const type = selectedChartType; // Der ausgewählte Diagrammtyp.
        let chartData: any; // Datenobjekt für Chart.js.
        let options: any; // Optionenobjekt für Chart.js.

        const relevantNumericKeys = getChartRelevantKeys(kpiData[0]); // Ermittelt die relevanten numerischen Datenfelder.

        // Standardfarben für Diagramme.
        const colors = [
            'rgba(59,130,246,0.85)', // Blau
            'rgba(16,185,129,0.65)', // Grün
            'rgba(234,179,8,0.85)',  // Gelb
            'rgba(244,63,94,0.85)',  // Rot
            'rgba(120,85,236,0.85)', // Lila
            'rgba(247,144,9,0.85)'   // Orange
        ];

        // --- Spezialfälle für KPIs mit spezifischen Dataset-Strukturen (z.B. Zeitreihen, Bestseller) ---
        if (selectedKpi === 'sales_timeseries') {
            chartData = {
                labels: kpiData.map((x: any) => getChartLabels(x, selectedKpi)), // Datum als Label.
                datasets: [
                    {
                        label: 'Verkaufte Menge',
                        data: kpiData.map((x: any) => Number(x.total_quantity)), // Daten für die Menge.
                        fill: false,
                        borderColor: 'rgba(59,130,246,0.8)',
                        backgroundColor: 'rgba(59,130,246,0.2)',
                        tension: 0.2 // Kurvenlinienspannung.
                    },
                    {
                        label: 'Umsatz (€)',
                        data: kpiData.map((x: any) => Number(x.total_revenue)), // Daten für den Umsatz.
                        fill: false,
                        borderColor: 'rgba(16,185,129,0.8)',
                        backgroundColor: 'rgba(16,185,129,0.2)',
                        tension: 0.2
                    }
                ]
            };
        } else if (selectedKpi === 'shipping_cost_timeseries') { // NEU: Handhabung der Versandkosten-Zeitreihe
            chartData = {
                labels: kpiData.map((x: any) => getChartLabels(x, selectedKpi)),
                datasets: [
                    {
                        label: 'Versandkosten (€)',
                        data: kpiData.map((x: any) => Number(x.daily_shipping_cost)),
                        fill: false,
                        borderColor: colors[0],
                        backgroundColor: colors[0].replace('0.85', '0.2'), // Leichtere Farbe für den Hintergrund
                        tension: 0.2
                    }
                ]
            };
        } else if (selectedKpi === 'shipping_delays_timeseries') { // NEU: Handhabung der Lieferverzögerungen-Zeitreihe
            chartData = {
                labels: kpiData.map((x: any) => getChartLabels(x, selectedKpi)),
                datasets: [
                    {
                        label: 'Durchschnittliche Versanddauer (Tage)',
                        data: kpiData.map((x: any) => Number(x.average_daily_delivery_time_days)),
                        fill: false,
                        borderColor: colors[1], // Andere Farbe für bessere Unterscheidung
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
        // --- Generische Handhabung für andere KPIs mit numerischen Daten ---
        else if (relevantNumericKeys.length > 0) {
            // Spezialfall für Kreisdiagramm, verwendet nur den ersten relevanten numerischen Schlüssel.
            if (type === 'pie' && relevantNumericKeys.length > 0) {
                const keyForPie = relevantNumericKeys[0];
                chartData = {
                    labels: kpiData.map((row: any, idx: number) => getChartLabels(row, selectedKpi) || `Item ${idx + 1}`),
                    datasets: [{
                        label: keyForPie.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Label formatieren.
                        data: kpiData.map((r: any) => Number(r[keyForPie])),
                        backgroundColor: kpiData.map((_: any, i: number) => colors[i % colors.length]), // Farben rotieren.
                    }]
                };
            } else {
                // Für Balken- und Liniendiagramme: Erstellt ein Dataset für jeden relevanten numerischen Schlüssel.
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
            // Wenn keine relevanten numerischen Keys vorhanden sind, kein Diagramm rendern.
            return;
        }

        // --- Chart.js Optionen ---
        options = {
            responsive: true, // Diagramm passt sich der Größe des Containers an.
            maintainAspectRatio: false, // Behält das Seitenverhältnis des Containers nicht bei (wichtig für responsive Größen).
            plugins: {
                legend: { position: 'top' }, // Legende oben positionieren.
                title: { display: false } // Titel des Diagramms nicht anzeigen, da Header dafür zuständig ist.
            },
            // Skalen-Optionen nur für Nicht-Kreisdiagramme.
            scales: (type === 'pie') ? {} : {
                x: {
                    grid: { display: false }, // X-Achsen-Gitterlinien ausblenden.
                    ticks: { font: { size: 12 } }, // Schriftgröße der X-Achsen-Ticks.
                    title: {
                        display: true,
                        text: AXIS_LABELS[selectedKpi]?.x || "" // X-Achsen-Titel aus Konfiguration.
                    }
                },
                y: {
                    beginAtZero: true, // Y-Achse beginnt bei Null.
                    grid: { color: "#eee" }, // Farbe der Y-Achsen-Gitterlinien.
                    ticks: { font: { size: 12 } }, // Schriftgröße der Y-Achsen-Ticks.
                    title: {
                        display: true,
                        text: AXIS_LABELS[selectedKpi]?.y || "" // Y-Achsen-Titel aus Konfiguration.
                    }
                }
            }
        };

        // Erstellt eine neue Chart.js-Instanz.
        chartInstance = new Chart(chartRef, { type, data: chartData, options });
    }

    /**
     * Ermittelt die Spaltenüberschriften für die Detailtabelle basierend auf den ersten Datenzeile.
     * @returns Ein Array von String-Schlüsseln, die als Tabellenüberschriften dienen.
     */
    function getTableHeaders() {
        if (!kpiData || !Array.isArray(kpiData) || kpiData.length === 0) return [];
        return Object.keys(kpiData[0]); // Nimmt die Schlüssel des ersten Objekts als Header.
    }

    // --- Reaktivität: Rendert das Diagramm neu, wenn `kpiData` oder `chartRef` sich ändern. ---
    // Ein kleiner Timeout stellt sicher, dass alle DOM-Updates vor dem Rendern abgeschlossen sind.
    $: if (kpiData && chartRef) {
        // Speichert die aktuellen Werte, um Race Conditions zu vermeiden, falls sich
        // `selectedKpi` oder `selectedChartType` sehr schnell wieder ändern.
        const currentKpi = selectedKpi;
        const currentChartType = selectedChartType;
        setTimeout(() => {
            // Prüft, ob die Auswahl noch dieselbe ist, bevor das Diagramm gerendert wird.
            if (selectedKpi === currentKpi && selectedChartType === currentChartType) {
                renderChart();
            }
        }, 50);
    }

    // Lifecycle Hook: Wird einmal ausgeführt, wenn die Komponente initialisiert und ins DOM eingefügt wurde.
    // Startet den ersten Datenabruf.
    // onMount(() => { fetchKPI(); });
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
                           on:change={fetchKPI} />
                    <label class="text-sm font-semibold text-gray-500 mx-2">Bis:</label>
                    <input type="date" bind:value={toDate} min={fromDate} max={today} class="rounded-xl border border-slate-200 p-1 px-2 shadow-sm"
                           on:change={fetchKPI} />
                </div>

                <div class="flex gap-2 items-center">
                    <label for="kpi-select" class="text-sm font-semibold text-gray-500">KPI:</label>
                    <select
                            id="kpi-select"
                            bind:value={selectedKpi}
                            on:change={fetchKPI} class="rounded-xl border border-slate-200 p-2 shadow-sm bg-slate-50 text-slate-700 font-medium"
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
                                on:change={renderChart} class="rounded-xl border border-slate-200 p-2 shadow-sm bg-slate-50 text-slate-700 font-medium"
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