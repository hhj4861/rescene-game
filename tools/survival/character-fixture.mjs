/* global process, console, setTimeout */
// Explicit UI verification server. Never imported or selected by the live game.
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startServer} from '../../server/survival/server.mjs';
import {defaultPlan} from '../../server/survival/catalog.mjs';
let failed=false,calls=0;
const runtime={
  describe:()=>({defaultProvider:'litellm',litellm:{configured:true,model:'explicit-character-fixture'}}),
  async run(request){
    const p=JSON.parse(request.prompt),agentId=request.agentId;calls++;
    if(!failed&&p.task==='proposal'&&agentId==='woni'){failed=true;throw new Error('검증용 일시 실패: 원이 제안만 재시도하세요.');}
    let data={agentId,text:`[검증 대사 ${agentId}] ${p.task}: 서로의 호흡을 맞춰 보자.`};
    if(['proposal','discussion'].includes(p.task))data={...data,plan:p.plan||defaultPlan(),sourceRefs:[],memoryRefs:[]};
    if(p.task==='vote')data={...data,approve:true,planHash:p.planHash};
    if(p.task==='performance')data={...data,focus:'breath',intensity:1};
    if(p.task==='reflection')data={...data,eventRef:p.event.eventId,condition:'호흡 부담',action:'다음 무대에서 호흡 맞추기',structuredAction:{focus:'breath'},expectedEffect:{metric:'breath',direction:'down'}};
    if(p.task==='judge')data={...data,scores:p.evidence.map(event=>({teamId:event.teamId,evidenceHash:event.evidenceHash,criteria:Array(5).fill(event.teamId==='team-0'?19:10),reason:'검증용 고정 평가'}))};
    console.log(JSON.stringify({fixture:true,calls,task:p.task,agentId}));
    return {data,provider:'fixture',sessionId:`cast-fixture-${agentId}`,usage:{input_tokens:1},durationMs:1};
  },
};
const dataDir=mkdtempSync(join(tmpdir(),'rescene-cast-ui-'));
const {server,game}=startServer({port:Number(process.env.CAST_TEST_PORT||4324),dataDir,runtime});
server.on('listening',()=>console.log(JSON.stringify({fixture:true,url:`http://127.0.0.1:${server.address().port}/survival-25d.html`,dataDir})));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{game.cancel();server.close();setTimeout(()=>process.exit(0),1500).unref();});
