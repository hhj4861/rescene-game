/* global process */
import {defineConfig,devices} from '@playwright/test';
const outputDir=process.env.ARCADE_TEST_OUTPUT;
if(!outputDir)throw new Error('Set ARCADE_TEST_OUTPUT to a task-specific artifact directory.');
export default defineConfig({
  testDir:'tests/browser',outputDir,reporter:'list',timeout:45000,workers:2,
  use:{baseURL:'http://127.0.0.1:4331',screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'npm run dev -- --port 4331',url:'http://127.0.0.1:4331',reuseExistingServer:false},
  projects:[{name:'desktop-chromium',use:{browserName:'chromium',viewport:{width:1280,height:900}}},{name:'mobile-chromium',use:{...devices['Pixel 7']}},{name:'mobile-webkit',use:{...devices['iPhone 13']}}],
});
