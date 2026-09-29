// User-approved visual order: 01 원이, 02 메이, 03 제나, 04 미나미, 05 리브.
// Game arrays keep their original order; always resolve art by stable member ID.
export const cast = [
  { id:'woni', name:'원이', visual:'01', body:[40,0,354,887], face:[23,729,294,248] },
  { id:'may', name:'메이', visual:'02', body:[413,0,318,887], face:[323,729,292,248] },
  { id:'zena', name:'제나', visual:'03', body:[740,0,316,887], face:[623,729,291,248] },
  { id:'minami', name:'미나미', visual:'04', body:[1059,0,307,887], face:[924,729,291,248] },
  { id:'liv', name:'리브', visual:'05', body:[1384,0,344,887], face:[1224,729,291,248] },
];
export const castOrder = cast.map(member=>member.id);
export const castAssets = { body:'/assets/characters25/cast.png', face:'/assets/characters25/reference.png' };
export const characterFor = id => cast.find(member=>member.id===id);
let nextClip=0;
export function characterArt(id,kind='face') {
  const member=characterFor(id);
  if(!member || !['face','body'].includes(kind))return '';
  const rect=member[kind],body=kind==='body',clip=`cast-clip-${++nextClip}`;
  const viewport=body?[rect[0]-(354-rect[2])/2,rect[1],354,rect[3]]:rect;
  return `<svg class="cast-art" data-character-art="${member.id}" data-visual="${member.visual}" viewBox="${viewport.join(' ')}" preserveAspectRatio="${body?'xMidYMax meet':'xMidYMid slice'}" aria-hidden="true" focusable="false"><defs><clipPath id="${clip}"><rect x="${rect[0]}" y="${rect[1]}" width="${rect[2]}" height="${rect[3]}"/></clipPath></defs><image href="${castAssets[kind]}" width="${body?1774:1536}" height="${body?887:1024}" clip-path="url(#${clip})"/></svg>`;
}
// Translate the audio frame by member ID, never by sprite column or array index.
export function stagePose(frame,id,reduced=false) {
  const actor=frame?.dancers?.find(dancer=>dancer.id===id);
  const lead=frame?.memberId===id;
  const idle=10+castOrder.indexOf(id)*20;
  return { lead, x:actor?Math.max(9,Math.min(91,actor.x)):idle,
    lift:actor&&!reduced?Math.max(-6,Math.min(6,(actor.y-(lead?70:60))*1.5)):0,
    tilt:actor&&!reduced?Math.max(-2,Math.min(2,actor.rotate*.3)):0 };
}
