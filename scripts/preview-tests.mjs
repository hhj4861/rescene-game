import {spawn} from 'node:child_process';
import {access} from 'node:fs/promises';
import {join} from 'node:path';
import process from 'node:process';

// Test the exact static build that will be uploaded, including project subpaths.
const output=process.env.ARCADE_BUILD_OUTPUT;
if(!output)throw new Error('Build first and set ARCADE_BUILD_OUTPUT to its directory.');
await access(join(output,'index.html'));
const child=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--config','arcade-room.config.js','--outDir',output,'--base',process.env.ARCADE_BASE_PATH||'/','--host','127.0.0.1','--port','4331','--strictPort'],{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
