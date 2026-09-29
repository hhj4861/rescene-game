/* global document */
import * as T from '/vendor/three/three.module.js';
import {characterPose} from './character-motion.js';

// Original approved town-game art. Chroma key happens only in the runtime
// texture cache; the source file and the five character designs stay intact.
export async function loadDollArt(){
  let image;
  try{image=await new T.ImageLoader().loadAsync('/assets/dolls/rescene-motion-v2.webp');}
  catch(cause){const error=new Error('캐릭터 이미지를 불러오지 못했어요. 다시 열어 주세요.',{cause});error.code='DOLL_LOAD';throw error;}
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height),rgba=data.data;
  for(let i=0;i<rgba.length;i+=4){
    const r=rgba[i],g=rgba[i+1],b=rgba[i+2],excess=g-Math.max(r,b);
    if(excess>42&&g>95){rgba[i+3]=Math.round(255*(1-Math.min(1,(excess-42)/55)));rgba[i+1]=Math.min(g,Math.max(r,b)+18);}
  }
  ctx.putImageData(data,0,0);
  return Array.from({length:5},(_,col)=>[1,2].map(row=>{
    const rows=[0,.365,.665,1],x0=Math.round(col*canvas.width/5),x1=Math.round((col+1)*canvas.width/5);
    const y0=Math.round(rows[row]*canvas.height),y1=Math.round(rows[row+1]*canvas.height);
    // Trim only the blank margins, then keep one common pixel scale across poses.
    let left=x1,right=x0,top=y1,bottom=y0;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(rgba[(y*canvas.width+x)*4+3]>120){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    const frame=document.createElement('canvas');frame.width=right-left+3;frame.height=bottom-top+3;
    const context=frame.getContext('2d',{willReadFrequently:true});context.drawImage(canvas,left,top,right-left+1,bottom-top+1,1,1,right-left+1,bottom-top+1);
    const pixels=context.getImageData(0,0,frame.width,frame.height).data;
    const texture=new T.CanvasTexture(frame);texture.colorSpace=T.SRGBColorSpace;
    return {texture,pixels,width:frame.width,height:frame.height};
  }));
}

export function createDoll(parent,member,index,art){
  const root=new T.Group();root.position.set(member.x,0,member.z);root.userData.member=index;root.userData.articulated=true;parent.add(root);
  const pivot=new T.Group();pivot.position.y=2.48;pivot.userData.externalAvatar=true;root.add(pivot);
  const frames=art.map((frame,pose)=>{
    const material=new T.MeshBasicMaterial({map:frame.texture,transparent:true,alphaTest:.12,side:T.DoubleSide,toneMapped:false});
    const mesh=new T.Mesh(new T.PlaneGeometry(frame.width*.0056,frame.height*.0056),material);
    // Both poses share a head-top anchor, so greeting never changes body scale.
    mesh.position.y=-frame.height*.0056/2;mesh.visible=pose===0;pivot.add(mesh);
    const raycast=mesh.raycast.bind(mesh);
    mesh.raycast=(raycaster,hits)=>{
      if(!mesh.visible)return;
      const candidates=[];raycast(raycaster,candidates);
      for(const hit of candidates){
        const x=Math.min(frame.width-1,Math.max(0,Math.floor(hit.uv.x*frame.width)));
        const y=Math.min(frame.height-1,Math.max(0,Math.floor((1-hit.uv.y)*frame.height)));
        if(frame.pixels[(y*frame.width+x)*4+3]>120)hits.push(hit);
      }
    };
    return mesh;
  });
  return {root,pivot,frames,index,greetingAt:null,kind:'doll',pose:0};
}

export function updateDoll(doll,time,camera){
  const pose=characterPose(time,doll.index,doll.greetingAt),next=pose.lift>.22?1:0;
  doll.pose=next;doll.frames.forEach((mesh,index)=>{mesh.visible=index===next;});
  // Upright billboards preserve the drawn face while the room retains parallax.
  doll.pivot.rotation.y=Math.atan2(camera.position.x-doll.root.position.x,camera.position.z-doll.root.position.z);
  doll.pivot.position.y=2.48+pose.breath+pose.nod*.2;
  doll.pivot.rotation.z=pose.tilt*.35;
  return pose;
}
