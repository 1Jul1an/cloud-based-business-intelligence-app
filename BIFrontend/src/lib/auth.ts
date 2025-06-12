import { writable } from 'svelte/store';

export const accessToken = writable<string | null>(null);
export const idToken = writable<string | null>(null);

export function parseTokenAndStore() {
	const hash = window.location.hash;
	if (hash.includes('access_token')) {
		const params = new URLSearchParams(hash.substring(1));
		const access = params.get('access_token');
		const id = params.get('id_token');

		if (access) {
			localStorage.setItem('access_token', access);
			accessToken.set(access);
		}
		if (id) {
			localStorage.setItem('id_token', id);
			idToken.set(id);
		}
		window.history.replaceState({}, document.title, window.location.pathname);
	} else {
		const access = localStorage.getItem('access_token');
		const id = localStorage.getItem('id_token');
		accessToken.set(access);
		idToken.set(id);
	}
}

export function isLoggedIn(): boolean {
	return !!localStorage.getItem('access_token');
}

export function logout() {
	localStorage.clear();
	window.location.href =
		`https://${import.meta.env.VITE_COGNITO_DOMAIN}/logout?client_id=${import.meta.env.VITE_COGNITO_CLIENT_ID}&logout_uri=${import.meta.env.VITE_COGNITO_LOGOUT_URI}`;
}