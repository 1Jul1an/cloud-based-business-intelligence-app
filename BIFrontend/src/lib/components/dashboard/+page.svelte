<script lang="ts">
    import { onMount } from 'svelte';
    import Chart from 'chart.js/auto';

    let bestsellers = [];
    let totalSales = 0;
    let totalRevenue = 0;
    let chartRef: HTMLCanvasElement | null = null;
    let chartInstance: Chart | null = null;

    const apiBase = 'http://localhost:3000';

    async function fetchBestsellers() {
        const res = await fetch(`${apiBase}/dev/products/bestseller`);
        bestsellers = await res.json();
        totalSales = bestsellers.reduce((sum, p) => sum + Number(p.total_quantity), 0);
        totalRevenue = bestsellers.reduce((sum, p) => sum + Number(p.total_revenue), 0);
    }

    function renderChart() {
        if (chartInstance) {
            chartInstance.destroy();
        }
        if (chartRef) {
            chartInstance = new Chart(chartRef, {
                type: 'bar',
                data: {
                    labels: bestsellers.map((b) => b.name),
                    datasets: [
                        {
                            label: 'Verkaufte Menge',
                            data: bestsellers.map((b) => b.total_quantity),
                            backgroundColor: 'rgba(59, 130, 246, 0.85)',
                            borderRadius: 12,
                            barThickness: 20
                        },
                        {
                            label: 'Umsatz (€)',
                            data: bestsellers.map((b) => b.total_revenue),
                            backgroundColor: 'rgba(16, 185, 129, 0.65)',
                            borderRadius: 12,
                            barThickness: 20
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: { display: false }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 12 } }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: "#eee" },
                            ticks: { font: { size: 12 } }
                        }
                    }
                }
            });
        }
    }

    onMount(async () => {
        await fetchBestsellers();
        renderChart();
    });
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-slate-100 py-10">
    <div class="w-full max-w-6xl space-y-6">
        <!-- Dashboard Header -->
        <div class="flex items-center justify-between mb-1">
            <h1 class="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight select-none">Kerzen Dashboard</h1>
            <span class="rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 px-3 py-1 text-xs font-bold text-white shadow">Minimal Edition</span>
        </div>
        <!-- KPI Cards & Chart -->
        <div class="grid md:grid-cols-4 gap-4">
            <div class="col-span-2 md:col-span-1 bg-white/90 rounded-xl shadow-md px-5 py-4 flex flex-col items-start transition hover:shadow-lg hover:-translate-y-1 duration-150 border border-slate-100">
                <div class="text-xs text-gray-400 mb-1 font-medium">Verkaufte Stück</div>
                <div class="text-2xl font-extrabold text-blue-600">{totalSales}</div>
            </div>
            <div class="col-span-2 md:col-span-1 bg-white/90 rounded-xl shadow-md px-5 py-4 flex flex-col items-start transition hover:shadow-lg hover:-translate-y-1 duration-150 border border-slate-100">
                <div class="text-xs text-gray-400 mb-1 font-medium">Umsatz</div>
                <div class="text-2xl font-extrabold text-emerald-600">{totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
            </div>
            <div class="col-span-2 md:col-span-1 bg-white/90 rounded-xl shadow-md px-5 py-4 flex flex-col items-start transition hover:shadow-lg hover:-translate-y-1 duration-150 border border-slate-100">
                <div class="text-xs text-gray-400 mb-1 font-medium">Produkte</div>
                <div class="text-2xl font-extrabold text-slate-600">{bestsellers.length}</div>
            </div>
            <div class="col-span-4 md:col-span-1 flex flex-col bg-white/95 rounded-xl shadow-md px-5 py-4 border border-slate-100 items-center justify-center">
                <div class="text-xs text-gray-400 mb-1 font-medium">Top Produkt</div>
                <div class="text-base font-semibold text-slate-800 truncate w-full text-center">
                    {#if bestsellers.length}
                        {bestsellers[0].name}
                    {/if}
                </div>
            </div>
        </div>
        <!-- Chart + Table Row -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="col-span-1 md:col-span-2 bg-white/90 rounded-xl shadow-md px-4 py-4 border border-slate-100 flex flex-col items-center">
                <div class="w-full flex items-center justify-between mb-1">
                    <h2 class="text-lg font-semibold text-gray-700">Bestseller Chart</h2>
                </div>
                <canvas bind:this={chartRef} class="w-full" height="140"></canvas>
            </div>
            <div class="col-span-1 bg-white/90 rounded-xl shadow-md px-3 py-3 border border-slate-100">
                <h3 class="text-base font-semibold text-gray-700 mb-2">Produkte Kurzüberblick</h3>
                <div class="overflow-auto max-h-60">
                    <table class="w-full text-sm text-left">
                        <thead>
                        <tr>
                            <th class="py-1 px-1 text-gray-400 font-medium">Produkt</th>
                            <th class="py-1 px-1 text-gray-400 font-medium text-right">Menge</th>
                            <th class="py-1 px-1 text-gray-400 font-medium text-right">Umsatz</th>
                        </tr>
                        </thead>
                        <tbody>
                        {#each bestsellers as p}
                            <tr class="hover:bg-slate-50 transition rounded">
                                <td class="py-1 px-1 font-medium text-slate-700 truncate">{p.name}</td>
                                <td class="py-1 px-1 text-right text-blue-600">{p.total_quantity}</td>
                                <td class="py-1 px-1 text-right text-emerald-600">{Number(p.total_revenue).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
                            </tr>
                        {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <!-- Footer -->
        <div class="flex justify-between items-center pt-6 text-xs text-slate-400">
            <span>&copy; {new Date().getFullYear()} Candle BI</span>
            <span class="italic text-slate-300">Build with SvelteKit, Tailwind, Chart.js</span>
        </div>
    </div>
</div>
