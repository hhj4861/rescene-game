import { group, ball, box, cylinder, curve, link, material } from './primitives.js';
import { createArm, poseArm } from './character-rig.js';
import { characterPose } from './character-motion.js';
import { sculptFace, sculptEyes, sculptHair, garment, softenFaceProportions } from './character-surfaces.js';

export const members = [
  { id:'woni', name:'원이', color:'#859474', hair:'#49372f', style:'bob', outfit:'hoodie', x:-2.02,z:-.28,yaw:.34, greeting:'마지막 한 사람, 기다리고 있었어.', detail:'저기, 비어 있는 자리가 네 자리야.', reply:'좋아. 이제 정말 여섯이 모였네!', after:'네가 하고 싶은 이야기도 천천히 들려줘.' },
  { id:'liv', name:'리브', color:'#52687f', hair:'#242b34', style:'long', outfit:'jacket', x:-1.04,z:-1.06,yaw:.14, greeting:'바다가 보이는 연습실, 꽤 멋지지?', detail:'연습하다 지치면 잠깐 창밖을 봐도 좋아.', reply:'우리 호흡도 조금씩 맞춰 가자.', after:'처음부터 완벽하지 않아도 괜찮아.' },
  { id:'minami', name:'미나미', color:'#9db9cc', hair:'#755039', style:'pony', outfit:'varsity', x:0,z:-1.32,yaw:0, greeting:'어서 와! 오늘부터 함께하는 거지?', detail:'네가 오면 하고 싶은 이야기가 많았어.', reply:'반가워! 우리 멋진 계절을 만들어 보자.', after:'조금 긴장되지만, 그래서 더 기대돼.' },
  { id:'may', name:'메이', color:'#bc9454', hair:'#97704e', style:'wave', outfit:'cardigan', x:1.04,z:-1.06,yaw:-.14, greeting:'창가 자리 좋아해? 여기는 햇빛이 참 좋아.', detail:'오늘의 시작을 노트에 남겨 두려고.', reply:'첫 장에 네 이름도 적어 둘게.', after:'나중에 함께 펼쳐 보면 재미있겠지?' },
  { id:'zena', name:'제나', color:'#a895b7', hair:'#302b35', style:'bangs', outfit:'knit', x:2.02,z:-.28,yaw:-.34, greeting:'기다리는 동안 창밖을 보고 있었어.', detail:'저 멀리 보이는 등대, 같이 보러 가자.', reply:'약속이야. 연습 끝나고 같이 가자!', after:'함께라면 낯선 곳도 금방 익숙해질 거야.' },
];
const faces=[
  {skin:'#f0cdbf',width:.99,length:.94,eyeSpace:.096,eyeHeight:1,eyeTilt:.025,iris:'#73604a',brow:'#674735'},
  {skin:'#efd0c3',width:.95,length:1.02,eyeSpace:.094,eyeHeight:.87,eyeTilt:.08,iris:'#544335',lipWidth:.048,brow:'#423432',earring:true},
  {skin:'#f3d0c1',width:1.01,length:.96,eyeSpace:.097,eyeHeight:1.04,eyeTilt:.035,iris:'#816443',lipWidth:.049,brow:'#755344'},
  {skin:'#ecc8b9',width:.98,length:.99,eyeSpace:.097,eyeHeight:.96,eyeTilt:.02,iris:'#82704f',brow:'#846148',earring:true},
  {skin:'#f0d0c5',width:.97,length:.95,eyeSpace:.096,eyeHeight:1.06,eyeTilt:.055,iris:'#564634',lipWidth:.045,brow:'#43363a'},
];

export function chair(parent,x,z,yaw=0) {
  const g=group(parent,[x,0,z]);g.rotation.y=yaw;
  box(g,[.66,.10,.62],'#88633f',[0,.64,0]);ball(g,[.3,.055,.28],'#d4c5a5',[0,.72,0]);
  for(const side of [-1,1]){link(g,[side*.27,.05,.23],[side*.26,.65,.22],.028,'#654d37');link(g,[side*.29,.04,-.28],[side*.27,1.46,-.25],.028,'#654d37');}
  const back=box(g,[.57,.42,.07],'#a07b53',[0,1.24,-.26]);back.rotation.x=-.09;return g;
}

