import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,symlink,rm} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {prepareWorkspace,sourceFiles} from '../../scripts/mobile-workspace.mjs';
const root=process.env.ARCADE_ARTIFACTS||process.env.ARCADE_TEST_OUTPUT;
test('Flutter verification copies source without caches or symlinks and changes workspace when source changes',{skip:!root},async()=>{
 await mkdir(root,{recursive:true});const temp=await mkdtemp(path.join(root,'mobile-copy-'));
 try{
  const source=path.join(temp,'source');await mkdir(path.join(source,'lib'),{recursive:true});await mkdir(path.join(source,'build'),{recursive:true});
  await writeFile(path.join(source,'lib/main.dart'),'first');await writeFile(path.join(source,'build/cache'),'cache');await writeFile(path.join(source,'local.properties'),'local sdk path');await symlink(path.join(source,'build'),path.join(source,'linked'));
  assert.deepEqual(await sourceFiles(source),['lib/main.dart']);
  await assert.rejects(prepareWorkspace(source,path.join(source,'output')),/outside mobile source/);
  const first=await prepareWorkspace(source,path.join(temp,'output'));assert.equal(await readFile(path.join(first,'lib/main.dart'),'utf8'),'first');
  assert.equal(await prepareWorkspace(source,path.join(temp,'output')),first);
  await writeFile(path.join(source,'lib/main.dart'),'second');const second=await prepareWorkspace(source,path.join(temp,'output'));assert.notEqual(second,first);assert.equal(await readFile(path.join(first,'lib/main.dart'),'utf8'),'first');
 }finally{await rm(temp,{recursive:true,force:true});}
});
