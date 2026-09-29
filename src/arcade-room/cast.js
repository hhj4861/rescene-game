/* global Image, document, URL */
// Exact atlas used by the town simulation. Original order is Woni, Liv, Minami, May, Zena.
export const MEMBERS={woni:{name:'원이',column:0},liv:{name:'리브',column:1},minami:{name:'미나미',column:2},may:{name:'메이',column:3},zena:{name:'제나',column:4}};
let frames;
export async function loadCast(){
  const img=new Image();img.src=new URL('./town-cast.webp',document.baseURI).href;await img.decode();
  const sheet=document.createElement('canvas');sheet.width=img.width;sheet.height=img.height;const ctx=sheet.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
  const pixels=ctx.getImageData(0,0,img.width,img.height),rgba=pixels.data;
  for(let i=0;i<rgba.length;i+=4){const excess=rgba[i+1]-Math.max(rgba[i],rgba[i+2]);if(excess>42&&rgba[i+1]>95){rgba[i+3]=Math.round(255*(1-Math.min(1,(excess-42)/55)));rgba[i+1]=Math.min(rgba[i+1],Math.max(rgba[i],rgba[i+2])+18);}}
  ctx.putImageData(pixels,0,0);frames={};
  for(const [id,{column}] of Object.entries(MEMBERS)){
    frames[id]=[];
    for(let row=0;row<3;row++){
      const x0=Math.round(column*img.width/5),x1=Math.round((column+1)*img.width/5),y0=Math.round(row*img.height/3),y1=Math.round((row+1)*img.height/3);
      let left=x1,right=x0,top=y1,bottom=y0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(rgba[(y*img.width+x)*4+3]>=120){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      const out=document.createElement('canvas');out.width=320;out.height=360;const w=right-left+1,h=bottom-top+1,scale=Math.min(304/w,348/h);out.getContext('2d').drawImage(sheet,left,top,w,h,(320-w*scale)/2,360-h*scale,w*scale,h*scale);frames[id].push(out);
    }
  }
}
export function drawDoll(ctx,id,x,y,height,pose=0){if(frames?.[id])ctx.drawImage(frames[id][pose],x-height*320/360/2,y-height,height*320/360,height);}
export function paintDolls(root,pose=0){root.querySelectorAll('canvas[data-doll]').forEach(canvas=>{canvas.width=320;canvas.height=360;drawDoll(canvas.getContext('2d'),canvas.dataset.doll,160,360,360,pose);});}
