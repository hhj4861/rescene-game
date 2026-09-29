import { castOrder, characterFor, characterArt } from './characters25/cast.js';
// The approved paintings are immutable atlases. SVG viewports expose only art;
// all controls, state and dialogue are live DOM, never screenshot hotspots.
export const artFiles = ['01-arrival', '02-planning', '03-performance', '04-reflection', '05-finale'];
export const memberOrder = castOrder;
export function artwork(file, box, className = '') {
  return `<svg class="approved-art ${className}" viewBox="${box}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="/assets/survival/${file}.png" width="1672" height="941"/></svg>`;
}
export function portrait(id, large = false) {
  const member=characterFor(id);
  if(!member)return '';
  return `<span class="doll-portrait cast-portrait ${large?'portrait-large':'portrait-thumb'}" role="img" aria-label="${member.name} 캐릭터" data-portrait-member="${member.id}" data-visual="${member.visual}">${characterArt(id)}</span>`;
}
export function sceneFor(state) {
  if (!state) return 'arrival';
  if (state.phase === 'complete') return 'finale';
  if (['result','reflection','learned','spectated','spectator','watch-judging'].includes(state.phase)) return 'reflection';
  return 'planning';
}
export function resultSummary(state, round = state?.rounds[state.round]) {
  if (!round?.ranking.length) return { title:'첫 무대의 기록을 기다리며', detail:'공연과 회고를 마치면 경험이 쌓여요.', outcome:'waiting' };
  const position = round.ranking.findIndex(t => t.teamId === 'team-0');
  if (position < 0) return { title:'남은 팀들의 무대', detail:'우리의 경험은 지난 기록에서 볼 수 있어요.', outcome:'spectator' };
  const pair = round.pairs.find(p => p.includes('team-0'));
  const opponent = pair?.find(id => id !== 'team-0');
  const won = opponent && position < round.ranking.findIndex(t => t.teamId === opponent);
  const eliminated = round.eliminated.includes('team-0');
  const title = state.champion === 'team-0' ? '우리 여섯이 만든 우승' :
    state.round === 10 && eliminated ? '마지막 무대까지, 함께 만든 준우승' :
    eliminated ? '이번 시즌의 도전은 여기까지' :
    `이번 대결은 ${won ? '승리' : '패배'}, 다음 라운드 진출`;
  return { title, detail:`전체 ${position + 1}위 / ${round.ranking.length}팀 · ${(round.ranking[position].total / 5).toFixed(1)}점`,
    outcome:state.champion === 'team-0' ? 'champion' : eliminated ? 'eliminated' : won ? 'won' : 'survived' };
}

// Navigation illustrations are cropped without the baked-in text labels.
export function placeIcon(id) {
  const boxes={dorm:'53 104 47 43',schedule:'52 214 49 35',meeting:'53 320 46 45',stage:'53 427 47 45',journal:'54 537 46 38'};
  return artwork('01-arrival',boxes[id],'place-icon');
}

export function finaleBackdrop() {
  // Keep the approved title lettering as decoration, with its accessible heading
  // in the DOM. Cover only the example badge text; outcome remains live state.
  return `<svg class="approved-art desktop-art" viewBox="155 60 1517 662" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><filter id="title-feather"><feGaussianBlur stdDeviation="6"/></filter><mask id="finale-art-mask"><rect width="1672" height="941" fill="white"/><rect x="668" y="40" width="309" height="43" fill="black" filter="url(#title-feather)"/></mask></defs><image href="/assets/survival/05-finale.png" width="1672" height="941" mask="url(#finale-art-mask)"/><rect x="722" y="195" width="205" height="34" fill="#e0c58a"/></svg>${artwork('05-finale','390 245 720 475','mobile-art')}`;
}
