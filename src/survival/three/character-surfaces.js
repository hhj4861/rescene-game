/* global document */
import * as T from '/vendor/three/three.module.js';
import { group, mesh, ball } from './primitives.js';

const clamp=T.MathUtils.clamp;
const gauss=(value,center,width)=>Math.exp(-(((value-center)/width)**2));
const profileAt=(profile,y)=>{
  let i=0;while(i<profile.length-2&&y>profile[i+1][0])i++;
  const a=profile[i],b=profile[i+1],prev=profile[Math.max(0,i-1)],next=profile[Math.min(profile.length-1,i+2)];
  const h=b[0]-a[0],t=clamp((y-a[0])/h,0,1),t2=t*t,t3=t2*t;
  return [1,2].map(k=>Math.max(.001,(2*t3-3*t2+1)*a[k]+(t3-2*t2+t)*h*(b[k]-prev[k])/(b[0]-prev[0])+(-2*t3+3*t2)*b[k]+(t3-t2)*h*(next[k]-a[k])/(next[0]-a[0])));
};

// UV seams keep separate vertices, but their lighting normals must agree.
function smoothSeam(geometry,rows,columns){
  const normal=geometry.attributes.normal,v=new T.Vector3(),w=new T.Vector3();
  for(let row=0;row<=rows;row++){
    const a=row*(columns+1),b=a+columns;
    v.fromBufferAttribute(normal,a).add(w.fromBufferAttribute(normal,b)).normalize();
    normal.setXYZ(a,v.x,v.y,v.z);normal.setXYZ(b,v.x,v.y,v.z);
  }
}
const faceProfile=[[-.30,.012,.055],[-.276,.068,.097],[-.22,.143,.151],[-.13,.204,.194],[-.025,.228,.211],[.12,.231,.217],[.24,.203,.199],[.32,.125,.133],[.36,.003,.004]];
function faceDepth(x,y,design){
  const localY=y/design.length,[rx,rz]=profileAt(faceProfile,localY);
  const front=Math.sqrt(Math.max(0,1-(x/(rx*design.width))**2));
  return rz*front+faceRelief(x,localY)*front**8;
}
function faceRelief(x,y){
  return .021*gauss(x,0,.026)*gauss(y,-.055,.029)+.012*gauss(x,0,.030)*gauss(y,.005,.080)
    +.006*(gauss(x,.13,.060)+gauss(x,-.13,.060))*gauss(y,-.068,.052)
    -.006*(gauss(x,.102,.061)+gauss(x,-.102,.061))*gauss(y,.035,.037)
    +.006*gauss(x,0,.075)*gauss(y,-.15,.031);
}

