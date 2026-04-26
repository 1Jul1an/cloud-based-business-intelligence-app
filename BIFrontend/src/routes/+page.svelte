<script lang="ts">
    import { onMount, tick } from 'svelte';
    import Chart from 'chart.js/auto';
    import {
        API_BASE,
        AXIS_LABELS,
        CHART_TYPE_OPTIONS,
        KPI_OPTIONS,
        USING_DEMO_DATA,
        fetchData,
        getDataSourceLabel,
        type KpiId
    } from '$lib/api';

    type DashboardChartType = 'bar' | 'line' | 'pie';
    type Row = Record<string, any>;
    type DashboardData = Record<KpiId, Row[]>;

    const CHART_TYPES: { id: DashboardChartType; label: string }[] = [
        { id: 'bar', label: 'Bar' },
        { id: 'line', label: 'Line' },
        { id: 'pie', label: 'Pie' }
    ];

    const emptyDashboard: DashboardData = {
        bestseller: [],
        platform_revenue: [],
        sales_timeseries: [],
        products: [],
        shipping_cost_timeseries: [],
        shipping_delays_timeseries: [],
        sales: []
    };

    const today = new Date().toISOString().slice(0, 10);
    const oneMonthAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10);

    let fromDate = oneMonthAgo;
    let toDate = today;
    let selectedKpi: KpiId = 'sales_timeseries';
    let selectedChartType: DashboardChartType = 'line';
    let dashboardData: DashboardData = { ...emptyDashboard };
    let isLoading = true;
    let error = '';
    let chartRef: HTMLCanvasElement | null = null;
    let chartInstance: Chart | null = null;

    $: selectedConfig = KPI_OPTIONS.find((option) => option.id === selectedKpi) ?? KPI_OPTIONS[0];
    $: allowedChartTypes = (CHART_TYPE_OPTIONS[selectedKpi] ?? ['bar']) as DashboardChartType[];
    $: if (!allowedChartTypes.includes(selectedChartType)) selectedChartType = allowedChartTypes[0] ?? 'bar';
    $: selectedRows = dashboardData[selectedKpi] ?? [];
    $: summaryCards = buildSummaryCards(dashboardData);
    $: topProducts = dashboardData.bestseller.slice(0, 5);
    $: leadingChannel = getLeadingChannel(dashboardData.platform_revenue);
    $: watchlist = buildWatchlist(dashboardData);
    $: if (chartRef && !isLoading && !error) {
        selectedKpi;
        selectedChartType;
        selectedRows;
        setTimeout(renderChart, 0);
    }

    async function loadDashboard() {
        isLoading = true;
        error = '';
        destroyChart();

        const dateQuery = { from: fromDate, to: toDate };

        try {
            const [
                bestseller,
                platformRevenue,
                salesTimeseries,
                products,
                shippingCostTimeseries,
                shippingDelaysTimeseries,
                sales
            ] = await Promise.all([
                fetchData('/products/bestseller'),
                fetchData('/sales/summary'),
                fetchData('/sales/timeseries', {}, dateQuery),
                fetchData('/products'),
                fetchData('/shipping/delays', {}, { ...dateQuery, type: 'cost_timeseries' }),
                fetchData('/shipping/delays', {}, { ...dateQuery, type: 'delays_timeseries' }),
                fetchData('/sales', {}, dateQuery)
            ]);

            dashboardData = {
                bestseller: normalizeRows(bestseller),
                platform_revenue: normalizeRows(platformRevenue),
                sales_timeseries: normalizeRows(salesTimeseries),
                products: normalizeRows(products),
                shipping_cost_timeseries: normalizeRows(shippingCostTimeseries),
                shipping_delays_timeseries: normalizeRows(shippingDelaysTimeseries),
                sales: normalizeRows(sales)
            };
        } catch (loadError) {
            error = loadError instanceof Error ? loadError.message : 'Dashboard data could not be loaded.';
            dashboardData = { ...emptyDashboard };
        } finally {
            isLoading = false;
            await tick();
            renderChart();
        }
    }

    function normalizeRows(value: unknown): Row[] {
        return Array.isArray(value) ? value : [];
    }

    function destroyChart() {
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
    }

    function sumRows(rows: Row[], keys: string[]) {
        return rows.reduce((sum, row) => {
            const value = keys.map((key) => row[key]).find((item) => item !== undefined && item !== null);
            return sum + Number(value ?? 0);
        }, 0);
    }

    function averageRows(rows: Row[], key: string) {
        const values = rows.map((row) => Number(row[key])).filter((value) => Number.isFinite(value));
        if (values.length === 0) return 0;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    function buildSummaryCards(data: DashboardData) {
        const totalRevenue = sumRows(data.sales_timeseries, ['total_revenue']);
        const totalQuantity = sumRows(data.sales_timeseries, ['total_quantity']);
        const shippingCost = sumRows(data.shipping_cost_timeseries, ['daily_shipping_cost']);
        const shippingOrders = sumRows(data.shipping_cost_timeseries, ['total_orders']);
        const avgShippingCost = shippingOrders > 0 ? shippingCost / shippingOrders : shippingCost;
        const avgDeliveryDays = averageRows(data.shipping_delays_timeseries, 'average_daily_delivery_time_days');

        return [
            {
                label: 'Revenue',
                value: formatCurrency(totalRevenue),
                detail: `${formatNumber(totalQuantity)} units sold`,
                tone: 'border-blue-200/80 bg-blue-50/50'
            },
            {
                label: 'Orders by channel',
                value: formatNumber(sumRows(data.platform_revenue, ['total_sales_count'])),
                detail: `${data.platform_revenue.length || 0} active platforms`,
                tone: 'border-cyan-200/80 bg-cyan-50/50'
            },
            {
                label: 'Shipping cost',
                value: formatCurrency(avgShippingCost),
                detail: shippingOrders > 0 ? 'average per order' : 'total selected range',
                tone: 'border-amber-200/80 bg-amber-50/60'
            },
            {
                label: 'Delivery time',
                value: avgDeliveryDays ? `${avgDeliveryDays.toFixed(1)} d` : '—',
                detail: `${formatNumber(sumRows(data.shipping_delays_timeseries, ['delayed_orders']))} delayed orders`,
                tone: 'border-emerald-200/80 bg-emerald-50/50'
            }
        ];
    }

    function getLeadingChannel(rows: Row[]) {
        return [...rows].sort((a, b) => Number(b.total_revenue ?? 0) - Number(a.total_revenue ?? 0))[0];
    }

    function buildWatchlist(data: DashboardData) {
        const lowStock = data.products
            .filter((product) => Number(product.stock ?? 999) <= 80)
            .sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0));
        const latestDelay = data.shipping_delays_timeseries.at(-1);
        const firstDelay = data.shipping_delays_timeseries[0];
        const delayTrend = Number(latestDelay?.average_daily_delivery_time_days ?? 0) - Number(firstDelay?.average_daily_delivery_time_days ?? 0);
        const latestRevenue = data.sales_timeseries.at(-1);

        return [
            {
                title: 'Low stock',
                value: lowStock.length ? `${lowStock[0].name ?? lowStock[0].sku}` : 'Stable',
                detail: lowStock.length ? `${lowStock[0].stock} units remaining` : 'No urgent replenishment signal'
            },
            {
                title: 'Delivery trend',
                value: delayTrend > 0.2 ? `+${delayTrend.toFixed(1)} d` : delayTrend < -0.2 ? `${delayTrend.toFixed(1)} d` : 'Flat',
                detail: latestDelay ? `Latest day: ${Number(latestDelay.average_daily_delivery_time_days).toFixed(1)} days` : 'No shipping data'
            },
            {
                title: 'Latest revenue',
                value: latestRevenue ? formatCurrency(Number(latestRevenue.total_revenue ?? 0)) : '—',
                detail: latestRevenue ? formatDate(String(latestRevenue.date)) : 'No sales data in range'
            }
        ];
    }

    function getChartLabel(row: Row, index: number) {
        if (selectedKpi === 'bestseller') return row.name ?? row.sku ?? `Product ${index + 1}`;
        if (selectedKpi === 'platform_revenue') return row.platform ?? row.platform_name ?? `Channel ${index + 1}`;
        if (selectedKpi === 'sales_timeseries') return formatDate(String(row.date));
        if (selectedKpi === 'products') return row.name ?? row.sku ?? `Product ${index + 1}`;
        if (selectedKpi === 'shipping_cost_timeseries') return formatDate(String(row.order_date));
        if (selectedKpi === 'shipping_delays_timeseries') return formatDate(String(row.order_date));
        if (selectedKpi === 'sales') return row.sale_id ?? `Sale ${index + 1}`;
        return row.name ?? row.label ?? `Item ${index + 1}`;
    }

    function getChartDatasets(rows: Row[]) {
        const lineBase = {
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: '#ffffff',
            pointBorderWidth: 2,
            borderWidth: 2.5
        };
        const barBase = {
            borderRadius: 12,
            borderSkipped: false,
            maxBarThickness: 34
        };

        if (selectedKpi === 'bestseller') {
            if (selectedChartType === 'pie') {
                return [
                    {
                        label: 'Revenue',
                        data: rows.map((row) => Number(row.total_revenue ?? 0)),
                        backgroundColor: chartPalette(0.86),
                        borderColor: 'rgba(255, 255, 255, 0.95)',
                        borderWidth: 3
                    }
                ];
            }
            return [
                {
                    label: 'Units',
                    data: rows.map((row) => Number(row.total_quantity ?? 0)),
                    backgroundColor: 'rgba(79, 70, 229, 0.78)',
                    ...barBase
                },
                {
                    label: 'Revenue',
                    data: rows.map((row) => Number(row.total_revenue ?? 0)),
                    backgroundColor: 'rgba(20, 184, 166, 0.72)',
                    ...barBase
                }
            ];
        }

        if (selectedKpi === 'platform_revenue') {
            if (selectedChartType === 'pie') {
                return [
                    {
                        label: 'Revenue',
                        data: rows.map((row) => Number(row.total_revenue ?? 0)),
                        backgroundColor: chartPalette(0.86),
                        borderColor: 'rgba(255, 255, 255, 0.95)',
                        borderWidth: 3
                    }
                ];
            }
            return [
                {
                    label: 'Revenue',
                    data: rows.map((row) => Number(row.total_revenue ?? 0)),
                    backgroundColor: 'rgba(37, 99, 235, 0.74)',
                    ...barBase
                },
                {
                    label: 'Units',
                    data: rows.map((row) => Number(row.total_sales_count ?? 0)),
                    backgroundColor: 'rgba(79, 70, 229, 0.62)',
                    ...barBase
                }
            ];
        }

        if (selectedKpi === 'sales_timeseries') {
            return [
                {
                    label: 'Revenue',
                    data: rows.map((row) => Number(row.total_revenue ?? 0)),
                    borderColor: 'rgba(79, 70, 229, 0.96)',
                    backgroundColor: 'rgba(79, 70, 229, 0.12)',
                    pointBorderColor: 'rgba(79, 70, 229, 0.96)',
                    ...lineBase
                },
                {
                    label: 'Units',
                    data: rows.map((row) => Number(row.total_quantity ?? 0)),
                    borderColor: 'rgba(20, 184, 166, 0.94)',
                    backgroundColor: 'rgba(20, 184, 166, 0.1)',
                    pointBorderColor: 'rgba(20, 184, 166, 0.94)',
                    ...lineBase
                }
            ];
        }

        if (selectedKpi === 'products') {
            return [
                {
                    label: 'Reference cost',
                    data: rows.map((row) => Number(row.ref_cost ?? 0)),
                    backgroundColor: 'rgba(96, 165, 250, 0.7)',
                    ...barBase
                },
                {
                    label: 'Target price',
                    data: rows.map((row) => Number(row.target_price ?? 0)),
                    backgroundColor: 'rgba(79, 70, 229, 0.7)',
                    ...barBase
                }
            ];
        }

        if (selectedKpi === 'shipping_cost_timeseries') {
            return [
                {
                    label: 'Shipping cost',
                    data: rows.map((row) => Number(row.daily_shipping_cost ?? 0)),
                    borderColor: 'rgba(37, 99, 235, 0.92)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    pointBorderColor: 'rgba(37, 99, 235, 0.92)',
                    ...lineBase
                }
            ];
        }

        if (selectedKpi === 'shipping_delays_timeseries') {
            return [
                {
                    label: 'Delivery days',
                    data: rows.map((row) => Number(row.average_daily_delivery_time_days ?? 0)),
                    borderColor: 'rgba(13, 148, 136, 0.94)',
                    backgroundColor: 'rgba(20, 184, 166, 0.09)',
                    pointBorderColor: 'rgba(13, 148, 136, 0.94)',
                    ...lineBase
                }
            ];
        }

        return [
            {
                label: 'Revenue',
                data: rows.map((row) => Number(row.revenue ?? ((row.sell_price ?? row.act_price ?? 0) * (row.quantity ?? 1)) ?? 0)),
                backgroundColor: 'rgba(79, 70, 229, 0.72)',
                ...barBase
            },
            {
                label: 'Profit',
                data: rows.map((row) => Number(row.contribution_margin ?? row.profit ?? 0)),
                backgroundColor: 'rgba(20, 184, 166, 0.62)',
                ...barBase
            }
        ];
    }

    function chartPalette(alpha = 0.78) {
        return [
            `rgba(79, 70, 229, ${alpha})`,
            `rgba(37, 99, 235, ${alpha})`,
            `rgba(6, 182, 212, ${alpha})`,
            `rgba(20, 184, 166, ${alpha})`,
            `rgba(96, 165, 250, ${alpha})`,
            `rgba(125, 211, 252, ${alpha})`,
            `rgba(129, 140, 248, ${alpha})`,
            `rgba(45, 212, 191, ${alpha})`
        ];
    }

    function renderChart() {
        destroyChart();

        if (!chartRef || selectedRows.length === 0) return;

        const datasets = getChartDatasets(selectedRows);
        const hasVisibleData = datasets.some((dataset: any) => dataset.data.some((value: number) => Number(value) > 0));
        if (!hasVisibleData) return;

        const isPie = selectedChartType === 'pie';

        chartInstance = new Chart(chartRef, {
            type: selectedChartType,
            data: {
                labels: selectedRows.map(getChartLabel),
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#334155',
                            boxWidth: 10,
                            boxHeight: 10,
                            usePointStyle: true,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.96)',
                        titleColor: '#0f172a',
                        bodyColor: '#334155',
                        borderColor: 'rgba(148, 163, 184, 0.2)',
                        borderWidth: 1,
                        padding: 12,
                        titleFont: { weight: '600' }
                    }
                },
                scales: isPie
                    ? {}
                    : {
                          x: {
                              grid: { display: false },
                              ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, font: { size: 11 } },
                              title: { display: true, text: AXIS_LABELS[selectedKpi]?.x ?? '', color: '#64748b' }
                          },
                          y: {
                              beginAtZero: true,
                              grid: { color: 'rgba(148, 163, 184, 0.15)' },
                              border: { display: false },
                              ticks: { color: '#64748b', font: { size: 11 } },
                              title: { display: true, text: AXIS_LABELS[selectedKpi]?.y ?? '', color: '#64748b' }
                          }
                      }
            }
        });
    }

    function getTableHeaders(rows: Row[]) {
        if (!rows.length) return [];

        const preferred: Record<KpiId, string[]> = {
            bestseller: ['name', 'category', 'total_quantity', 'total_revenue', 'total_profit', 'gross_margin_pct'],
            platform_revenue: ['platform', 'total_sales_count', 'total_revenue', 'total_profit', 'avg_order_value', 'refund_rate_pct'],
            sales_timeseries: ['date', 'total_quantity', 'total_revenue', 'total_profit', 'avg_order_value'],
            products: ['product_id', 'sku', 'name', 'category', 'ref_cost', 'target_price', 'stock', 'supplier_name'],
            shipping_cost_timeseries: ['order_date', 'daily_shipping_cost', 'total_orders', 'avg_cost_per_order'],
            shipping_delays_timeseries: ['order_date', 'average_daily_delivery_time_days', 'delayed_orders', 'total_orders'],
            sales: ['sale_id', 'product_name', 'platform', 'platform_name', 'date', 'quantity', 'sell_price', 'act_price', 'revenue', 'profit', 'contribution_margin']
        };

        const available = new Set(rows.flatMap((row) => Object.keys(row)));
        const ordered = preferred[selectedKpi].filter((header) => available.has(header));
        const remaining = Array.from(available).filter((header) => !ordered.includes(header));
        return [...ordered, ...remaining].slice(0, 9);
    }

    function formatHeader(header: string) {
        const labels: Record<string, string> = {
            total_quantity: 'Units',
            total_revenue: 'Revenue',
            total_profit: 'Profit',
            gross_margin_pct: 'Margin %',
            total_sales_count: 'Sales count',
            avg_order_value: 'AOV',
            refund_rate_pct: 'Refund %',
            ref_cost: 'Ref cost',
            target_price: 'Target price',
            supplier_name: 'Supplier',
            daily_shipping_cost: 'Shipping cost',
            avg_cost_per_order: 'Cost / order',
            average_daily_delivery_time_days: 'Delivery days',
            delayed_orders: 'Delayed',
            product_name: 'Product',
            platform_name: 'Platform',
            act_price: 'Price',
            sell_price: 'Price',
            contribution_margin: 'Margin'
        };

        return labels[header] ?? header.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    function formatCell(header: string, value: any) {
        if (value === undefined || value === null || value === '') return '—';
        if (String(header).includes('date') || String(header).endsWith('_ts')) return formatDate(String(value));
        if (
            ['total_revenue', 'total_profit', 'avg_order_value', 'ref_cost', 'target_price', 'daily_shipping_cost', 'avg_cost_per_order', 'sell_price', 'act_price', 'revenue', 'profit', 'contribution_margin'].includes(header)
        ) {
            return formatCurrency(Number(value));
        }
        if (['gross_margin_pct', 'refund_rate_pct'].includes(header)) return `${Number(value).toFixed(1)}%`;
        if (typeof value === 'number') return formatNumber(value);
        return value;
    }

    function formatCurrency(value: number) {
        if (!Number.isFinite(value)) return '—';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: value >= 1000 ? 0 : 2
        }).format(value);
    }

    function formatNumber(value: number) {
        if (!Number.isFinite(value)) return '—';
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
    }

    function formatDate(value: string) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(date);
    }

    onMount(() => {
        loadDashboard();
        return destroyChart;
    });
