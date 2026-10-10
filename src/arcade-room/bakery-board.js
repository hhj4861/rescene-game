// Each six-cell parcel has a known solution: exchange its two middle tiles.
// Parcels stay in place when cleared; no gravity or replacement tiles are needed.
export function parcelBoard(size,random,isMatched){
 const parcels=[],used=new Set();
 const add=(x,y,w,h)=>{const cells=Array.from({length:6},(_,i)=>(y+Math.floor(i/w))*size+x+i%w);parcels.push({cells,w,h});cells.forEach(i=>used.add(i));};
 const even=size-size%2;
 if(size%2){for(let y=0;y<even;y+=2)add(0,y,3,2);for(let x=3;x+1<size;x+=2)for(let y=0;y+2<even;y+=3)add(x,y,2,3);}
 else{const wide=size-size%3;for(let y=0;y<size;y+=2)for(let x=0;x<wide;x+=3)add(x,y,3,2);for(let x=wide;x+1<size;x+=2)for(let y=0;y+2<size;y+=3)add(x,y,2,3);}
 for(let attempt=0;attempt<400;attempt++){
  const board=Array(size*size).fill(0);
  for(const {cells,w} of parcels){const a=1+Math.floor(random()*5),b=1+(a+Math.floor(random()*4))%5;const pattern=w===3?[a,b,a,b,a,b]:[a,b,b,a,a,b];cells.forEach((cell,i)=>board[cell]=pattern[i]);}
  for(let i=0;i<board.length;i++)if(!used.has(i))board[i]=1+Math.floor(random()*5);
  if(!isMatched(board))return board;
 }
 return null;
}
