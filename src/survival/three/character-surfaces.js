/* global document */
import * as T from '/vendor/three/three.module.js';
import { group, mesh, ball, curve } from './primitives.js';

const clamp=T.MathUtils.clamp;
const gauss=(value,center,width)=>Math.exp(-(((value-center)/width)**2));
const profileAt=(profile,y)=>{
  let i=0;while(i<profile.length-2&&y>profile[i+1][0])i++;
  const a=profile[i],b=profile[i+1],prev=profile[Math.max(0,i-1)],next=profile[Math.min(profile.length-1,i+2)];
  const h=b[0]-a[0],t=clamp((y-a[0])/h,0,1),t2=t*t,t3=t2*t;
  return [1,2].map(k=>Math.max(.001,(2*t3-3*t2+1)*a[k]+(t3-2*t2+t)*h*(b[k]-prev[k])/(b[0]-prev[0])+(-2*t3+3*t2)*b[k]+(t3-t2)*h*(next[k]-a[k])/(next[0]-a[0])));
};

// A continuous sculpted surface: cheeks, jaw, brow and nose share one mesh.
export function sculptFace(parent,design) {
  const profile=[[-.30,.014,.050],[-.275,.083,.104],[-.21,.164,.165],[-.12,.220,.206],[0,.239,.215],[.12,.244,.221],[.24,.208,.206],[.32,.127,.14],[.36,.006,.006]];
  const positions=[],uv=[],colors=[],indices=[],rows=56,columns=72;
  const skin=new T.Color(design.skin),blush=new T.Color('#d99591'),eyeShade=new T.Color('#bd8d81');
  for(let j=0;j<=rows;j++){
    const y=-.30+j/rows*.66,[rx,rz]=profileAt(profile,y);
    for(let k=0;k<=columns;k++){
      const a=k/columns*Math.PI*2,x=Math.sin(a)*rx*design.width;
      let z=Math.cos(a)*rz;const front=Math.pow(Math.max(0,Math.cos(a)),12);
      z+=front*(.035*gauss(x,0,.030)*gauss(y,-.045,.052)+.017*gauss(x,0,.033)*gauss(y,.02,.10));
      z+=front*.008*(gauss(x,.13,.056)+gauss(x,-.13,.056))*gauss(y,-.077,.062);
      z-=front*.016*(gauss(x,.105,.060)+gauss(x,-.105,.060))*gauss(y,.033,.041);
      z+=front*.008*gauss(x,0,.083)*gauss(y,-.163,.033);
      positions.push(x,y*design.length,z);uv.push(k/columns,j/rows);
      const cheek=front*.31*(gauss(x,.147,.054)+gauss(x,-.147,.054))*gauss(y,-.084,.046);
      const underEye=front*.08*(gauss(x,.1,.057)+gauss(x,-.1,.057))*gauss(y,.05,.035);
      const c=skin.clone().lerp(blush,cheek).lerp(eyeShade,underEye);colors.push(c.r,c.g,c.b);
      if(j<rows&&k<columns){const i=j*(columns+1)+k;indices.push(i,i+1,i+columns+1,i+1,i+columns+2,i+columns+1);}
    }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(positions.map(()=>0),3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  mesh(parent,geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.58,color:'#fff9f3'}));
  // Subtle lips follow the face instead of separate protruding cheek/mouth beads.
  curve(parent,[[-.046,-.158,.195],[-.019,-.154,.206],[0,-.159,.211],[.019,-.154,.206],[.046,-.158,.195]],.0045,'#a46968');
  curve(parent,[[-.034,-.164,.200],[0,-.174,.211],[.034,-.164,.200]],.006,'#ca8c86');
  for(const side of [-1,1]){
    const ear=ball(parent,[.032,.066,.024],design.skin,[side*.24*design.width,-.036,-.012]);ear.rotation.z=-side*.18;
    ball(parent,[.012,.034,.012],'#d9a796',[side*.255*design.width,-.037,.005]);
    if(design.earring)ball(parent,[.012,.017,.01],'#e1c78c',[side*.25*design.width,-.1,.005]);
  }
}

