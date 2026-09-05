import type { ItemDef } from './schema';

export const ITEMS: ItemDef[] = [
  { type: 'consumable', id: 'food_mulhoe', name: '물회', description: '원이의 최애. 체력 40 회복.', price: 30, heal: { hp: 40 } },
  { type: 'consumable', id: 'food_yeopddeok', name: '엽떡', description: '리브의 최애. 체력 50 회복.', price: 35, heal: { hp: 50 } },
  { type: 'consumable', id: 'food_seolleongtang', name: '설렁탕', description: '미나미의 최애. 체력 30, 기력 20 회복.', price: 40, heal: { hp: 30, mp: 20 } },
  { type: 'consumable', id: 'food_tteokguk', name: '떡국', description: '메이의 최애. 기력 30 회복.', price: 30, heal: { mp: 30 } },
  { type: 'consumable', id: 'food_malatang', name: '마라탕', description: '제나의 최애. 체력 60 회복.', price: 45, heal: { hp: 60 } },
  { type: 'etc', id: 'etc_snack_ingredient', name: '야식 재료', description: '편의점 심부름용.', price: 1 },
  { type: 'equip', id: 'equip_inear_basic', name: '연습용 인이어', description: '멘탈 +2.', price: 120, slot: 'inear', stats: { def: 2 } },
  { type: 'photocard', id: 'photocard_woni_rescene', name: '원이 Re:Scene 포카', description: '데뷔 앨범 컨셉 포카.', price: 0, member: 'woni' },
  { type: 'photocard', id: 'photocard_liv_rescene', name: '리브 Re:Scene 포카', description: '데뷔 앨범 컨셉 포카.', price: 0, member: 'liv' },
  { type: 'photocard', id: 'photocard_minami_rescene', name: '미나미 Re:Scene 포카', description: '데뷔 앨범 컨셉 포카.', price: 0, member: 'minami' },
  { type: 'photocard', id: 'photocard_may_rescene', name: '메이 Re:Scene 포카', description: '데뷔 앨범 컨셉 포카.', price: 0, member: 'may' },
  { type: 'photocard', id: 'photocard_zena_rescene', name: '제나 Re:Scene 포카', description: '데뷔 앨범 컨셉 포카.', price: 0, member: 'zena' },
];
