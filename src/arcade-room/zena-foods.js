// IDs 1–5 retain their original meaning for existing saved link boards.
export const LINK_FOODS=['빈칸','식빵','도넛','컵케이크','소보로빵','말차빵','라면','초밥','피자','햄버거','삼각김밥','딸기','아이스크림'];
export const linkFoodName=value=>LINK_FOODS[value]||'음식';
const menu=[1,2,3,6,7,8,4,9,10,5,11,12];
export const linkMenu=stage=>menu.slice(0,Math.min(menu.length,6+Math.floor((stage-1)/3)));

// Canvas shapes stay consistent across browsers without relying on emoji fonts.
export function drawFood(c,x,y,value,size){
 c.save();c.translate(x,y);c.scale(size/48,size/48);
 const oval=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
 const rect=(x,y,w,h,color,r=4)=>{c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
 const shape=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
 const line=(points,color,width=2)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
 oval(0,20,23,4,'#8a52311d');
 if(value===6){
  oval(0,3,23,19,'#c65543');rect(-10,17,20,4,'#943b35');oval(0,-4,24,11,'#f4dac0');oval(0,-4,20,8,'#b95d27');
  for(const y of [-7,-3,1])line([[-15,y],[-9,y-2],[-3,y+1],[4,y-2],[11,y]],'#f6d984',2);
  oval(11,-5,6,5,'#fff8e8');oval(12,-5,3,3,'#efb537');rect(-12,-9,3,3,'#48865e',1);rect(-4,-4,3,3,'#48865e',1);
  line([[-16,-22],[15,-12]],'#714c36',2);line([[-12,-25],[18,-15]],'#714c36',2);
 }else if(value===7){
  rect(-22,-5,44,24,'#dbcbb0',9);rect(-21,-8,42,23,'#fffdf0',9);rect(-24,-14,48,16,'#ec846b',7);
  for(const x of [-15,-3,9])line([[x,-12],[x+6,-2]],'#ffc2a1',3);rect(-4,-14,9,30,'#33534a',2);
 }else if(value===8){
  shape([[-22,-20],[23,-20],[0,23]],'#c58a46');shape([[-18,-14],[19,-14],[0,18]],'#f2cd66');line([[-20,-20],[21,-20]],'#c58a46',7);
  for(const [x,y] of [[-8,-8],[10,-7],[1,6]])oval(x,y,5,5,'#c75744');line([[-10,2],[-6,5]],'#588464',3);line([[3,-11],[7,-10]],'#588464',3);
 }else if(value===9){
  oval(0,-5,23,17,'#dea052');rect(-23,-3,46,8,'#6d9857');rect(-22,3,44,8,'#763f31');shape([[-22,2],[22,2],[8,10]],'#f3c951');rect(-22,11,44,10,'#dea052',6);
  for(const [x,y] of [[-10,-13],[2,-16],[12,-10]])line([[x,y],[x+3,y+1]],'#fff1bc',2);
 }else if(value===10){
  shape([[0,-25],[-24,19],[24,19]],'#cfbea3');shape([[0,-22],[-21,17],[21,17]],'#fffdf0');rect(-9,2,18,18,'#34554b',2);
  oval(-7,-3,1,1,'#baa991');oval(5,-9,1,1,'#baa991');
 }else if(value===11){
  shape([[-22,-9],[22,-9],[18,7],[0,24],[-18,7]],'#d95f68');oval(-10,-8,12,11,'#d95f68');oval(10,-8,12,11,'#d95f68');
  shape([[-19,-15],[-5,-13],[0,-24],[5,-13],[19,-15],[9,-5],[0,-9],[-9,-5]],'#4e8b61');
  for(const [x,y] of [[-12,-1],[2,-1],[12,2],[-5,9],[2,16]])line([[x,y],[x,y+2]],'#ffe5a3',2);
 }else if(value===12){
  shape([[-17,-3],[17,-3],[0,26]],'#d5a565');line([[-9,3],[6,14]],'#ad7945');line([[8,3],[-5,14]],'#ad7945');
  oval(0,-12,18,16,'#efa6b8');oval(-13,-1,7,6,'#efa6b8');oval(12,-1,7,6,'#efa6b8');oval(-6,-16,5,3,'#ffd6df');
 }
 c.restore();
}
