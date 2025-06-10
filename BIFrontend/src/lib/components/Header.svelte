<script lang="ts">
    export let title: string = 'BI Dashboard';
</script>

<header class="w-full bg-white shadow-sm border-b border-slate-100">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 class="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
            {title}
        </h1>
        <nav class="text-sm text-slate-500 space-x-4 hidden md:block">
            <a href="/" class="hover:text-blue-500 font-medium">Home</a>
            <a href="/reports" class="hover:text-blue-500 font-medium">Reports</a>
            <a href="/settings" class="hover:text-blue-500 font-medium">Einstellungen</a>
        </nav>
    </div>
</header>