function outfit(upper,member,cloth){
  const knit=member.outfit==='knit';
  const profile=[[0,.21,.15],[.1,.225,.16],[.35,.205,.158],[.59,.249,.167],[.73,.244,.14],[.81,.145,.086],[.87,.083,.076]];
  garment(upper,profile,cloth);
  garment(upper,[[-.015,.207,.152],[.035,.21,.15],[.055,.22,.154]],member.color,{folds:.001});
  if(knit){
    garment(upper,[[.81,.105,.08],[.89,.083,.076]],'#b7a3c3',{folds:.001});
    for(let i=0;i<13;i++){const x=(i-6)*.025;curve(upper,[[x,.10,.158],[x,.29,.165],[x,.48,.169],[x*.9,.65,.151]],.0018,'#b7a3c3');}
  }else{
    // A thin inset shirt and open zip/cardigan front follow the torso.
    garment(upper,profile,'#eee8dd',{arc:.74,start:-.37,offset:.006,folds:.002});
    for(const side of [-1,1])curve(upper,[[side*.075,.84,.080],[side*.11,.65,.15],[side*.112,.40,.166],[side*.10,.08,.162]],.016,member.color);
    if(member.outfit==='cardigan'){
      for(let i=0;i<5;i++)ball(upper,[.010,.012,.005],'#d4b482',[-.13,.16+i*.118,.174]);
      for(const side of [-1,1])curve(upper,[[side*.13,.28,.152],[side*.19,.25,.118],[side*.22,.29,.077]],.005,'#a8854e');
    }else{
      for(const side of [-1,1])curve(upper,[[side*.13,.075,.142],[side*.145,.38,.15],[side*.125,.63,.145]],.003,'#d4d3c6');
      ball(upper,[.014,.022,.008],'#bdc2b9',[.125,.43,.162]);
    }
    if(member.outfit==='hoodie'){
      ball(upper,[.145,.11,.105],cloth,[0,.82,-.085]);
      for(const side of [-1,1])curve(upper,[[side*.075,.85,.075],[side*.083,.71,.171],[side*.085,.54,.178]],.004,'#e9e6d7');
    }else{
      garment(upper,[[.81,.112,.085],[.87,.083,.076]],member.outfit==='varsity'?'#ece7de':member.color,{folds:.001});
      if(member.outfit==='varsity')for(let i=0;i<4;i++)ball(upper,[.011,.011,.005],'#f0ece1',[-.125,.2+i*.14,.162]);
    }
  }
}

function hand(parent,position,skin,raised=false){
  const g=group(parent,position);if(raised)g.rotation.x=-Math.PI/2;
  ball(g,[.057,.033,.086],skin,[0,0,0]);
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.024,length=.072-Math.abs(i-1.4)*.014;
    curve(g,[[x,0,.043],[x*.98,-.008,.079],[x*.91,-.018,.045+length]],.0115,skin);
    ball(g,[.0115,.0115,.0115],skin,[x*.91,-.018,.045+length]);
  }
  curve(g,[[-.043,0,-.02],[-.073,-.008,.01],[-.073,-.015,.049]],.017,skin);return g;
}

export function createMember(parent,member,index){
  const root=group(parent,[member.x,0,member.z]);root.rotation.y=member.yaw;root.userData.member=index;root.userData.articulated=true;
  chair(root,0,0).name="seat";
  const design=faces[index],skin=material(design.skin,.65),cloth=material(member.color,.94);
  for(const side of [-1,1]){
    link(root,[side*.14,.77,.01],[side*.16,.67,.49],.098,'#535c6b',.103);
    link(root,[side*.16,.67,.49],[side*.17,.16,.56],.064,skin,.075);
    cylinder(root,.068,.065,.15,'#eee8dc',[side*.17,.2,.56]);
    ball(root,[.09,.066,.175],'#ece7da',[side*.17,.084,.64]);
    box(root,[.175,.024,.30],'#d6d0c3',[side*.17,.035,.66]);
    for(let i=0;i<3;i++)curve(root,[[side*.17-.048,.139,.62+i*.028],[side*.17+.048,.14,.62+i*.028]],.004,'#c8c3b9');
  }
  const upper=group(root,[0,.86,0]);upper.userData.articulated=true;
  outfit(upper,member,cloth);cylinder(upper,.067,.082,.20,skin,[0,.92,0]);
  const head=group(upper,[0,1.16,0]);head.scale.set(.93,.93,.93);head.userData.articulated=true;
  const expression=sculptFace(head,design);const eyes=sculptEyes(head,design);softenFaceProportions(head);sculptHair(head,member);
  const arms=[-1,1].map(side=>createArm(upper,side,member,skin,hand));
  const character={root,upper,head,eyes,expression,arms,index,baseYaw:member.yaw,greetingAt:null};
  updateMember(character,0,0);return character;
}

export function createEmptyChair(parent){return chair(parent,0,1.85,Math.PI);}

export function updateMember(character,time,gaze){
  const pose=characterPose(time,character.index,character.greetingAt);
  character.upper.position.y=.86+pose.breath;
  character.head.rotation.set(pose.nod,gaze,pose.tilt);
  character.eyes.forEach(eye=>{eye.scale.y=pose.blink;});
  character.expression.forEach(part=>{part.morphTargetInfluences[0]=pose.smile;});
  character.arms.forEach(arm=>poseArm(arm,pose,arm.side===1));
  return pose;
}
