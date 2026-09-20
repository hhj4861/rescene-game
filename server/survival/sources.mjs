/* global URL, structuredClone */
import { createHash, randomUUID } from 'node:crypto';
import { members, sources } from './catalog.mjs';

export const initialSources = () => structuredClone(sources);
export const reviewedSources = library => library.filter(s => ['reviewed-text', 'reviewed-user'].includes(s.verificationStatus));
export const sourceProfile = library => createHash('sha256').update(JSON.stringify(reviewedSources(library).map(s => [s.sourceId, s.contentHash]))).digest('hex');
export function addSource(library, input, clock = new Date()) {
  if (library.length >= 150) throw new Error('자료는 보관·철회 기록을 포함해 최대 150개입니다');
  if (!members.some(m => m.id === input.memberId) || input.speakerId !== input.memberId) throw new Error('해당 멤버의 발언임을 확인하고 같은 화자를 지정하세요');
  const text = (key, max) => {
    if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > max) throw new Error(`${key}: 1~${max}자로 입력하세요`);
    return input[key].trim();
  };
  const urlText = text('url', 1500); let url;
  try { url = new URL(urlText); } catch { throw new Error('올바른 HTTPS 자료 링크가 필요합니다'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('인증정보 없는 HTTPS 자료 링크만 사용할 수 있습니다');
  if (!['direct-interview', 'video', 'blog'].includes(input.evidenceType)) throw new Error('자료 종류를 선택하세요');
  const publishedAt = text('publishedAt', 10);
  const localToday = [clock.getFullYear(), String(clock.getMonth() + 1).padStart(2, '0'), String(clock.getDate()).padStart(2, '0')].join('-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt) || !Number.isFinite(Date.parse(publishedAt)) || new Date(publishedAt).toISOString().slice(0, 10) !== publishedAt || publishedAt > localToday) throw new Error('실제 발행일을 입력하세요');
  const summary = text('summary', 300), title = text('title', 120), usageBasis = text('usageBasis', 200);
  if ([...summary].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) || /(?:https?:\/\/|www\.)/i.test(summary)) throw new Error('요약에는 제어문자나 URL 대신 본인 발언의 짧은 설명만 적어주세요');
  const locator = text('locator', 160);
  if (input.evidenceType === 'video' && !/^\d{1,2}:[0-5]\d(?::[0-5]\d)?(?:\s|$)/.test(locator)) throw new Error('영상은 01:23 형식의 발언 시점을 적어주세요');
  if (library.some(s => s.memberId === input.memberId && s.url === url.href && s.summary === summary && s.verificationStatus !== 'withdrawn')) throw new Error('같은 멤버의 동일 자료 요약이 이미 있습니다');
  const now = clock.toISOString();
  return { sourceId: `user-${randomUUID()}`, memberId: input.memberId, speakerId: input.speakerId, url: url.href,
    title, summary, publishedAt, retrievedAt: now.slice(0, 10), locator, usageBasis, evidenceType: input.evidenceType,
    verificationStatus: 'pending', contentHash: createHash('sha256').update(summary).digest('hex'),
    audit: [{ action: 'submitted', actor: 'local-user', at: now }] };
}
export function changeSource(library, input, action) {
  const item = library.find(s => s.sourceId === input.sourceId);
  if (!item) throw new Error('자료를 찾을 수 없습니다');
  if (action === 'reviewSource') {
    if (!['pending', 'withdrawn'].includes(item.verificationStatus) || input.confirmed !== true) throw new Error('미검수·철회 자료의 원문·화자·요약을 직접 확인한 뒤 검수하세요');
    item.verificationStatus = 'reviewed-user';
  } else {
    if (item.verificationStatus === 'withdrawn') throw new Error('이미 철회한 자료입니다');
    if (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 200) throw new Error('철회 사유를 1~200자로 적어주세요');
    item.verificationStatus = 'withdrawn';
  }
  item.audit ||= [];
  item.audit.push({ action, actor: 'local-user', at: new Date().toISOString(), ...(action === 'withdrawSource' ? { reason: input.reason.trim() } : {}) });
}
// Legacy memories have no provenance: after withdrawal, omit them conservatively.
export function usableMemory(memory, library) {
  const active = new Set(reviewedSources(library).map(s => s.sourceId));
  if (!Array.isArray(memory.sourceRefs)) return !library.some(s => s.verificationStatus === 'withdrawn');
  return memory.sourceRefs.every(id => active.has(id));
}
