import {defineConfig} from '@playwright/test';
import config from './playwright.config.js';

// A fixed public target: no local preview server and no deployment credentials.
export default defineConfig({
  ...config,
  testDir:'tests',
  testMatch:['browser/**/*.spec.js','live/**/*.spec.js'],
  use:{...config.use,baseURL:'https://rescene-arcade.pages.dev/'},
  webServer:undefined,
});
