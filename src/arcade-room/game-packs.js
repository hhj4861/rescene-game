import {GAMES,CLASSIC_MAY,SURVIVAL_MAY,LINK_ZENA} from './catalog.js';
import {GAME_IDS,RECORD_KEY,readRecords} from './model.js';
import {emptyProgress,readProgress,PROGRESS_KEY} from './progress.js';

export const PACKS_KEY='rescene.arcade.packs.v1';
// Stable IDs own saves; a member's engine kind continues to own controls and rendering.
export const GAME_PACKS=[
 {id:'minami-pump',kind:'rhythm',game:GAMES.rhythm,genre:'리듬',options:{}},
 {id:'woni-walk',kind:'drive',game:GAMES.drive,genre:'산책 모험',options:{}},
 {id:'may-survival',kind:'blocks',game:SURVIVAL_MAY,genre:'자동 공격 생존전',options:{survival:true}},
 {id:'may-bubbles',kind:'blocks',game:CLASSIC_MAY,genre:'방울 액션',options:{survival:false}},
 {id:'zena-bakery',kind:'photo',game:GAMES.photo,genre:'빵 퍼즐',options:{}},
 {id:'zena-link',kind:'photo',game:LINK_ZENA,genre:'사천성 짝 연결',options:{link:true}},
 {id:'liv-shooter',kind:'catch',game:GAMES.catch,genre:'진격 슈팅',options:{}},
];
export const packsFor=kind=>GAME_PACKS.filter(pack=>pack.kind===kind);
export const activePack=(library,kind)=>packsFor(kind).find(pack=>pack.id===library.selected[kind])||packsFor(kind)[0];
export const packProgress=library=>({version:2,games:Object.fromEntries(GAME_IDS.map(kind=>[kind,library.packs[activePack(library,kind).id].journey]))});
export const packRecords=library=>Object.fromEntries(GAME_IDS.map(kind=>[kind,library.packs[activePack(library,kind).id].record]));
export const packCatalog=library=>Object.fromEntries(GAME_IDS.map(kind=>[kind,activePack(library,kind).game]));
const score=value=>Number.isSafeInteger(value)&&value>=0?value:0;
function validJourney(pack,journey){
 const entry=readProgress({getItem:()=>JSON.stringify({version:2,games:{[pack.kind]:journey}})}).games[pack.kind];
 // Never resume another engine variant under this pack's title and controls.
 if(pack.kind==='blocks'&&entry.snapshot&&(entry.snapshot.mayVersion===3)!==pack.options.survival)entry.snapshot=null;
 if(pack.kind==='photo'&&entry.snapshot&&!!entry.snapshot.linkVersion!==!!pack.options.link)entry.snapshot=null;
 return entry;
}
export function readGamePacks(storage,{classicMay=false}={}){
 const legacy=readProgress(storage),records=readRecords(storage);
 const library={version:1,selected:{},packs:{}};
 for(const pack of GAME_PACKS)library.packs[pack.id]={journey:emptyProgress().games[pack.kind],record:0};
 for(const kind of GAME_IDS){
  const pack=packsFor(kind)[0];library.selected[kind]=pack.id;
  library.packs[pack.id]={journey:legacy.games[kind],record:records[kind]};
 }
 // Old May saves shared one slot. A snapshot identifies its variant; without one,
 // the old classic link is the only available hint. Never duplicate earned progress.
 const may=legacy.games.blocks.snapshot;
 if(may?may.mayVersion!==3:classicMay){
  library.packs['may-bubbles']=library.packs['may-survival'];
  library.packs['may-survival']={journey:emptyProgress().games.blocks,record:0};
  library.selected.blocks='may-bubbles';
 }
 let saved;try{saved=JSON.parse(storage?.getItem(PACKS_KEY));}catch{/* Keep legacy saves usable. */}
 if(saved?.version===1){
  for(const pack of GAME_PACKS){
   const entry=saved.packs?.[pack.id];
   if(entry&&typeof entry==='object')library.packs[pack.id]={journey:validJourney(pack,entry.journey),record:score(entry.record)};
  }
  for(const kind of GAME_IDS)if(packsFor(kind).some(pack=>pack.id===saved.selected?.[kind]))library.selected[kind]=saved.selected[kind];
 }
 if(classicMay)library.selected.blocks='may-bubbles';
 return library;
}
export function selectPack(library,kind,id){
 if(!packsFor(kind).some(pack=>pack.id===id))return false;
 library.selected[kind]=id;return true;
}
export function saveGamePacks(storage,library){
 try{storage.setItem(PACKS_KEY,JSON.stringify(library));}catch{return false;}
 // Keep a readable active-game view for older clients. Pack saves are authoritative.
 try{storage.setItem(PROGRESS_KEY,JSON.stringify(packProgress(library)));storage.setItem(RECORD_KEY,JSON.stringify(packRecords(library)));}catch{/* The canonical pack save already succeeded. */}
 return true;
}
export function savePackRecord(storage,library,kind,value){
 const pack=activePack(library,kind);
 if(!pack||!Number.isSafeInteger(value)||value<0)return {records:packRecords(library),saved:false};
 const entry=library.packs[pack.id];entry.record=Math.max(entry.record,value);
 return {records:packRecords(library),saved:saveGamePacks(storage,library)};
}
export function packPicker(library,kind){
 const packs=packsFor(kind),selected=activePack(library,kind);
 if(packs.length===1)return `<p class="single-pack">기본 게임팩 <span>${selected.genre}</span></p>`;
 return `<fieldset class="pack-picker"><legend>게임팩 고르기 <small>${packs.length}개</small></legend><div class="pack-options">${packs.map(pack=>`<button type="button" data-pack="${pack.id}" data-pack-kind="${kind}" aria-pressed="${pack.id===selected.id}"><span class="pack-label">${pack.game.title}</span><small>${pack.id===selected.id?'✓ 선택한 팩':pack.genre}</small></button>`).join('')}</div><p>팩을 바꿔도 기록은 그대로 보관해요.</p></fieldset>`;
}