</script>

<svelte:head>
    <title>Business Intelligence</title>
</svelte:head>

<main class="min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.10),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(6,182,212,0.10),_transparent_28%),linear-gradient(180deg,_#fbfdff_0%,_#f6f8fb_45%,_#f8fafc_100%)]"></div>
        <div class="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-indigo-300/30 blur-3xl"></div>
        <div class="absolute right-[-6rem] top-20 h-80 w-80 rounded-full bg-cyan-200/35 blur-3xl"></div>
        <div class="absolute bottom-[-9rem] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100/70 blur-3xl"></div>
    </div>

    <section class="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header class="mb-6 rounded-[2rem] border border-slate-200/70 bg-white/72 px-5 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:px-6 sm:py-6">
            <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div class="mb-3 flex flex-wrap items-center gap-2">
                        <span class="rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-700">Business Intelligence</span>
                        <span class="rounded-full border border-slate-200/80 bg-white/65 px-3 py-1 text-xs font-medium text-slate-500">{getDataSourceLabel()}</span>
                    </div>
                    <h1 class="text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-[2.1rem]">Business Intelligence</h1>
                    <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-[0.95rem]">
                        Sales, products, channels and shipping performance in one operational view.
                    </p>
                </div>

                <div class="grid grid-cols-2 gap-3 sm:flex sm:items-end">
                    <label class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        From
                        <input
                            type="date"
                            bind:value={fromDate}
                            max={toDate}
                            onchange={loadDashboard}
                            class="mt-1.5 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                        />
                    </label>
                    <label class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        To
                        <input
                            type="date"
                            bind:value={toDate}
                            min={fromDate}
                            max={today}
                            onchange={loadDashboard}
                            class="mt-1.5 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                        />
                    </label>
                </div>
            </div>
        </header>

        {#if error}
            <div class="mb-6 rounded-[1.5rem] border border-rose-200 bg-rose-50/90 px-5 py-4 text-sm text-rose-700 shadow-[0_12px_32px_rgba(244,63,94,0.08)] backdrop-blur-xl">
                {error}
            </div>
        {/if}

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {#each summaryCards as card}
                <article class={`rounded-[1.6rem] border ${card.tone} bg-white/72 p-5 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-2xl`}>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                    <div class="mt-3 text-[1.7rem] font-semibold tracking-[-0.03em] text-slate-900">{card.value}</div>
                    <p class="mt-2 text-sm text-slate-500">{card.detail}</p>
                </article>
            {/each}
        </div>

        <div class="mt-6 grid flex-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
            <section class="rounded-[2rem] border border-slate-200/70 bg-white/72 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:p-6">
                <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600/70">Analysis</p>
                        <h2 class="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-900">{selectedConfig.label}</h2>
                        <p class="mt-1.5 text-sm text-slate-500">{selectedConfig.description}</p>
                    </div>

                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <label class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            KPI
                            <select
                                bind:value={selectedKpi}
                                class="mt-1.5 w-full min-w-48 rounded-2xl border border-slate-200/80 bg-white/85 px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition duration-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                            >
                                {#each KPI_OPTIONS as option}
                                    <option value={option.id}>{option.label}</option>
                                {/each}
                            </select>
                        </label>

                        <label class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Chart
                            <select
                                bind:value={selectedChartType}
                                class="mt-1.5 w-full rounded-2xl border border-slate-200/80 bg-white/85 px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition duration-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                            >
                                {#each CHART_TYPES.filter((chartType) => allowedChartTypes.includes(chartType.id)) as chartType}
                                    <option value={chartType.id}>{chartType.label}</option>
                                {/each}
                            </select>
                        </label>
                    </div>
                </div>

                <div class="relative h-[22rem] rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,250,252,0.82))] p-3 shadow-inner shadow-slate-100 sm:h-[26rem] sm:p-5">
                    {#if isLoading}
                        <div class="flex h-full items-center justify-center text-sm text-slate-500">Loading dashboard data</div>
                    {:else if selectedRows.length === 0}
                        <div class="flex h-full flex-col items-center justify-center text-center">
                            <p class="font-medium text-slate-700">No data in selected range</p>
                            <p class="mt-1 text-sm text-slate-500">Adjust the dates or check the connected data source.</p>
                        </div>
                    {:else}
                        <canvas bind:this={chartRef} class="h-full w-full"></canvas>
                    {/if}
                </div>
            </section>

            <aside class="grid gap-5">
                <section class="rounded-[2rem] border border-slate-200/70 bg-white/72 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600/70">Channels</p>
                            <h2 class="mt-1 text-lg font-semibold tracking-[-0.02em] text-slate-900">Revenue split</h2>
                        </div>
                        {#if leadingChannel}
                            <span class="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                                {leadingChannel.platform ?? leadingChannel.platform_name}
                            </span>
                        {/if}
                    </div>

                    <div class="mt-5 space-y-4">
                        {#each dashboardData.platform_revenue as channel}
                            {@const revenue = Number(channel.total_revenue ?? 0)}
                            {@const maxRevenue = Math.max(...dashboardData.platform_revenue.map((item) => Number(item.total_revenue ?? 0)), 1)}
                            <div>
                                <div class="mb-2 flex justify-between gap-3 text-sm">
                                    <span class="font-medium text-slate-600">{channel.platform ?? channel.platform_name}</span>
                                    <span class="font-semibold text-slate-900">{formatCurrency(revenue)}</span>
                                </div>
                                <div class="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                    <div class="h-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#2563EB] to-[#14B8A6] shadow-[0_6px_18px_rgba(37,99,235,0.18)]" style={`width: ${(revenue / maxRevenue) * 100}%`}></div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </section>

                <section class="rounded-[2rem] border border-slate-200/70 bg-white/72 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600/70">Watchlist</p>
                    <div class="mt-4 divide-y divide-slate-200/70">
                        {#each watchlist as item}
                            <div class="py-3.5 first:pt-0 last:pb-0">
                                <div class="flex items-center justify-between gap-3">
                                    <p class="text-sm font-medium text-slate-500">{item.title}</p>
                                    <p class="text-sm font-semibold text-slate-900">{item.value}</p>
                                </div>
                                <p class="mt-1.5 text-xs leading-5 text-slate-500">{item.detail}</p>
                            </div>
                        {/each}
                    </div>
                </section>
            </aside>
        </div>

        <div class="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <section class="rounded-[2rem] border border-slate-200/70 bg-white/72 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                <div class="mb-4 flex items-center justify-between">
                    <div>
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600/70">Products</p>
                        <h2 class="mt-1 text-lg font-semibold tracking-[-0.02em] text-slate-900">Top sellers</h2>
                    </div>
                    <span class="text-xs font-medium text-slate-400">Top {topProducts.length}</span>
                </div>

                <div class="space-y-3">
                    {#each topProducts as product, index}
                        <div class="rounded-[1.4rem] border border-slate-200/80 bg-white/80 p-3.5 shadow-sm transition duration-200 hover:shadow-md">
                            <div class="flex items-center justify-between gap-3">
                                <div class="flex min-w-0 items-center gap-3">
                                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-xs font-semibold text-blue-700">{index + 1}</span>
                                    <div class="min-w-0">
                                        <p class="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                                        <p class="text-xs text-slate-500">{product.category ?? product.sku ?? 'Product'}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm font-semibold text-slate-900">{formatCurrency(Number(product.total_revenue ?? 0))}</p>
                                    <p class="text-xs text-slate-500">{formatNumber(Number(product.total_quantity ?? 0))} units</p>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </section>

            <section class="rounded-[2rem] border border-slate-200/70 bg-white/72 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600/70">Data</p>
                        <h2 class="mt-1 text-lg font-semibold tracking-[-0.02em] text-slate-900">{selectedConfig.label} table</h2>
                    </div>
                    <span class="text-xs font-medium text-slate-400">{selectedRows.length} rows</span>
                </div>

                <div class="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/75 shadow-inner shadow-slate-100">
                    <div class="max-h-[25rem] overflow-auto">
                        {#if isLoading}
                            <div class="p-6 text-center text-sm text-slate-500">Loading table</div>
                        {:else if selectedRows.length === 0}
                            <div class="p-6 text-center text-sm text-slate-500">No rows available</div>
                        {:else}
                            <table class="w-full min-w-[720px] text-left text-sm">
                                <thead class="sticky top-0 bg-white/90 text-[11px] uppercase tracking-[0.16em] text-slate-400 backdrop-blur-2xl">
                                    <tr>
                                        {#each getTableHeaders(selectedRows) as header}
                                            <th class="px-4 py-3.5 font-semibold">{formatHeader(header)}</th>
                                        {/each}
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-200/70">
                                    {#each selectedRows as row}
                                        <tr class="transition duration-150 hover:bg-slate-50/80">
                                            {#each getTableHeaders(selectedRows) as header}
                                                <td class="max-w-56 truncate px-4 py-3.5 text-slate-600">{formatCell(header, row[header])}</td>
                                            {/each}
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        {/if}
                    </div>
                </div>
            </section>
        </div>

        <footer class="mt-6 flex flex-col gap-2 pb-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>Cloud BI Dashboard</span>
            <span>{USING_DEMO_DATA ? 'Set VITE_API_BASE_URL to connect the API.' : API_BASE}</span>
        </footer>
    </section>
</main>
