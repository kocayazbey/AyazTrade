import { test, expect } from '@playwright/test';

test('health endpoint is up', async ({ request }) => {
  const res = await request.get('/api/v1/health');
  expect(res.ok()).toBeTruthy();
});


