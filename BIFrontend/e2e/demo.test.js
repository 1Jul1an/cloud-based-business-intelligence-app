import { expect, test } from '@playwright/test';

test('home page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
	test('login redirects to Cognito and stores token', async ({ page }) => {
	await page.goto('http://localhost:3000/');
	await expect(page).toHaveURL(/amazoncognito\.com\/login/);
});
