/* global console */
import {cp,copyFile,mkdir,readdir,readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import process from 'node:process';
import {URL} from 'node:url';

const excluded = new Set(['build','.dart_tool','.idea','.gradle','.DS_Store','local.properties','Generated.xcconfig','flutter_export_environment.sh','.flutter-plugins-dependencies','ephemeral','xcuserdata']);
export async function sourceFiles(root,relative='') {
  const files=[];
  for(const entry of await readdir(path.join(root,relative),{withFileTypes:true})) {
    if(excluded.has(entry.name)||entry.name.endsWith('.iml')||entry.isSymbolicLink())continue;
    const name=path.join(relative,entry.name);
    if(entry.isDirectory())files.push(...await sourceFiles(root,name));
    else if(entry.isFile())files.push(name);
  }
  return files.sort();
}
export async function prepareWorkspace(source,artifacts) {
  const relative=path.relative(path.resolve(source),path.resolve(artifacts));
  if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw new Error('Artifact directory must be outside mobile source.');
  const files=await sourceFiles(source),hash=createHash('sha256');
  for(const name of files){hash.update(name);hash.update('\0');hash.update(await readFile(path.join(source,name)));}
  const workspace=path.join(artifacts,'workspaces',hash.digest('hex').slice(0,16));
  await mkdir(workspace,{recursive:true});
  for(const name of files){const dest=path.join(workspace,name);await mkdir(path.dirname(dest),{recursive:true});await cp(path.join(source,name),dest,{preserveTimestamps:true});}
  return workspace;
}
async function main() {
  const [action='check',...extra]=process.argv.slice(2);
  if(!['prepare','check','android','ios','run'].includes(action))throw new Error('Use prepare, check, android, ios or run.');
  if(!process.env.ARCADE_ARTIFACTS||!path.isAbsolute(process.env.ARCADE_ARTIFACTS))throw new Error('Set ARCADE_ARTIFACTS to an absolute task artifact directory.');
  const artifacts=path.join(process.env.ARCADE_ARTIFACTS,'flutter');
  const source=fileURLToPath(new URL('../apps/mobile/',import.meta.url));
  const workspace=await prepareWorkspace(source,artifacts);
  const env={...process.env,CI:process.env.CI||'true',PUB_CACHE:process.env.PUB_CACHE||path.join(artifacts,'pub-cache'),GRADLE_USER_HOME:process.env.GRADLE_USER_HOME||path.join(artifacts,'gradle-cache'),TMPDIR:path.join(artifacts,'tmp')};
  await Promise.all([env.PUB_CACHE,env.GRADLE_USER_HOME,env.TMPDIR].map(dir=>mkdir(dir,{recursive:true})));
  const flutter=process.env.FLUTTER_BIN||'flutter';
  const execute=(command,args)=>new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd:workspace,env,stdio:'inherit'});
    child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(`${path.basename(command)} exited ${code}`)));
  });
  const run=args=>execute(flutter,['--suppress-analytics',...args]);
  console.log(`Flutter workspace: ${workspace}`);
  const locked=await stat(path.join(source,'pubspec.lock')).then(()=>true,()=>false);
  await run(['pub','get',...(locked?['--enforce-lockfile']:[])]);
  // Dart's analyzer handles non-ASCII artifact paths; Flutter 3.47's LSP client
  // miscounts UTF-8 message lengths on those paths. Both use the SDK analyzer.
  if(action==='check'){
    const dart=process.env.DART_BIN||(path.isAbsolute(flutter)?path.join(path.dirname(flutter),process.platform==='win32'?'dart.bat':'dart'):'dart');
    await execute(dart,['analyze','--fatal-infos']);await run(['test']);
  }
  if(action==='android'){
    await run(['build','apk','--debug',...extra]);
    const dest=path.join(artifacts,'rescene-arcade-debug.apk');
    await copyFile(path.join(workspace,'build/app/outputs/flutter-apk/app-debug.apk'),dest);
    console.log(`Android test APK: ${dest}`);
  }
  if(action==='ios'){
    await run(['build','ios','--simulator','--debug',...extra]);
    // GitHub artifact uploads do not preserve executable bits or bundle links.
    const archive=path.join(artifacts,'rescene-ios-simulator.tar.gz');
    await execute('tar',['-czf',archive,'-C',path.join(workspace,'build/ios/iphonesimulator'),'Runner.app']);
    console.log(`iOS Simulator app archive: ${archive}`);
  }
  if(action==='run')await run(['run',...extra]);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
