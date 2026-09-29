import { defineConfig } from '@playwright/test';

// 워커(worktree)마다 다른 포트로 돌릴 수 있게 한다: `E2E_PORT=5174 npm run e2e`.
// 포트를 지정하면 반드시 이 체크아웃의 코드로 새 dev 서버를 띄운다(다른 체크아웃의 서버 재사용 금지).
const port = Number(process.env.E2E_PORT ?? 5173);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  use: { baseURL, headless: true, viewport: { width: 1024, height: 600 } },
  webServer: { command: `npx vite --port ${port} --strictPort`, url: baseURL, reuseExistingServer: !process.env.E2E_PORT, timeout: 30_000 },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
