import * as T from '/vendor/three/three.module.js';
import { group, box, ball, cylinder, link, curve, sign, mesh, woodTexture } from './primitives.js';

function plant(parent,position,size=1,flower=false) {
  const g=group(parent,position);g.scale.setScalar(size);
  cylinder(g,.18,.12,.30,'#c39772',[0,.15,0]);cylinder(g,.168,.168,.018,'#554c38',[0,.30,0]);
  for(let i=0;i<7;i++){
    const a=i*2.4,h=.55+(i%3)*.13,x=Math.sin(a)*.24,z=Math.cos(a)*.24;
    curve(g,[[0,.28,0],[x*.4,h*.8,z*.4],[x,h,z]],.012,'#708260');
    const leaf=ball(g,[.08,.17,.025],i%2?'#8f9f71':'#657f59',[x*.8,h*.84,z*.8]);leaf.rotation.set(.6,a,-x*2);
    if(flower){ball(g,[.04,.04,.04],'#d1a657',[x,h,z]);for(let k=0;k<5;k++)ball(g,[.046,.02,.034],'#f5e9d3',[x+Math.sin(k*1.26)*.058,h,z+Math.cos(k*1.26)*.058]);}
  }return g;
}

function mug(parent,x,z,color) {
  cylinder(parent,.091,.076,.17,color,[x,1.267,z]);cylinder(parent,.078,.078,.006,'#765940',[x,1.355,z]);
  const handle=mesh(parent,new T.TorusGeometry(.061,.016,8,16),color,[x+.093,1.28,z]);return handle;
}

function house(parent,x,z,scale,color='#e7dfc6') {
  const g=group(parent,[x,-.48,z]);g.scale.setScalar(scale);
  box(g,[1,1.1,.8],color,[0,.55,0]);
  const roof=mesh(g,new T.ConeGeometry(.78,.5,4),'#b97f67',[0,1.35,0]);roof.rotation.y=Math.PI/4;roof.scale.z=.85;
  for(const s of [-1,1])box(g,[.17,.27,.025],'#719494',[s*.26,.68,.415]);
  box(g,[.18,.39,.025],'#aa916b',[0,.2,.415]);box(g,[.10,.4,.10],'#ddd1b7',[.28,1.4,-.1]);return g;
}

function boat(parent,x,z,size) {
  const g=group(parent,[x,-.33,z]);g.scale.setScalar(size);
  g.userData.articulated=true;
  ball(g,[.32,.14,.8],'#eee6d6',[0,0,0]);ball(g,[.23,.06,.56],'#9b7d5a',[0,.08,0]);
  cylinder(g,.019,.019,1.7,'#766850',[0,.86,0]);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([0,.25,.03,0,1.64,.03,.74,.25,.03],3));geometry.computeVertexNormals();
  mesh(g,geometry,new T.MeshStandardMaterial({color:'#fff6dc',side:T.DoubleSide}));g.rotation.y=.55;return g;
}

