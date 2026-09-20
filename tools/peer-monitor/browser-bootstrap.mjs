/* global process */
import { createRequire } from 'node:module';
import { join } from 'node:path';
// Keep macOS seatbelt isolation. Single-process Chromium avoids the denied
// Mach rendezvous service used by its usual multiprocess startup.
const require = createRequire(join(process.env.SURVIVAL_DEPENDENCIES, 'package.json'));
const { chromium } = require('@playwright/test');
const launch = chromium.launch.bind(chromium);
chromium.launch = options => launch({ ...options, args: [...(options?.args || []), '--single-process', '--no-zygote'] });