function lip(parent,design,upper){
  const positions=[],uv=[],indices=[],width=design.lipWidth||.047,steps=48;
  for(let i=0;i<=steps;i++){
    const t=-1+2*i/steps,x=t*width,seam=-.148+.007*Math.abs(t)**1.7;
    const thickness=(upper?.010:.014)*(1-t*t)*(upper?(.75+.25*Math.sin(Math.abs(t)*Math.PI)):1);
    for(let j=0;j<=3;j++){
      const y=seam+(upper?1:-1)*thickness*j/3;
      positions.push(x,y,faceDepth(x,y,design)+.0017+.003*Math.sin(j/3*Math.PI)*(1-t*t));uv.push(i/steps,j/3);
      if(i<steps&&j<3){const n=i*4+j;indices.push(n,n+4,n+1,n+1,n+4,n+5);}
    }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  return mesh(parent,geo,new T.MeshStandardMaterial({color:upper?'#bc797c':'#d89592',roughness:.66,side:T.DoubleSide}));
}

export function sculptFace(parent,design) {
  const positions=[],uv=[],colors=[],indices=[],rows=72,columns=96;
  const skin=new T.Color(design.skin),blush=new T.Color('#dc9694'),shade=new T.Color('#ba7e76');
  for(let j=0;j<=rows;j++){
    const y=-.30+j/rows*.66,[rx,rz]=profileAt(faceProfile,y);
    for(let k=0;k<=columns;k++){
      const a=k/columns*Math.PI*2,x=Math.sin(a)*rx*design.width,front=Math.max(0,Math.cos(a));
      const z=Math.cos(a)*rz+faceRelief(x,y)*front**8;
      positions.push(x,y*design.length,z);uv.push(k/columns,j/rows);
      const cheek=front**4*.27*(gauss(x,.132,.059)+gauss(x,-.132,.059))*gauss(y,-.077,.039);
      const nose=front**12*.045*(gauss(x,.014,.008)+gauss(x,-.014,.008))*gauss(y,-.075,.006);
      const c=skin.clone().lerp(blush,cheek).lerp(shade,nose);colors.push(c.r,c.g,c.b);
      if(j<rows&&k<columns){const i=j*(columns+1)+k;indices.push(i,i+1,i+columns+1,i+1,i+columns+2,i+columns+1);}
    }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();smoothSeam(geo,rows,columns);
  const expression=[mesh(parent,geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.72,color:'#ffffff'})),lip(parent,design,true),lip(parent,design,false)];
  for(const side of [-1,1]){
    const ear=ball(parent,[.028,.059,.022],design.skin,[side*.232*design.width,-.036,-.012]);ear.rotation.z=-side*.18;
    ball(parent,[.010,.030,.011],'#d9a796',[side*.245*design.width,-.037,.005]);
    if(design.earring)ball(parent,[.009,.014,.009],'#dec598',[side*.241*design.width,-.09,.005]);
  }
  for(const [index,part] of expression.entries()){
    const geometry=part.geometry,target=geometry.clone(),positions=target.attributes.position;
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      const weight=z>.14?gauss(y,-.145,.044)*gauss(Math.abs(x),.049,.036):0;
      positions.setXYZ(i,x*(1+weight*.025),y+weight*.008,z+weight*.001);
    }
    target.computeVertexNormals();if(index===0)smoothSeam(target,rows,columns);positions.name='smile';
    geometry.morphAttributes.position=[positions];geometry.morphAttributes.normal=[target.attributes.normal];part.updateMorphTargets();
  }
  return expression;
}