export function createWorld(scene) {
  const room=group(scene),wood=new T.MeshStandardMaterial({map:woodTexture(),color:'#dac29e',roughness:.74});
  box(room,[10,.25,7.2],'#c6b89b',[0,-.14,0]);
  for(let i=0;i<28;i++)box(room,[.351,.045,7.15],wood,[-4.81+i*.356,.012,0]);
  // Open windows make the sea a real view through the architecture.
  box(room,[10,.65,.18],'#e9e1cb',[0,.33,-3.25]);
  box(room,[10,.13,.36],wood,[0,.7,-3.25]);
  for(const x of [-4.8,-2.5,0,2.5,4.8]){
    box(room,[.13,3.85,.15],'#a88a61',[x,1.94,-3.25]);
    box(room,[.07,3.8,.055],'#f0e6cb',[x+.08,1.97,-3.17]);
  }
  box(room,[10,.15,.18],'#a88a61',[0,3.8,-3.25]);
  box(room,[10,.08,.12],'#e9dfc7',[0,2.95,-3.25]);
  for(const x of [-4.8,4.8]){
    box(room,[.20,3.9,.20],wood,[x,1.94,1.3]);
    box(room,[.18,.23,5.0],wood,[x,3.84,-.85]);
  }
  // Low side parapets keep the orbit unobstructed.
  box(room,[.18,.72,5.8],'#e8dfc8',[-4.9,.36,-.35]);box(room,[.18,.72,5.8],'#e8dfc8',[4.9,.36,-.35]);
  // Oval table, radial grain and chamfered edges.
  const table=group(room,[0,1.15,.22]);
  const top=cylinder(table,1,1,.11,wood,[0,0,0],96);top.scale.set(2.48,1,1.25);
  const rim=cylinder(table,1,1,.06,'#9d794f',[0,-.055,0],96);rim.scale.set(2.44,1,1.21);
  for(const x of [-1.5,1.5])for(const z of [-.65,.65])link(room,[x*1.06,.03,z+.22],[x,1.10,z+.22],.075,'#765a3d',.065);
  for(const [i,x,z] of [[0,-1.55,.17],[1,-.94,-.46],[2,0,-.62],[3,.96,-.46],[4,1.57,.18]]){
    mug(room,x+.23,z,['#d5deba','#688aa0','#eee6cb','#d7b175','#b2a0ba'][i]);
    const notebook=group(room,[x,1.219,z+.26]);notebook.rotation.y=(i-2)*-.20;
    box(notebook,[.35,.028,.26],i%2?'#6d8987':'#ecdfc1',[0,0,0]);box(notebook,[.325,.011,.244],'#fffae9',[0,.020,0]);
    for(let k=0;k<5;k++)box(notebook,[.23,.002,.004],'#d8d5c7',[.01,.027,-.07+k*.033]);
    link(notebook,[.20,.035,-.09],[.20,.035,.13],.009,'#596672');
  }
  plant(room,[0,1.215,.3],.75,true);
  // Empty player's place.
  const diary=box(room,[.46,.045,.32],'#536f74',[-.7,1.232,1.07]);diary.rotation.y=.15;
  mug(room,.6,1.09,'#eee4ca');
  // Bookcase and a small writing board.
  const shelf=group(room,[-4.06,0,-2.64]);
  for(const x of [-.65,.65])box(shelf,[.09,2.8,.45],wood,[x,1.4,0]);
  for(let row=0;row<4;row++){
    box(shelf,[1.39,.08,.48],wood,[0,.22+row*.67,0]);
    for(let i=0;i<6;i++){
      const book=box(shelf,[.09+(i%2)*.035,.34+(i%3)*.045,.24],['#66848b','#b59b7b','#d2c6a3','#9d7163'][i%4],[-.49+i*.17,.45+row*.67,0]);book.rotation.z=i===5?-.12:0;
    }
  }
  plant(room,[-4.05,2.78,-2.62],.72);
  const board=group(room,[-3.63,1.78,-1.05]);board.rotation.y=.50;
  box(board,[1.55,.97,.08],wood,[0,0,0]);sign(board,'Good people,\ngreater together.',1.42,.83,[0,0,.05],{font:36});
  for(const x of [-.53,.53])link(board,[x,-1.76,.1],[x,.4,0],.035,'#ad8b61');
  // Two planters frame the sunlit window.
  plant(room,[3.9,0,-2.45],2.1);plant(room,[-3.3,0,1.3],1.7);plant(room,[4.3,.77,-3.17],.9,true);
  sign(room,'RESCENE\nOUR SEASON',.92,1.25,[3.65,1.94,-3.12],{font:53});
  const lamp=group(room,[.2,3.65,-.5]);cylinder(lamp,.014,.014,.7,'#544e45',[0,.3,0]);
  cylinder(lamp,.15,.38,.23,'#586165',[0,-.12,0]);ball(lamp,[.09,.08,.09],new T.MeshStandardMaterial({color:'#ffe4ab',emissive:'#ffc877',emissiveIntensity:1}),[0,-.21,0]);
  // Sea, headland, village and lighthouse are geometry beyond the room.
  const sea=mesh(scene,new T.PlaneGeometry(260,220,1,1),new T.MeshStandardMaterial({color:'#388b9d',roughness:.32,metalness:.12}),[0,-.53,-75]);sea.rotation.x=-Math.PI/2;sea.castShadow=false;
  const ripples=group(scene);for(let i=0;i<72;i++){
    const x=Math.sin(i*17.27)*38,z=-5-(i*2.37)%65;
    const line=box(ripples,[.5+(i%5)*.45,.008,.025],i%3?'#a6d0ce':'#daece1',[x,-.509,z]);line.castShadow=false;line.receiveShadow=false;
  }
  for(let i=0;i<7;i++)ball(scene,[6+i%3,1.8+(i%2),3.6],'#7eaaa0',[-32+i*12,-.8,-70-(i%3)*6]);
  for(let i=0;i<9;i++){
    const x=-15+(i%3)*2.2,z=-8-Math.floor(i/3)*3.5;
    ball(scene,[3.4,.5,2.2],'#b3ad8a',[x,-.55,z]);house(scene,x,z,1+(i%2)*.4);
  }
  const island=group(scene,[12,-.48,-22]);ball(island,[4,.55,2.4],'#a5ad96',[0,-.1,0]);
  cylinder(island,.36,.62,3.6,'#ece5cf',[0,1.7,0]);cylinder(island,.53,.53,.16,'#6d8584',[0,3.5,0]);
  cylinder(island,.30,.3,.56,'#d3d7b6',[0,3.85,0]);mesh(island,new T.ConeGeometry(.59,.38,24),'#76878a',[0,4.3,0]);
  const boats=[boat(scene,6,-11,.85),boat(scene,-5,-18,1.1),boat(scene,17,-37,1.3)];
  // Small clouds, deliberately beyond the orbitable room.
  for(let i=0;i<8;i++)for(let j=0;j<3;j++)ball(scene,[3+j,1.2,1.1],'#ecf2e8',[-45+i*14+j*2,11+(i%3)*2,-80]);
  const hemisphere=new T.HemisphereLight('#f1f4e7','#a99b7e',1.8);scene.add(hemisphere);
  const sun=new T.DirectionalLight('#fff1d4',2.7);sun.position.set(-4,9,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-8,right:8,top:7,bottom:-6,near:1,far:25});sun.shadow.normalBias=.03;sun.shadow.bias=-.0003;scene.add(sun);
  const fill=new T.DirectionalLight('#cbe5eb',1.1);fill.position.set(4,3,-5);scene.add(fill);
  return {room,boats,ripples};
}
