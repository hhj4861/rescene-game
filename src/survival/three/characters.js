import * as T from '/vendor/three/three.module.js';
import { group, ball, box, cylinder, curve, link, mesh, material } from './primitives.js';

export const members = [
  { id:'woni', name:'원이', color:'#859474', hair:'#49372f', style:'bob', x:-2.02,z:-.28,yaw:.34, greeting:'마지막 한 사람, 기다리고 있었어.', detail:'저기, 비어 있는 자리가 네 자리야.', reply:'좋아. 이제 정말 여섯이 모였네!', after:'네가 하고 싶은 이야기도 천천히 들려줘.' },
  { id:'liv', name:'리브', color:'#52687f', hair:'#242b34', style:'long', x:-1.04,z:-1.06,yaw:.14, greeting:'바다가 보이는 연습실, 꽤 멋지지?', detail:'연습하다 지치면 잠깐 창밖을 봐도 좋아.', reply:'우리 호흡도 조금씩 맞춰 가자.', after:'처음부터 완벽하지 않아도 괜찮아.' },
  { id:'minami', name:'미나미', color:'#a0c3d3', hair:'#755039', style:'pony', x:0,z:-1.32,yaw:0, greeting:'어서 와! 오늘부터 함께하는 거지?', detail:'네가 오면 하고 싶은 이야기가 많았어.', reply:'반가워! 우리 멋진 계절을 만들어 보자.', after:'조금 긴장되지만, 그래서 더 기대돼.' },
  { id:'may', name:'메이', color:'#c6a05f', hair:'#97704e', style:'wave', x:1.04,z:-1.06,yaw:-.14, greeting:'창가 자리 좋아해? 여기는 햇빛이 참 좋아.', detail:'오늘의 시작을 노트에 남겨 두려고.', reply:'첫 장에 네 이름도 적어 둘게.', after:'나중에 함께 펼쳐 보면 재미있겠지?' },
  { id:'zena', name:'제나', color:'#a895b7', hair:'#302b35', style:'bangs', x:2.02,z:-.28,yaw:-.34, greeting:'기다리는 동안 창밖을 보고 있었어.', detail:'저 멀리 보이는 등대, 같이 보러 가자.', reply:'약속이야. 연습 끝나고 같이 가자!', after:'함께라면 낯선 곳도 금방 익숙해질 거야.' },
];

function chair(parent,x,z,yaw=0) {
  const g=group(parent,[x,0,z]);g.rotation.y=yaw;
  box(g,[.66,.10,.62],'#88633f',[0,.64,0]);ball(g,[.3,.055,.28],'#d4c5a5',[0,.72,0]);
  for(const side of [-1,1]){link(g,[side*.27,.05,.23],[side*.26,.65,.22],.028,'#654d37');link(g,[side*.29,.04,-.28],[side*.27,1.46,-.25],.028,'#654d37');}
  const back=box(g,[.57,.42,.07],'#a07b53',[0,1.24,-.26]);back.rotation.x=-.09;
  return g;
}

function eye(parent,x) {
  const g=group(parent,[x,.02,.234]);g.rotation.y=x>0?.13:-.13;
  g.userData.articulated=true;
  ball(g,[.077,.047,.025],'#fffbef',[0,0,0]);ball(g,[.034,.041,.014],'#6b5643',[0,-.003,.021]);
  ball(g,[.018,.029,.009],'#27292e',[0,-.002,.032]);ball(g,[.008,.010,.005],'#fffdf6',[-.009,.013,.038]);
  curve(g,[[-.072,.005,.01],[-.033,.041,.023],[.028,.039,.022],[.075,.013,.005]],.008,'#493931');
  curve(g,[[-.064,.093,-.012],[-.015,.106,.004],[.061,.091,-.014]],.009,'#645040');return g;
}

function hair(head,member) {
  const c=member.hair;
  const cap=mesh(head,new T.SphereGeometry(1,32,20,0,Math.PI*2,0,1.44),c,[0,.055,-.015],[.295,.354,.277]);
  cap.rotation.x=-.11;
  // Individual sculpted locks: mesh geometry continues around the sides/back of the head.
  const length=member.style==='bob'?.36:.69;
  for(let i=0;i<15;i++){
    const a=.12+i*Math.PI/14, x=Math.cos(a)*.259,z=-Math.sin(a)*.215;
    const lock=ball(head,[.063,length*.59,.081],c,[x,-length*.36,z-.035]);lock.rotation.z=-x*.3;
    curve(head,[[x*.86,.23,z],[x*1.08,-.06,z-.016],[x*1.06,-length*.86,z+.026]],.010,i%3===0?'#84634d':c);
  }
  if(member.style==='bangs'){
    for(let i=0;i<9;i++){const x=(i-4)*.052;const strand=ball(head,[.044,.177,.047],c,[x,.192,.194-Math.abs(x)*.30]);strand.rotation.z=x*.9;}
  }else{
    for(let i=0;i<6;i++){
      const x=-.24+i*.067;
      curve(head,[[.09,.365,.027],[x+.035,.279,.22],[x,.11+Math.abs(x)*.3,.239-Math.abs(x)*.2]],.039,c);
    }
  }
  if(member.style==='pony'){
    ball(head,[.14,.15,.15],c,[.10,.22,-.27]);
    const pony=ball(head,[.16,.41,.14],c,[.13,-.09,-.37]);pony.rotation.z=-.17;
    ball(head,[.15,.025,.07],'#d6b08a',[.10,.23,-.29]);
  }
  if(member.style==='wave') for(const s of [-1,1])for(let i=0;i<3;i++)ball(head,[.082,.15,.074],c,[s*(.27+Math.sin(i)*.025),-.16-i*.14,.009+i*.012]);
}

