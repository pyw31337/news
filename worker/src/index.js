// NewsBoard 상세 서버 (Cloudflare Worker + D1). 무료 등급 안에서 동작.
// 로그인: Google·카카오·네이버 → 고유번호를 HMAC으로 바꾼 '불투명 ID'만 저장. 내 서재 데이터(JSON)는 기기 간 동기화.
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const rnd = (n = 32) => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
async function hmac(key, s) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(s)));
}
const now = () => Date.now();
const DAY = 864e5, SESSION_DAYS = 180, MAX_DOC = 900_000;
function cors(env, req) {
  const o = req.headers.get('Origin') || '', ok = (env.ORIGINS || '').split(',').includes(o);
  return { 'Access-Control-Allow-Origin': ok ? o : 'https://pyw31337.github.io', 'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
const J = (env, req, o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(env, req) } });
const providers = env => ({ google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), kakao: !!env.KAKAO_REST_KEY, naver: !!(env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET) });
// 처음 쓸 때 필요한 표를 만듦(schema.sql과 같음, 이미 있으면 아무 일 없음). 격리 실행 단위당 한 번
let schemaOK = false;
async function ensureSchema(env) {
  if (schemaOK) return;
  await env.DB.batch([
    'CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, created INTEGER NOT NULL, last_seen INTEGER)',
    'CREATE TABLE IF NOT EXISTS identities (provider TEXT NOT NULL, provider_subject TEXT NOT NULL, uid TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY (provider, provider_subject))',
    'CREATE INDEX IF NOT EXISTS identities_uid ON identities(uid)',
    'CREATE TABLE IF NOT EXISTS sessions (th TEXT PRIMARY KEY, uid TEXT NOT NULL, exp INTEGER NOT NULL)',
    'CREATE INDEX IF NOT EXISTS sessions_uid ON sessions(uid)',
    'CREATE TABLE IF NOT EXISTS docs (uid TEXT PRIMARY KEY, data TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 1, updated INTEGER NOT NULL)',
    'CREATE TABLE IF NOT EXISTS push_subs (id TEXT PRIMARY KEY, uid TEXT, sub TEXT NOT NULL, topics TEXT, created INTEGER NOT NULL)',
    'CREATE TABLE IF NOT EXISTS oauth_state (st TEXT PRIMARY KEY, exp INTEGER NOT NULL)',
    'CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT NOT NULL)'].map(q => env.DB.prepare(q)));
  schemaOK = true;
}
// 사용자 ID용 비밀 소금: 비밀값 ID_SALT가 있으면 그것, 없으면 처음 한 번 무작위로 만들어 D1 config 표에 보관(이후 고정)
let saltC = null;
async function salt(env) {
  if (env.ID_SALT) return env.ID_SALT;
  if (saltC) return saltC;
  await ensureSchema(env);
  let r = await env.DB.prepare("SELECT v FROM config WHERE k='id_salt'").first();
  if (!r) { await env.DB.prepare("INSERT OR IGNORE INTO config(k,v) VALUES('id_salt',?)").bind(rnd(32)).run(); r = await env.DB.prepare("SELECT v FROM config WHERE k='id_salt'").first(); }
  return saltC = r.v;
}
// 수집기 인증: 공유 비밀번호(ARCHIVE_KEY) 대신 GitHub Actions가 발급한 OIDC 토큰을 검증(서명·발급처·대상·저장소·만료)
let jwksC = null;
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
async function ghActions(token) {
  try {
    const [h, p, sg] = token.split('.'); if (!sg) return false;
    const hd = JSON.parse(new TextDecoder().decode(b64u(h))), pl = JSON.parse(new TextDecoder().decode(b64u(p)));
    if (pl.iss !== 'https://token.actions.githubusercontent.com' || pl.aud !== 'newsboard-sync' || pl.repository !== 'pyw31337/news' || !(pl.exp * 1000 > now())) return false;
    if (!jwksC || jwksC.at < now() - 36e5) jwksC = { at: now(), keys: (await (await fetch('https://token.actions.githubusercontent.com/.well-known/jwks')).json()).keys };
    const jwk = jwksC.keys.find(k => k.kid === hd.kid); if (!jwk || hd.alg !== 'RS256') return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(sg), enc.encode(h + '.' + p));
  } catch (e) { return false; }
}
async function who(env, req) {
  const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!t || t.length < 40) return null;
  const r = await env.DB.prepare('SELECT uid, exp FROM sessions WHERE th=?').bind(await sha(t)).first();
  return r && r.exp > now() ? r.uid : null;
}
const obj = x => x && typeof x === 'object' && !Array.isArray(x);
function newest(a, b) { return ((a && (a.u || a.at)) || 0) >= ((b && (b.u || b.at)) || 0) ? a : b; }
function mergeProgress(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
  if (Array.isArray(a) && Array.isArray(b)) { const out = [...a]; for (const x of b) if (!out.some(y => JSON.stringify(y) === JSON.stringify(x))) out.push(x); return out; }
  if (obj(a) && obj(b)) { const out = { ...a }; for (const [k, v] of Object.entries(b)) out[k] = k in out ? mergeProgress(out[k], v) : v; return out; }
  return b == null ? a : b;
}
function mergeLibrary(current, previous) {
  if (!previous) return current || {}; if (!current) return previous;
  const out = { ...previous, ...current }; out.saves = {};
  for (const k of new Set([...Object.keys(previous.saves || {}), ...Object.keys(current.saves || {})])) { const v = newest((current.saves || {})[k], (previous.saves || {})[k]); if (v) out.saves[k] = v; }
  out.follows = { ...(previous.follows || {}), ...(current.follows || {}) };
  out.keywords = [...new Set([...(previous.keywords || []), ...(current.keywords || [])])];
  out.cols = [...(current.cols || [])]; for (const c of previous.cols || []) if (!out.cols.some(x => x && x.id === c.id)) out.cols.push(c);
  out.reads = {}; for (const d of new Set([...Object.keys(previous.reads || {}), ...Object.keys(current.reads || {})])) out.reads[d] = { ...(previous.reads || {})[d], ...(current.reads || {})[d] };
  if (previous.game || current.game) out.game = mergeProgress(previous.game || {}, current.game || {});
  const newerDoc = (current.updated || 0) >= (previous.updated || 0) ? current : previous;
  for (const k of ['home', 'watch', 'alerts']) if (newerDoc[k] != null) out[k] = newerDoc[k];
  out.updated = Math.max(current.updated || 0, previous.updated || 0, now()); return out;
}
async function ensureUser(env, uid) {
  await env.DB.prepare('INSERT INTO users(uid,created,last_seen) VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET last_seen=excluded.last_seen').bind(uid, now(), now()).run();
}
async function mergeUsers(env, into, from) {
  if (!from || from === into) return;
  const [target, source] = await Promise.all([env.DB.prepare('SELECT data,rev FROM docs WHERE uid=?').bind(into).first(), env.DB.prepare('SELECT data,rev FROM docs WHERE uid=?').bind(from).first()]);
  if (source) {
    let a = null, b = null; try { a = target && JSON.parse(target.data); b = JSON.parse(source.data); } catch (e) { throw new Error('bad_linked_data'); }
    const merged = mergeLibrary(a, b), rev = Math.max((target && target.rev) || 0, source.rev || 0) + 1;
    await env.DB.prepare('INSERT INTO docs(uid,data,rev,updated) VALUES(?,?,?,?) ON CONFLICT(uid) DO UPDATE SET data=excluded.data,rev=excluded.rev,updated=excluded.updated').bind(into, JSON.stringify(merged), rev, now()).run();
  }
  await env.DB.batch([
    env.DB.prepare('UPDATE identities SET uid=? WHERE uid=?').bind(into, from), env.DB.prepare('UPDATE sessions SET uid=? WHERE uid=?').bind(into, from), env.DB.prepare('UPDATE push_subs SET uid=? WHERE uid=?').bind(into, from),
    env.DB.prepare('DELETE FROM docs WHERE uid=?').bind(from), env.DB.prepare('DELETE FROM users WHERE uid=?').bind(from),
  ]);
}
async function login(env, provider, sub, keep = true, linkUid = '') {
  await ensureSchema(env); const sl = await salt(env);
  const legacyUid = 'u_' + (await hmac(sl, provider + ':' + sub)).slice(0, 32);
  const subject = (await hmac(sl, 'identity:' + provider + ':' + sub)).slice(0, 48);
  let row = await env.DB.prepare('SELECT uid FROM identities WHERE provider=? AND provider_subject=?').bind(provider, subject).first();
  let uid = row && row.uid;
  if (linkUid) {
    const owner = await env.DB.prepare('SELECT uid FROM users WHERE uid=?').bind(linkUid).first(); if (!owner) throw new Error('link_owner_missing');
    const prior = uid || ((await env.DB.prepare('SELECT uid FROM users WHERE uid=?').bind(legacyUid).first()) ? legacyUid : '');
    if (prior && prior !== linkUid) await mergeUsers(env, linkUid, prior);
    await ensureUser(env, linkUid);
    await env.DB.prepare('INSERT INTO identities(provider,provider_subject,uid,created) VALUES(?,?,?,?) ON CONFLICT(provider,provider_subject) DO UPDATE SET uid=excluded.uid').bind(provider, subject, linkUid, now()).run(); uid = linkUid;
  } else if (!uid) {
    uid = legacyUid; await ensureUser(env, uid);
    await env.DB.prepare('INSERT INTO identities(provider,provider_subject,uid,created) VALUES(?,?,?,?) ON CONFLICT(provider,provider_subject) DO NOTHING').bind(provider, subject, uid, now()).run();
    row = await env.DB.prepare('SELECT uid FROM identities WHERE provider=? AND provider_subject=?').bind(provider, subject).first(); uid = row && row.uid || uid;
  } else await ensureUser(env, uid);
  const tok = rnd(32);
  await env.DB.prepare('INSERT INTO sessions(th,uid,exp) VALUES(?,?,?)').bind(await sha(tok), uid, now() + (keep ? SESSION_DAYS * DAY : SHORT_HOURS * 36e5)).run();
  return tok;
}
const back = (env, q) => Response.redirect(env.SITE + 'login/#' + new URLSearchParams(q).toString(), 302);
const safeRet = r => (r && /^[A-Za-z0-9\-_\/.%#=&?~가-힣]{0,300}$/.test(r) && !r.startsWith('/') && !r.includes('//') && !r.includes('..')) ? r : '';
const SHORT_HOURS = 24;
async function oauthStart(env, url, p, opt = {}) {
  if (!providers(env)[p]) return back(env, { nbe: 'unavailable' });
  const keep = opt.keep || (url.searchParams.get('keep') === '0' ? '0' : '1'), ret = safeRet(opt.ret == null ? (url.searchParams.get('ret') || '') : opt.ret);
  const mode = opt.linkUid ? 'link~' + opt.linkUid : 'login';
  const st = rnd(16) + '.' + keep + '.' + encodeURIComponent(ret) + '.' + mode;
  try { await env.DB.prepare('INSERT INTO oauth_state(st,exp) VALUES(?,?)').bind(st, now() + 600_000).run(); } catch (e) { return back(env, { nbe: 'busy' }); }
  const cb = url.origin + '/auth/' + p + '/callback';
  let u;
  if (p === 'google') u = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: cb, response_type: 'code', scope: 'openid', state: st, prompt: 'select_account' });
  else if (p === 'kakao') u = 'https://kauth.kakao.com/oauth/authorize?' + new URLSearchParams({ client_id: env.KAKAO_REST_KEY, redirect_uri: cb, response_type: 'code', state: st });
  else if (p === 'naver') u = 'https://nid.naver.com/oauth2.0/authorize?' + new URLSearchParams({ client_id: env.NAVER_CLIENT_ID, redirect_uri: cb, response_type: 'code', state: st });
  else return back(env, { nbe: 'unavailable' });
  return Response.redirect(u, 302);
}
function readState(st) {
  const part = String(st || '').split('.'); const keep = part[1] || '1'; let tail = part.pop() || '', linkUid = '';
  if (tail.startsWith('link~')) linkUid = tail.slice(5); else if (tail !== 'login') part.push(tail);
  return { keep, ret: safeRet(decodeURIComponent(part.slice(2).join('.'))), linkUid };
}
async function oauthLinkStart(env, req, url) {
  const uid = await who(env, req); if (!uid) return J(env, req, { error: 'auth' }, 401);
  let body = {}; try { body = await req.json(); } catch (e) {}
  const provider = body.provider, ret = safeRet(body.ret || 'my');
  if (!['google', 'kakao', 'naver'].includes(provider) || !providers(env)[provider]) return J(env, req, { error: 'unavailable' }, 400);
  const r = await oauthStart(env, url, provider, { keep: '1', ret, linkUid: uid });
  return J(env, req, { url: r.headers.get('Location') });
}
async function oauthCallback(env, url, p) {
  const code = url.searchParams.get('code'), st = url.searchParams.get('state');
  let row = null;
  try { row = st && await env.DB.prepare('DELETE FROM oauth_state WHERE st=? RETURNING exp').bind(st).first(); }
  catch (e) { try { row = st && await env.DB.prepare('SELECT exp FROM oauth_state WHERE st=?').bind(st).first(); } catch (e2) { return back(env, { nbe: 'busy' }); } }
  if (!code || !row || row.exp < now()) return back(env, { nbe: 'retry' });
  const cb = url.origin + '/auth/' + p + '/callback';
  let sub = null;
  try {
    if (p === 'google') {
      const r = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: cb, grant_type: 'authorization_code' }) })).json();
      if (r.id_token) sub = JSON.parse(atob(r.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
    } else if (p === 'kakao') {
      const body = { code, client_id: env.KAKAO_REST_KEY, redirect_uri: cb, grant_type: 'authorization_code' };
      if (env.KAKAO_CLIENT_SECRET) body.client_secret = env.KAKAO_CLIENT_SECRET;
      const r = await (await fetch('https://kauth.kakao.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body: new URLSearchParams(body) })).json();
      if (r.access_token) { const me = await (await fetch('https://kapi.kakao.com/v2/user/me', { headers: { Authorization: 'Bearer ' + r.access_token } })).json(); sub = me.id && String(me.id); }
    } else if (p === 'naver') {
      const body = { code, client_id: env.NAVER_CLIENT_ID, client_secret: env.NAVER_CLIENT_SECRET, redirect_uri: cb, grant_type: 'authorization_code', state: st };
      const r = await (await fetch('https://nid.naver.com/oauth2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) })).json();
      if (r.access_token) { const me = await (await fetch('https://openapi.naver.com/v1/nid/me', { headers: { Authorization: 'Bearer ' + r.access_token } })).json(); sub = me.response && me.response.id; }
    }
  } catch (e) { sub = null; }
  if (!sub) return back(env, { nbe: 'retry' });
  const state = readState(st);
  try { return back(env, { nbt: await login(env, p, sub, state.keep !== '0', state.linkUid), nbp: p, nbl: state.linkUid ? p : '', keep: state.keep, ret: state.ret }); }
  catch (e) { return back(env, { nbe: 'busy' }); }
}
async function backup(env) {
  const out = {};
  for (const t of ['users', 'identities', 'docs', 'push_subs']) out[t] = (await env.DB.prepare('SELECT * FROM ' + t).all()).results;
  const d = new Date(now() + 9 * 36e5).toISOString().slice(0, 10);
  const body = new Blob([JSON.stringify({ at: new Date().toISOString(), ...out })]).stream().pipeThrough(new CompressionStream('gzip')); const buf = await new Response(body).arrayBuffer();
  await env.BK.put('d1/' + d + '.json.gz', buf, { httpMetadata: { contentType: 'application/gzip' } });
  const old = await env.BK.list({ prefix: 'd1/' });
  const cut = new Date(now() - 30 * DAY + 9 * 36e5).toISOString().slice(0, 10);
  for (const o of old.objects) if (o.key.slice(3, 13) < cut) await env.BK.delete(o.key);
  await env.DB.prepare('DELETE FROM sessions WHERE exp<?').bind(now()).run();
  await env.DB.prepare('DELETE FROM oauth_state WHERE exp<?').bind(now()).run();
  if (env.AR) await backupArchive(env, d);
  return d;
}
// 인물 아카이브도 30일 보관: 표마다 3000줄씩 나눠 저장(무료 한도 안에서)
async function backupArchive(env, d) {
  for (const t of ['persons', 'events', 'edges', 'nodes', 'runs']) {
    for (let o = 0, i = 0; ; o += 3000, i++) {
      const r = (await env.AR.prepare('SELECT * FROM ' + t + ' LIMIT 3000 OFFSET ' + o).all()).results;
      if (!r.length) break;
      const body = new Blob([JSON.stringify(r)]).stream().pipeThrough(new CompressionStream('gzip')); const buf = await new Response(body).arrayBuffer();
      await env.BK.put('archive/' + d + '/' + t + '-' + i + '.json.gz', buf, { httpMetadata: { contentType: 'application/gzip' } });
      if (r.length < 3000) break;
    }
  }
  const cut = new Date(now() - 30 * DAY + 9 * 36e5).toISOString().slice(0, 10);
  let cur;
  do {
    const l = await env.BK.list({ prefix: 'archive/', cursor: cur });
    const del = l.objects.filter(o => o.key.slice(8, 18) < cut).map(o => o.key);
    if (del.length) await env.BK.delete(del);
    cur = l.truncated ? l.cursor : null;
  } while (cur);
}

// ── 데이터 브랜치 통째 백업(GitHub Actions만, R2): latest/는 매주 덮어쓰고, 매달 1번은 YYYY-MM/에 따로 남김 ──
async function branchBackup(env, req, url) {
  if (!await ghActions((req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''))) return J(env, req, { error: 'auth' }, 401);
  const k = url.searchParams.get('k') || '';
  if (!/^(latest|20\d\d-\d\d)\/[a-z0-9._-]{1,80}$/.test(k) || !req.body) return J(env, req, { error: 'bad' }, 400);
  const n = +(req.headers.get('Content-Length') || 0); if (!n) return J(env, req, { error: 'length' }, 411);
  await env.BK.put('branches/' + k, req.body, { httpMetadata: { contentType: 'application/octet-stream' } });
  return J(env, req, { ok: true, k, bytes: n });
}
// ── 인물 아카이브(공개 읽기, 수집기만 쓰기) ──
const AJ = (env, req, o, s = 200, age = 600) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=' + age, ...cors(env, req) } });
async function archive(env, req, url, p) {
  const A = env.AR;
  if (p === '/archive/ingest' && req.method === 'POST') {
    const bt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!((env.ARCHIVE_KEY && bt === env.ARCHIVE_KEY) || await ghActions(bt))) return J(env, req, { error: 'auth' }, 401);
    // 무료 한도(계정 전체 하루 100k 줄 쓰기) 보호: 아카이브는 하루 ARCHIVE_DAILY_ROWS(기본 4만)까지만, 하루 기준은 Cloudflare 초기화와 같은 UTC 0시(=한국 오전 9시), 나머지는 사용자 동기화 몫.
    // 바뀐 줄만 씀(ON CONFLICT … WHERE 달라졌을 때만), 한 요청 = 한 트랜잭션(실패 시 전부 롤백, 반쯤 지워진 상태 없음).
    const CAP = +(env.ARCHIVE_DAILY_ROWS || 40000), day = new Date(now()).toISOString().slice(0, 10);
    let used = 0;
    try { used = (await A.prepare('SELECT rows FROM budget WHERE day=?').bind(day).first())?.rows || 0; }
    catch (e) { await A.prepare('CREATE TABLE IF NOT EXISTS budget(day TEXT PRIMARY KEY, rows INTEGER NOT NULL)').run(); }
    if (used >= CAP) return J(env, req, { ok: false, defer: true, used, cap: CAP }, 429);
    const b = await req.json(), st = [], X = (...c) => c.map(k => k + ' IS NOT excluded.' + k).join(' OR ');
    for (const x of b.persons || []) st.push(A.prepare('INSERT INTO persons(id,name,kind,party,birth,qid,score,ev,ed,data,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,kind=excluded.kind,party=excluded.party,birth=excluded.birth,qid=excluded.qid,score=excluded.score,ev=excluded.ev,ed=excluded.ed,data=excluded.data,updated=excluded.updated WHERE ' + X('name', 'kind', 'party', 'birth', 'qid', 'score', 'ev', 'ed', 'data'))
      .bind(x.id, x.name, x.kind || null, x.party || null, x.birth || null, x.qid || null, x.score || 0, x.ev || 0, x.ed || 0, JSON.stringify(x.data || {}), now()));
    // 재방문 시각만 갱신(색인 없는 열 1개 = 1줄)
    const ids = (b.persons || []).map(x => x.id);
    if (ids.length) st.push(A.prepare('UPDATE persons SET updated=? WHERE id IN (SELECT value FROM json_each(?))').bind(now(), JSON.stringify(ids)));
    // 사건: 사라진 것만 지우고, 새로 생기거나 바뀐 것만 씀
    for (const id of b.replace || []) st.push(A.prepare('DELETE FROM events WHERE pid=? AND h NOT IN (SELECT value FROM json_each(?))').bind(id, JSON.stringify((b.events || []).filter(e => e.pid === id).map(e => e.h))));
    for (const e of b.events || []) st.push(A.prepare('INSERT INTO events(h,pid,d,typ,stage,title,status,conf,src,url,extra) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(h) DO UPDATE SET pid=excluded.pid,d=excluded.d,typ=excluded.typ,stage=excluded.stage,title=excluded.title,status=excluded.status,conf=excluded.conf,src=excluded.src,url=excluded.url,extra=excluded.extra WHERE ' + X('pid', 'd', 'typ', 'stage', 'title', 'status', 'conf', 'src', 'url', 'extra'))
      .bind(e.h, e.pid, e.d || null, e.typ, e.stage, e.title, e.status || 'fact', e.conf ?? 1, e.src || null, e.url || null, e.extra ? JSON.stringify(e.extra) : null));
    for (const e of b.edges || []) st.push(A.prepare('INSERT INTO edges(a,b,typ,label,conf,src,url) VALUES(?,?,?,?,?,?,?) ON CONFLICT(a,b,typ) DO UPDATE SET label=excluded.label,conf=excluded.conf,src=excluded.src,url=excluded.url WHERE ' + X('label', 'conf', 'src', 'url'))
      .bind(e.a, e.b, e.typ, e.label || null, e.conf ?? 1, e.src || null, e.url || null));
    for (const n of b.nodes || []) st.push(A.prepare('INSERT INTO nodes(id,name,note,qid) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,note=excluded.note,qid=excluded.qid WHERE ' + X('name', 'note', 'qid'))
      .bind(n.id, n.name, n.note || null, n.qid || null));
    if (b.run) st.push(A.prepare('INSERT OR REPLACE INTO runs(at,persons,events,edges,note) VALUES(?,?,?,?,?)').bind(now(), b.run.persons || 0, b.run.events || 0, b.run.edges || 0, b.run.note || null));
    if (!st.length) return J(env, req, { ok: true, written: 0, used, cap: CAP });
    const res = await A.batch(st);   // 하나의 트랜잭션
    const written = res.reduce((s, r) => s + (r.meta?.rows_written || 0), 0);
    await A.prepare('INSERT INTO budget(day,rows) VALUES(?,?) ON CONFLICT(day) DO UPDATE SET rows=rows+excluded.rows').bind(day, written + 1).run();
    return J(env, req, { ok: true, n: st.length, written, used: used + written + 1, cap: CAP });
  }
  if (p === '/archive/budget') { try { return AJ(env, req, (await A.prepare('SELECT day,rows FROM budget ORDER BY day DESC LIMIT 14').all()).results, 200, 0); } catch (e) { return AJ(env, req, [], 200, 0); } }
  if (p === '/archive/stats') {
    const c = async q => (await A.prepare(q).first()).n;
    const runs = (await A.prepare('SELECT at,persons,events,edges FROM runs ORDER BY at DESC LIMIT 30').all()).results;
    return AJ(env, req, { persons: await c('SELECT count(*) n FROM persons'), events: await c('SELECT count(*) n FROM events'), edges: await c('SELECT count(*) n FROM edges'), runs });
  }
  if (p === '/archive/done') return AJ(env, req, (await A.prepare('SELECT id,updated FROM persons').all()).results, 200, 0);
  if (p === '/archive/people') {
    const q = (url.searchParams.get('q') || '').trim(), lim = Math.min(+url.searchParams.get('n') || 60, 200);
    const r = q ? await A.prepare("SELECT id,name,kind,party,birth,score,ev,ed,json_extract(data,'$.photo') photo,json_extract(data,'$.summary') summary FROM persons WHERE name LIKE ? ORDER BY score DESC LIMIT ?").bind('%' + q + '%', lim).all()
      : await A.prepare("SELECT id,name,kind,party,birth,score,ev,ed,json_extract(data,'$.photo') photo,json_extract(data,'$.summary') summary FROM persons ORDER BY score DESC LIMIT ?").bind(lim).all();
    return AJ(env, req, r.results);
  }
  let m = p.match(/^\/archive\/person\/([\w-]+)$/);
  if (m) {
    const x = await A.prepare('SELECT * FROM persons WHERE id=?').bind(m[1]).first();
    if (!x) return AJ(env, req, { error: 'not_found' }, 404, 60);
    const ev = (await A.prepare('SELECT d,typ,stage,title,status,conf,src,url,extra FROM events WHERE pid=? ORDER BY d').bind(m[1]).all()).results;
    return AJ(env, req, { ...x, data: JSON.parse(x.data), events: ev });
  }
  m = p.match(/^\/archive\/graph\/([\w-]+)$/);
  if (m) {   // 2단계 이웃까지
    const id = m[1], seen = new Set([id]), E = [];
    let front = [id];
    for (let hop = 0; hop < 2 && front.length; hop++) {
      const ph = front.map(() => '?').join(',');
      const r = (await A.prepare(`SELECT * FROM edges WHERE a IN (${ph}) OR b IN (${ph}) ORDER BY CASE typ WHEN 'parent' THEN 0 WHEN 'spouse' THEN 0 WHEN 'sibling' THEN 0 WHEN 'relative' THEN 1 WHEN 'predecessor' THEN 2 WHEN 'hometown' THEN 3 ELSE 4 END, conf DESC LIMIT ${hop ? 60 : 40}`).bind(...front, ...front).all()).results;
      const nx = [];
      for (const e of r) { if (!E.some(f => f.a === e.a && f.b === e.b && f.typ === e.typ)) E.push(e); for (const k of [e.a, e.b]) if (!seen.has(k)) { seen.add(k); nx.push(k); } }
      front = hop === 0 ? nx.filter(k => !k.startsWith('wd:')).slice(0, 12) : [];
    }
    const ids = [...seen].slice(0, 90), ph = ids.map(() => '?').join(',');
    const P = (await A.prepare(`SELECT id,name,kind,party,json_extract(data,'$.photo') photo FROM persons WHERE id IN (${ph})`).bind(...ids).all()).results;
    const N = (await A.prepare(`SELECT id,name,note FROM nodes WHERE id IN (${ph})`).bind(...ids).all()).results;
    const keep = new Set(ids);
    return AJ(env, req, { center: id, nodes: [...P.map(x => ({ ...x, archived: 1 })), ...N.filter(n => !P.some(x => x.id === n.id))], edges: E.filter(e => keep.has(e.a) && keep.has(e.b)) });
  }
  if (p === '/archive/onthisday') {
    const md = url.searchParams.get('md') || new Date(now() + 9 * 36e5).toISOString().slice(5, 10);
    const r = (await A.prepare("SELECT e.pid,p.name,e.d,e.typ,e.title,e.status,e.src,e.url FROM events e JOIN persons p ON p.id=e.pid WHERE substr(e.d,6,5)=? AND length(e.d)=10 AND e.typ!='news' ORDER BY p.score DESC LIMIT 40").bind(md).all()).results;
    return AJ(env, req, r);
  }
  return J(env, req, { error: 'not_found' }, 404);
}
// ── 게임 리더보드: 보드(게임·사다리)별 사용자당 1줄, 최고 점수가 오를 때만 씀(D1 쓰기 최소) ──
const LB_MAX = { '2048': 5e6, merge: 5e6, sling: 3e6 };
let lbReady = false;
async function lbInit(env) {
  if (lbReady) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS lb (board TEXT NOT NULL, uid TEXT NOT NULL, name TEXT NOT NULL, score INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY(board, uid))').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS lb_rank ON lb(board, score DESC)').run();
  lbReady = true;
}
const lbBoard = b => /^(2048|merge|sling)(-[a-z]{2,12})?$/.test(b || '') ? b : null;
const lbName = n => { n = String(n || '').trim().replace(/\s+/g, ' '); return /^[0-9A-Za-z가-힣 _.\-]{2,12}$/.test(n) ? n : null; };
async function leaderboard(env, req, url) {
  // 표 만들기가 실패해도(예: D1 하루 쓰기 한도 초과) 읽기는 빈 순위로 응답하고, 다음 요청에서 다시 시도
  let initErr = null; try { await lbInit(env); } catch (e) { initErr = e; }
  const uid = await who(env, req);
  if (req.method === 'GET') {
    if (initErr) { try { await env.DB.prepare('SELECT 1 FROM lb LIMIT 1').first(); } catch (e) { return J(env, req, { rows: [], me: null, wait: true }); } }
    const b = lbBoard(url.searchParams.get('b')); if (!b) return J(env, req, { error: 'bad' }, 400);
    const n = Math.min(50, Math.max(5, +url.searchParams.get('n') || 20));
    const rows = (await env.DB.prepare('SELECT uid, name, score, at FROM lb WHERE board=? ORDER BY score DESC, at ASC LIMIT ?').bind(b, n).all()).results;
    let me = null;
    if (uid) { const r = await env.DB.prepare('SELECT score, at FROM lb WHERE board=? AND uid=?').bind(b, uid).first();
      if (r) me = { score: r.score, rank: 1 + (await env.DB.prepare('SELECT COUNT(*) c FROM lb WHERE board=? AND score>?').bind(b, r.score).first()).c }; }
    return J(env, req, { rows: rows.map(r => ({ name: r.name, score: r.score, at: r.at, me: r.uid === uid })), me });
  }
  if (req.method === 'POST') {
    if (!uid) return J(env, req, { error: 'auth' }, 401);
    if (initErr) return J(env, req, { error: 'busy' }, 503);
    const { b, score, name } = await req.json().catch(() => ({}));
    const bd = lbBoard(b), sc = Math.floor(+score), nm = lbName(name) || ('독자 ' + uid.slice(-4).toUpperCase());
    if (!bd || !(sc > 0) || sc > LB_MAX[bd.split('-')[0]]) return J(env, req, { error: 'bad' }, 400);
    const cur = await env.DB.prepare('SELECT score, name, at FROM lb WHERE board=? AND uid=?').bind(bd, uid).first();
    if (cur && cur.score >= sc && cur.name === nm) return J(env, req, { ok: true, kept: true });
    if (cur && now() - cur.at < 15000) return J(env, req, { error: 'slow' }, 429);
    try { await env.DB.prepare('INSERT INTO lb(board,uid,name,score,at) VALUES(?,?,?,?,?) ON CONFLICT(board,uid) DO UPDATE SET score=MAX(lb.score,excluded.score), name=excluded.name, at=excluded.at')
      .bind(bd, uid, nm, sc, now()).run(); } catch (e) { return J(env, req, { error: 'busy' }, 503); }
    return J(env, req, { ok: true });
  }
  return J(env, req, { error: 'not_found' }, 404);
}
export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env, req) });
    try {
      if (p === '/' || p === '/health') return J(env, req, { ok: true, login: providers(env), keys: { id_salt: env.ID_SALT ? 'secret' : 'auto', archive: env.ARCHIVE_KEY ? 'key+github' : 'github' } });   // 값은 절대 내보내지 않음
      if (p === '/backup/put' && req.method === 'PUT') return branchBackup(env, req, url);
      if (p.startsWith('/archive/') && env.AR) return archive(env, req, url, p);
      if (p === '/lb') return await leaderboard(env, req, url);
      if (p === '/auth/link' && req.method === 'POST') return await oauthLinkStart(env, req, url);
      let m = p.match(/^\/auth\/(google|kakao|naver)\/(start|callback)$/);
      if (m) return await (m[2] === 'start' ? oauthStart(env, url, m[1]) : oauthCallback(env, url, m[1]));
      const uid = await who(env, req);
      if (!uid) return J(env, req, { error: 'auth' }, 401);
      if (p === '/me') {
        const r = await env.DB.prepare('SELECT provider FROM identities WHERE uid=? ORDER BY provider').bind(uid).all();
        return J(env, req, { uid, providers: r.results.map(x => x.provider) });
      }
      if (p === '/sync' && req.method === 'GET') {
        const d = await env.DB.prepare('SELECT data, rev, updated FROM docs WHERE uid=?').bind(uid).first();
        return J(env, req, d ? { data: JSON.parse(d.data), rev: d.rev, updated: d.updated } : { data: null, rev: 0 });
      }
      if (p === '/sync' && req.method === 'PUT') {
        const txt = await req.text(); if (txt.length > MAX_DOC) return J(env, req, { error: 'too_big' }, 413);
        const { data, rev } = JSON.parse(txt);
        if (!data || typeof data !== 'object') return J(env, req, { error: 'bad' }, 400);
        delete data.token;
        const cur = await env.DB.prepare('SELECT rev, data, updated FROM docs WHERE uid=?').bind(uid).first();
        if (cur && cur.rev !== rev) return J(env, req, { error: 'conflict', data: JSON.parse(cur.data), rev: cur.rev, updated: cur.updated }, 409);
        const nr = (cur ? cur.rev : 0) + 1;
        try { await env.DB.prepare('INSERT INTO docs(uid,data,rev,updated) VALUES(?,?,?,?) ON CONFLICT(uid) DO UPDATE SET data=excluded.data, rev=excluded.rev, updated=excluded.updated')
          .bind(uid, JSON.stringify(data), nr, now()).run(); } catch (e) { return J(env, req, { error: 'busy' }, 503); }
        return J(env, req, { ok: true, rev: nr });
      }
      if (p === '/logout' && req.method === 'POST') {
        const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
        await env.DB.prepare('DELETE FROM sessions WHERE th=?').bind(await sha(t)).run(); return J(env, req, { ok: true });
      }
      if (p === '/account' && req.method === 'DELETE') {
        for (const t of ['docs', 'sessions', 'push_subs', 'identities', 'users']) await env.DB.prepare('DELETE FROM ' + t + ' WHERE uid=?').bind(uid).run();
        try { await env.DB.prepare('DELETE FROM lb WHERE uid=?').bind(uid).run(); } catch (e) {}
        return J(env, req, { ok: true });
      }
      return J(env, req, { error: 'not_found' }, 404);
    } catch (e) { return J(env, req, { error: 'server' }, 500); }
  },
  async scheduled(ev, env, ctx) { ctx.waitUntil(backup(env)); },
};
