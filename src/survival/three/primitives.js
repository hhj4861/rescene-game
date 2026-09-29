/* global document */
import * as T from '/vendor/three/three.module.js';

const materials = new Map();
const geometries = new Map();
export function material(color, roughness = .78) {
  const key = `${color}:${roughness}`;
  if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness }));
  return materials.get(key);
}
export function mesh(parent, geometry, color, position = [0,0,0], scale = [1,1,1]) {
  const object = new T.Mesh(geometry, typeof color === 'object' ? color : material(color));
  object.position.set(...position); object.scale.set(...scale); object.castShadow = true; object.receiveShadow = true;
  parent.add(object); return object;
}
export function box(parent, size, color, position) {
  if (!geometries.has('box')) geometries.set('box', new T.BoxGeometry(1,1,1));
  return mesh(parent, geometries.get('box'), color, position, size);
}
export function ball(parent, size, color, position) {
  if (!geometries.has('ball')) geometries.set('ball', new T.SphereGeometry(1,20,12));
  return mesh(parent, geometries.get('ball'), color, position, size);
}
export function cylinder(parent, top, bottom, height, color, position, segments = 24) {
  return mesh(parent, new T.CylinderGeometry(top,bottom,height,segments),color,position);
}
export function link(parent, from, to, radius, color, radiusEnd = radius) {
  const a = new T.Vector3(...from), b = new T.Vector3(...to), direction = b.clone().sub(a);
  const object = cylinder(parent,radiusEnd,radius,direction.length(),color,a.clone().add(b).multiplyScalar(.5).toArray(),12);
  object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()); return object;
}
export function curve(parent, points, radius, color) {
  return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),20,radius,6,false),color);
}
export function group(parent, position = [0,0,0]) { const g=new T.Group();g.position.set(...position);parent.add(g);return g; }
export function sign(parent, text, width, height, position, { ink='#496263', background='#f2e8d2', font=40 }={}) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=Math.round(512*height/width);
  const ctx=canvas.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle=ink;ctx.font=`${font}px Georgia, serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  text.split('\n').forEach((line,i,lines)=>ctx.fillText(line,256,canvas.height/2+(i-(lines.length-1)/2)*font*1.5));
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  return mesh(parent,new T.PlaneGeometry(width,height),new T.MeshStandardMaterial({map:texture,roughness:.9}),position);
}
export function woodTexture() {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d');
  c.fillStyle='#b99262';c.fillRect(0,0,256,256);
  for(let i=0;i<180;i++){const y=(i*47.3)%256;c.strokeStyle=`rgba(${i%3?80:240},${i%3?49:202},${i%3?24:150},.12)`;c.lineWidth=i%4===0?2:.5;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(80,y+4*Math.sin(i),180,y-3,256,y+2);c.stroke();}
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;return texture;
}

// Combine stationary geometry by material. Animated group boundaries stay intact.
// This keeps a room full of books/leaves/hair from requiring thousands of draw calls.
export function batchStatic(root, originals = new Set()) {
  root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert(),batches=new Map(),remove=[];
  function visit(node){
    for(const child of [...node.children]){
      // A skinned or morphing mesh must retain its geometry, weights and targets.
      if(child.userData.externalAvatar)continue;
      if(child.isSkinnedMesh || (child.isMesh && Object.keys(child.geometry.morphAttributes).length))continue;
      if(child.isBone){batchStatic(child,originals);continue;}
      if(child.userData.articulated){batchStatic(child,originals);continue;}
      if(child.isMesh&&!Array.isArray(child.material)){
        const key=`${child.material.uuid}:${child.castShadow}:${child.receiveShadow}`;
        if(!batches.has(key))batches.set(key,{material:child.material,cast:child.castShadow,receive:child.receiveShadow,geometries:[]});
        const geometry=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();
        geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,child.matrixWorld));
        batches.get(key).geometries.push(geometry);originals.add(child.geometry);remove.push(child);
      }else visit(child);
    }
  }visit(root);
  for(const batch of batches.values()){
    const count=batch.geometries.reduce((n,g)=>n+g.attributes.position.count,0),geometry=new T.BufferGeometry();
    for(const [name,size] of [['position',3],['normal',3],['uv',2],...(batch.material.vertexColors?[['color',3]]:[])]){
      const values=new Float32Array(count*size);let offset=0;
      for(const part of batch.geometries){if(part.attributes[name])values.set(part.attributes[name].array,offset);offset+=part.attributes.position.count*size;}
      geometry.setAttribute(name,new T.BufferAttribute(values,size));
    }
    geometry.computeBoundingSphere();const merged=new T.Mesh(geometry,batch.material);merged.castShadow=batch.cast;merged.receiveShadow=batch.receive;root.add(merged);
    batch.geometries.forEach(g=>g.dispose());
  }
  remove.forEach(m=>m.removeFromParent());return originals;
}