const eyeMaps=new Map();
function eyeTexture(design){
  const key=design.iris||'#66513b';if(eyeMaps.has(key))return eyeMaps.get(key);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#f0e5dc';ctx.fillRect(0,0,512,256);
  const shadow=ctx.createLinearGradient(0,0,0,256);shadow.addColorStop(0,'#936b5c90');shadow.addColorStop(.4,'#ffffff00');shadow.addColorStop(1,'#d0aca930');ctx.fillStyle=shadow;ctx.fillRect(0,0,512,256);
  ctx.save();ctx.translate(256,122);ctx.scale(1,1.14);
  const grad=ctx.createRadialGradient(0,0,24,0,0,126);grad.addColorStop(0,'#25201e');grad.addColorStop(.38,key);grad.addColorStop(.78,key);grad.addColorStop(1,'#302826');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(0,0,126,0,Math.PI*2);ctx.fill();
  for(let i=0;i<150;i++){const a=i*2.399;ctx.strokeStyle=i%2?'#dabf8e40':'#211c1945';ctx.beginPath();ctx.moveTo(Math.cos(a)*42,Math.sin(a)*42);ctx.lineTo(Math.cos(a)*118,Math.sin(a)*118);ctx.stroke();}
  ctx.fillStyle='#221e20';ctx.beginPath();ctx.arc(0,-3,44,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff9ed';ctx.beginPath();ctx.ellipse(-36,-43,17,21,-.4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.4;ctx.beginPath();ctx.arc(28,42,7,0,Math.PI*2);ctx.fill();ctx.restore();
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;eyeMaps.set(key,texture);return texture;
}

// Eye surfaces and tapered eyelids share the face's depth function. This avoids
// floating white eye discs and lets the outer corners recede into the temples.
export function sculptEyes(head,design){
  return [-1,1].map(side=>{
    const cx=side*design.eyeSpace,cy=.035,g=group(head,[cx,cy,0]);g.userData.articulated=true;
    const width=.061,height=.030*design.eyeHeight,angle=side*design.eyeTilt;
    const point=(x,y,offset=.003)=>{
      const dx=x*Math.cos(angle)-y*Math.sin(angle),dy=x*Math.sin(angle)+y*Math.cos(angle);
      return [dx,dy,faceDepth(cx+dx,cy+dy,design)+offset];
    };
    const positions=point(0,0,.007),uv=[.5,.5],indices=[];
    for(let i=0;i<=64;i++){
      const a=i/64*Math.PI*2,x=Math.cos(a)*width,y=Math.sin(a)*height;
      positions.push(...point(x,y));uv.push(.5+x/(width*2),.5+y/(height*2));if(i<64)indices.push(0,i+1,i+2);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    mesh(g,geo,new T.MeshStandardMaterial({map:eyeTexture(design),roughness:.52,side:T.DoubleSide}));
    for(const upper of [true,false]){
      const p=[],ind=[];
      for(let i=0;i<=40;i++){
        const t=-1+2*i/40,x=t*width,y=(upper?1:-1)*height*Math.sqrt(Math.max(0,1-t*t));
        const thick=(upper?.005:.0015)*Math.sin(i/40*Math.PI);
        p.push(...point(x,y,.007),...point(x,y+(upper?1:-1)*thick,.007));
        if(i<40){const n=i*2;ind.push(n,n+2,n+1,n+1,n+2,n+3);}
      }
      const lid=new T.BufferGeometry();lid.setAttribute('position',new T.Float32BufferAttribute(p,3));lid.setIndex(ind);lid.computeVertexNormals();
      mesh(g,lid,new T.MeshStandardMaterial({color:upper?'#513b37':'#b28a80',roughness:.8,side:T.DoubleSide}));
    }
    const p=[],ind=[];
    for(let i=0;i<=28;i++){
      const t=i/28,x=side*(.044+t*.111),y=.101+.012*Math.sin(t*Math.PI)-t*.008;
      const thick=.0045*Math.sin(Math.PI*(.10+.9*t));
      p.push(x,y,faceDepth(x,y,design)+.002,x,y+thick,faceDepth(x,y+thick,design)+.002);
      if(i<28){const n=i*2;ind.push(n,n+1,n+2,n+1,n+3,n+2);}
    }
    const brow=new T.BufferGeometry();brow.setAttribute('position',new T.Float32BufferAttribute(p,3));brow.setIndex(ind);brow.computeVertexNormals();mesh(head,brow,new T.MeshStandardMaterial({color:design.brow,roughness:.9,side:T.DoubleSide}));
    return g;
  });
}

export function softenFaceProportions(head){
  head.traverse(object=>{
    if(!object.isMesh||object.parent!==head)return;
    // Only the face/eyes have been built at this point, before hair is added.
    const geometry=object.geometry;
    if(object.position.y<0)object.position.y*=.84;
    const transform=attribute=>{
      for(let i=0;i<attribute.count;i++)if(attribute.getY(i)<0)attribute.setY(i,attribute.getY(i)*.84);
    };
    // Ear spheres use shared unit geometry, so adjust their instance scale only.
    if(geometry.type==='SphereGeometry'){object.scale.y*=.84;return;}
    transform(geometry.attributes.position);
    geometry.morphAttributes.position?.forEach(transform);
    geometry.computeVertexNormals();
    if(geometry.attributes.position.count===73*97)smoothSeam(geometry,72,96);
    if(geometry.morphAttributes.position){
      geometry.morphAttributes.normal=geometry.morphAttributes.position.map(position=>{
        const target=new T.BufferGeometry();target.setAttribute('position',position);target.setIndex(geometry.index);target.computeVertexNormals();
        if(position.count===73*97)smoothSeam(target,72,96);return target.attributes.normal;
      });
    }
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
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();smoothSeam(geo,steps,sides);return mesh(parent,geo,mat);
}

const hairMats=new Map();
function hairMaterial(color){
  if(hairMats.has(color))return hairMats.get(color);
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#b7b3ac';ctx.fillRect(0,0,128,256);
  for(let i=0;i<80;i++){ctx.strokeStyle=i%3?'#fff7e52a':'#27202028';ctx.lineWidth=i%4===0?1.8:.7;ctx.beginPath();ctx.moveTo(i*1.61,0);ctx.bezierCurveTo(i*1.61+3,90,i*1.61-3,180,i*1.61+1,256);ctx.stroke();}
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const mat=new T.MeshStandardMaterial({color,map:texture,roughness:.66,metalness:0});hairMats.set(color,mat);return mat;
}

export function sculptHair(head,member){
  const mat=hairMaterial(member.hair),bob=member.style==='bob',pony=member.style==='pony',wave=member.style==='wave';
  const highlight=hairMaterial('#'+new T.Color(member.hair).lerp(new T.Color('#9c8065'),.10).getHexString());
  const hairProfile=[[-.3,.225,.209],[-.15,.262,.243],[.10,.260,.245],[.22,.234,.229],[.32,.163,.164],[.378,.044,.046],[.39,.001,.001]];
  const p=[],uv=[],indices=[],rows=48,columns=96;
  for(let j=0;j<=rows;j++)for(let k=0;k<=columns;k++){
    const a=k/columns*Math.PI*2,frontLine=(member.style==='long'||wave)?.305:.225,lower=frontLine-(frontLine+.255)*(1-Math.max(0,Math.cos(a)))**1.8,y=lower+(.39-lower)*j/rows;
    const [rx,rz]=profileAt(hairProfile,y);
    p.push(Math.sin(a)*rx,y,Math.cos(a)*rz);uv.push(k/columns,j/rows);
    if(j<rows&&k<columns){const n=j*(columns+1)+k;indices.push(n,n+1,n+columns+1,n+1,n+columns+2,n+columns+1);}
  }
  const scalp=new T.BufferGeometry();scalp.setAttribute('position',new T.Float32BufferAttribute(p,3));scalp.setAttribute('uv',new T.Float32BufferAttribute(uv,2));scalp.setIndex(indices);scalp.computeVertexNormals();smoothSeam(scalp,rows,columns);mesh(head,scalp,mat);
  const end=bob?-.32:pony?-.20:-.78;
  for(let i=0;i<33;i++){
    const a=.04+i/32*(Math.PI-.08),x=Math.cos(a)*.255,z=-Math.sin(a)*.240;
    lock(head,[[x*.28,.366,z*.30],[x*.86,.20,z*.91],[x*1.04,-.04,z*1.02],[x*(wave?1.15:1.04),end*.7,z+.016],[x*(bob?.90:wave?1.03:.96),end+(i%4)*.012,z+.055]],.029,.010,i%5===0?highlight:mat,{curl:wave?.039:.005});
  }
  if(bob||pony||member.style==='bangs'){
    const count=member.style==='bangs'?25:22;
    for(let i=0;i<count;i++){
      const x=(i-(count-1)/2)/(count-1)*.40;
      const tip=(bob?.075+(x+.20)*.14:.089+Math.abs(x)*.15)+(i%3)*.004;
      lock(head,[[x*.60,.358,.115],[x*.87,.245,.248],[x+.012,.165,.245-Math.abs(x)*.15],[x+.018,tip,.232-Math.abs(x)*.24]],.013,.0025,i%5===0?highlight:mat);
    }
  }
  // Separate framing locks: asymmetrical parting and curved ends replace the
  // identical triangular sweep and hard horizontal cap used by all members.
  const part=wave?-.065:bob?.025:.01;
  for(const side of [-1,1])for(let i=0;i<9;i++){
    const x=side*(.218+i*.006),endY=bob?-.26+i*.007:pony?-.18+i*.008:-.54-i*.017;
    lock(head,[[part+side*i*.007,.373-i*.002,.075],[side*(.135+i*.006),.285,.213],[x,.092,.177],[side*(.257+(wave?.028:0)*Math.sin(i)),-.10,.12],[side*(bob?.239:wave?.277:.26),endY,.070]],.019,.009,i%5===0?highlight:mat,{curl:wave?.025:.006});
  }
  if(member.style==='long'||wave){
    for(const side of [-1,1])for(let i=0;i<7;i++){
      lock(head,[[part+side*.016,.378-i*.001,.105],[side*(.065+i*.008),.326,.205],[side*(.14+i*.01),.236-i*.003,.238],[side*(.213+i*.006),.112-i*.014,.196],[side*(.256+i*.003),-.25-i*.015,.12]],.020,.0035,i%5===0?highlight:mat,{curl:wave?.012:0});
    }
  }
  if(pony){
    for(let i=0;i<18;i++){
      const a=i/18*Math.PI*2;
      lock(head,[[.01,.30,-.24],[.03+Math.cos(a)*.07,.32,-.37],[.07+Math.cos(a)*.095,-.11,-.41],[.14+Math.cos(a)*.065,-.65,-.27]],.029,.012,i%5===0?highlight:mat);
    }
    const tie=mesh(head,new T.TorusGeometry(.074,.011,8,28),'#bdc7de',[.025,.305,-.29]);tie.rotation.x=Math.PI/2;
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
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();if(arc===Math.PI*2)smoothSeam(geo,rows,columns);return mesh(parent,geo,color,position);
}
