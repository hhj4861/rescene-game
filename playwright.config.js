/* global process */
import {defineConfig,devices} from '@playwright/test';
const outputDir=process.env.ARCADE_TEST_OUTPUT;
if(!outputDir)throw new Error('Set ARCADE_TEST_OUTPUT to a task-specific artifact directory.');
const basePath=process.env.ARCADE_BASE_PATH||'/';
if(!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(basePath))throw new Error('ARCADE_BASE_PATH must be a slash-delimited path.');
const baseURL=`http://127.0.0.1:4331${basePath}`;
export default defineConfig({
  testDir:'tests/browser',outputDir,reporter:'list',timeout:45000,workers:2,
  use:{baseURL,screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'node scripts/preview-tests.mjs',url:baseURL,reuseExistingServer:false},
  projects:[{name:'desktop-chromium',use:{browserName:'chromium',viewport:{width:1280,height:900}}},{name:'mobile-chromium',use:{...devices['Pixel 7']}},{name:'mobile-webkit',use:{...devices['iPhone 13']}}],
});
