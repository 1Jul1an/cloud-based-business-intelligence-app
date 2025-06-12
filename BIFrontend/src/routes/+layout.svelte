<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { parseTokenAndStore, accessToken } from '$lib/auth';

	onMount(() => {
		parseTokenAndStore();

		accessToken.subscribe((token) => {
			if (!token) {
				const loginUrl = `https://${import.meta.env.VITE_COGNITO_DOMAIN}/login?response_type=token&client_id=${import.meta.env.VITE_COGNITO_CLIENT_ID}&redirect_uri=${import.meta.env.VITE_COGNITO_REDIRECT_URI}`;
				window.location.href = loginUrl;
			}
		});
	});
</script>

<slot />