let irisMap;
function irisTexture(){
  if(irisMap)return irisMap;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(64,60,8,64,64,63);gradient.addColorStop(0,'#231f20');gradient.addColorStop(.31,'#40382e');gradient.addColorStop(.61,'#8b7250');gradient.addColorStop(.87,'#584738');gradient.addColorStop(1,'#252328');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  for(let i=0;i<140;i++){const a=i*2.399;ctx.strokeStyle=i%2?'#ccb08645':'#30262255';ctx.beginPath();ctx.moveTo(64+Math.cos(a)*23,64+Math.sin(a)*23);ctx.lineTo(64+Math.cos(a)*57,64+Math.sin(a)*57);ctx.stroke();}
  ctx.fillStyle='#201c20';ctx.beginPath();ctx.arc(64,59,22,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff9ec';ctx.beginPath();ctx.ellipse(43,35,10,13,-.5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(81,83,5,0,Math.PI*2);ctx.fill();
  irisMap=new T.CanvasTexture(canvas);irisMap.colorSpace=T.SRGBColorSpace;return irisMap;
}

export function sculptEyes(head,design){
  return [-1,1].map(side=>{
    const g=group(head,[side*design.eyeSpace,.032,.210]);g.userData.articulated=true;g.rotation.z=side*design.eyeTilt;
    const width=.064,height=.032*design.eyeHeight,positions=[0,0,.013],uv=[.5,.5],indices=[];
    for(let i=0;i<=48;i++){const a=i/48*Math.PI*2,x=Math.cos(a)*width,y=Math.sin(a)*height;positions.push(x,y*(.85+.15*Math.abs(Math.sin(a))),-.004-Math.abs(x)*.04);uv.push(.5+x/(width*2),.5+y/(height*2));if(i<48)indices.push(0,i+1,i+2);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    mesh(g,geo,new T.MeshStandardMaterial({color:'#fff4e9',roughness:.45,side:T.DoubleSide}));
    const iris=mesh(g,new T.CircleGeometry(.026,32),new T.MeshStandardMaterial({map:irisTexture(),roughness:.38}),[0,0,.015]);iris.scale.y=1.12;
    curve(g,[[-width,0,-.004],[-.039,height*.88,.007],[0,height,.012],[.041,height*.65,.004],[width,-.002,-.005]],.0045,'#44302c');
    curve(g,[[-width,0,-.004],[-.033,-height*.81,.008],[.03,-height*.79,.008],[width,-.002,-.005]],.002,'#ad7e73');
    for(let i=0;i<3;i++)curve(g,[[side*(.043+i*.007),.022-i*.003,.004],[side*(.052+i*.008),.029-i*.002,.004]],.0025,'#44302c');
    curve(head,[[side*.047,.116,.220],[side*.088,.128,.213],[side*.143,.116,.187]],.005,design.brow);
    return g;
  });
}

// Elliptical, tapering locks with strand-level UV texture. No spherical hair beads.
export function lock(parent,points,width,thickness,mat,{curl=0}={}){
  const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),positions=[],uv=[],indices=[],steps=24,sides=8;
  for(let j=0;j<=steps;j++){
    const t=j/steps,p=path.getPoint(t),tangent=path.getTangent(t),cross=new T.Vector3().crossVectors(tangent,new T.Vector3(0,0,1)).normalize();
    if(cross.lengthSq()<.1)cross.set(1,0,0);
    const normal=new T.Vector3().crossVectors(cross,tangent).normalize(),taper=(.55+.45*Math.sin(Math.PI*t*.8))*Math.pow(1-t,.45)+.015;
    for(let k=0;k<=sides;k++){
      const a=k/sides*Math.PI*2,v=p.clone().addScaledVector(cross,Math.cos(a)*width*taper).addScaledVector(normal,Math.sin(a)*thickness*taper);v.z+=curl*Math.sin(t*Math.PI*2)*t;
      positions.push(v.x,v.y,v.z);uv.push(k/sides,t);
      if(j<steps&&k<sides){const i=j*(sides+1)+k;indices.push(i,i+sides+1,i+1,i+1,i+sides+1,i+sides+2);}
    }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return mesh(parent,geo,mat);
}

const hairMats=new Map();
function hairMaterial(color){
  if(hairMats.has(color))return hairMats.get(color);
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#b7b3ac';ctx.fillRect(0,0,128,256);
  for(let i=0;i<80;i++){ctx.strokeStyle=i%3?'#fff7e52a':'#27202028';ctx.lineWidth=i%4===0?1.8:.7;ctx.beginPath();ctx.moveTo(i*1.61,0);ctx.bezierCurveTo(i*1.61+3,90,i*1.61-3,180,i*1.61+1,256);ctx.stroke();}
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const mat=new T.MeshStandardMaterial({color,map:texture,roughness:.43,metalness:.025});hairMats.set(color,mat);return mat;
}

export function sculptHair(head,member){
  const mat=hairMaterial(member.hair),bob=member.style==='bob',pony=member.style==='pony',wave=member.style==='wave';
  garment(head,[[.125,.268,.25],[.23,.238,.235],[.32,.177,.182],[.38,.035,.046],[.388,.001,.001]],mat,{folds:0});
  const end=bob?-.33:pony?-.23:-.78;
  for(let i=0;i<27;i++){
    const a=.1+i/26*(Math.PI-.2),x=Math.cos(a)*.251,z=-Math.sin(a)*.229;
    lock(head,[[x*.34,.341,z*.35],[x*.91,.17,z*.96],[x*1.04,-.10,z],[x*(wave?1.13:1.02),end*.7,z+.016],[x*(bob?.82:wave?1.02:.91),end+(i%3)*.022,z+.058]],.035,.014,mat,{curl:wave?.042:.008});
  }
  if(member.style==='bangs'){
    for(let i=0;i<11;i++){const x=(i-5)*.039;lock(head,[[x*.65,.325,.105],[x,.22,.225],[x+.005,.104+Math.abs(x)*.11,.218]],.029,.01,mat);}
  }else{
    // Side part exposes the forehead and produces different silhouettes for each member.
    const part=bob?.13:pony?-.055:.028;
    for(let i=0;i<8;i++){
      const side=part>0?-1:1,x=side*(.115+i*.016);
      lock(head,[[part,.374,.10],[part*.20,.295,.251],[x*.65,.23+i*.004,.269],[x,.15+i*.008,.25]],.024,.008,mat);
    }
    for(const side of [-1,1])for(let i=0;i<7;i++){
      const x=side*(.17+i*.014),endY=bob?-.18:pony?-.055:-.40-i*.025;
      lock(head,[[part,.353,.045],[side*.14,.282,.181],[x,.14,.225-Math.abs(x)*.13],[side*(.24+i*.006),endY,.13]],.030,.009,mat,{curl:wave?.018:0});
    }
  }
  if(pony){
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;lock(head,[[.02,.25,-.27],[.04+Math.cos(a)*.07,.20,-.35],[.08+Math.cos(a)*.09,-.18,-.39],[.13+Math.cos(a)*.06,-.64,-.27]],.038,.017,mat);}
    const tie=mesh(head,new T.TorusGeometry(.081,.014,8,28),'#c2a477',[.04,.24,-.29]);tie.rotation.x=Math.PI/2;
  }
}

// Smooth shaped garment volume with small fabric folds, shared by torso and cuffs.
export function garment(parent,profile,color,{position=[0,0,0],folds=.004,arc=Math.PI*2,start=0,offset=0}={}){
  const positions=[],uv=[],indices=[],rows=40,columns=64,min=profile[0][0],max=profile.at(-1)[0];
  for(let j=0;j<=rows;j++){
    const y=min+(max-min)*j/rows,[rx,rz]=profileAt(profile,y);
    for(let k=0;k<=columns;k++){
      const a=start+k/columns*arc,wrinkle=folds*Math.sin(a*11+y*24)*Math.sin(j/rows*Math.PI);
      positions.push(Math.sin(a)*(rx+wrinkle+offset),y,Math.cos(a)*(rz+wrinkle+offset));uv.push(k/columns,j/rows);
      if(j<rows&&k<columns){const i=j*(columns+1)+k;indices.push(i,i+1,i+columns+1,i+1,i+columns+2,i+columns+1);}
    }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return mesh(parent,geo,color,position);
}