export function createMember(parent, member, index) {
  const root=group(parent,[member.x,0,member.z]);root.rotation.y=member.yaw;root.userData.member=index;
  root.userData.articulated=true;
  chair(root,0,0);
  const skin=material('#edbc9d',.82),cloth=material(member.color);
  // Seated legs and shoes, torso and sleeves are separate articulated parts.
  for(const s of [-1,1]){
    link(root,[s*.15,.77,.01],[s*.17,.67,.52],.105,'#495163',.11);
    link(root,[s*.17,.67,.52],[s*.18,.16,.58],.077,skin,.081);
    cylinder(root,.081,.078,.15,'#f2ebdc',[s*.18,.2,.58]);
    ball(root,[.105,.076,.19],'#f3edde',[s*.18,.085,.66]);
    box(root,[.2,.025,.34],'#d2c9b5',[s*.18,.035,.68]);
  }
  const upper=group(root,[0,.86,0]);
  upper.userData.articulated=true;
  ball(upper,[.273,.50,.18],cloth,[0,.41,0]);
  ball(upper,[.225,.10,.19],cloth,[0,.03,0]);
  // Open cardigan/jacket seam, light shirt, cuffs and tailored collar.
  ball(upper,[.14,.29,.044],'#f4ede0',[0,.48,.167]);
  for(const s of [-1,1]){
    curve(upper,[[s*.10,.83,.085],[s*.13,.62,.181],[s*.12,.16,.177]],.023,member.color);
    const collar=box(upper,[.10,.145,.025],'#e9e5d9',[s*.096,.77,.156]);collar.rotation.z=s*.35;
  }
  for(let i=0;i<4;i++)ball(upper,[.016,.016,.009],'#e3ddc9',[-.17,.26+i*.13,.157]);
  cylinder(upper,.076,.098,.23,skin,[0,.93,0]);
  const head=group(upper,[0,1.14,0]);
  head.userData.articulated=true;
  ball(head,[.267,.328,.236],skin,[0,0,0]);
  ball(head,[.21,.175,.192],skin,[0,-.147,.035]);
  for(const s of [-1,1])ball(head,[.048,.077,.04],skin,[s*.263,-.03,-.011]);
  const eyes=[eye(head,-.105),eye(head,.105)];
  ball(head,[.026,.047,.049],skin,[0,-.047,.244]);
  curve(head,[[-.051,-.139,.216],[0,-.151,.231],[.051,-.136,.217]],.009,'#af6b65');
  ball(head,[.041,.012,.008],'#d69888',[0,-.161,.224]);
  for(const s of [-1,1])ball(head,[.052,.017,.006],'#dfa08d',[s*.163,-.089,.189]);
  hair(head,member);
  const arms=[];
  for(const s of [-1,1]){
    const arm=group(upper,[s*.235,.72,0]);
    arm.userData.articulated=true;
    link(arm,[0,0,0],[s*.077,-.32,.12],.099,cloth,.085);
    link(arm,[s*.077,-.32,.12],[s*.02,-.29,.53],.083,cloth,.071);
    ball(arm,[.073,.048,.115],skin,[s*.01,-.285,.60]);
    for(let f=0;f<4;f++)ball(arm,[.012,.019,.053],skin,[s*.01+(f-1.5)*.027,-.287,.679]);
    arms.push(arm);
  }
  const wave=group(upper,[.235,.72,0]);wave.visible=false;
  wave.userData.articulated=true;
  link(wave,[0,0,0],[.22,.02,.05],.10,cloth,.082);link(wave,[.22,.02,.05],[.26,.34,.1],.075,cloth,.061);
  ball(wave,[.074,.107,.032],skin,[.26,.44,.10]);
  for(let f=0;f<4;f++)link(wave,[.205+f*.035,.48,.10],[.20+f*.041,.60-Math.abs(f-1.5)*.018,.10],.016,skin,.012);
  link(wave,[.21,.43,.10],[.157,.49,.11],.022,skin,.018);
  return {root,upper,head,eyes,arms,wave,index,baseYaw:member.yaw};
}

export function createEmptyChair(parent) {return chair(parent,0,1.85,Math.PI);}
