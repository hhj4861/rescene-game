import { getEnemy, getItem, getMap, getMeme, getNpc } from '../data/index';
import type { Objective } from '../data/schema';

export function describeObjective(o: Objective, progress: number): string {
  switch (o.kind) {
    case 'kill': return `${getEnemy(o.target).name} ${progress}/${o.count}`;
    case 'collect': return `${getItem(o.target).name} ${progress}/${o.count}`;
    case 'talk': return `${getNpc(o.target).name}와 대화 ${progress}/1`;
    case 'reach': return `${getMap(o.target).name} 도착 ${progress}/1`;
    case 'minigame': return `${o.target} ${progress}/${o.score}점`;
    case 'emote': return `${getMap(o.map).name}에서 "${getMeme(o.target).text}" ${progress}/1`;
  }
}
