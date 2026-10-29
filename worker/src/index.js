// NewsBoard 상세 서버 (Cloudflare Worker + D1). 무료 등급 안에서 동작.
// 로그인: Google·카카오 → 고유번호를 HMAC으로 바꾼 '불투명 ID'만 저장. 내 서재 데이터(JSON)는 기기 간 동기화.
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
async function who(env, req) {
  const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!t || t.length < 40) return null;
  const r = await env.DB.prepare('SELECT uid, exp FROM sessions WHERE th=?').bind(await sha(t)).first();
  return r && r.exp > now() ? r.uid : null;
}
async function login(env, provider, sub, keep = true) {
  const uid = 'u_' + (await hmac(env.ID_SALT, provider + ':' + sub)).slice(0, 32);
  await env.DB.prepare('INSERT INTO users(uid,created,last_seen) VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET last_seen=excluded.last_seen').bind(uid, now(), now()).run();
  const tok = rnd(32);
  await env.DB.prepare('INSERT INTO sessions(th,uid,exp) VALUES(?,?,?)').bind(await sha(tok), uid, now() + (keep ? SESSION_DAYS * DAY : SHORT_HOURS * 36e5)).run();
  return tok;
}
const back = (env, q) => Response.redirect(env.SITE + 'login/#' + new URLSearchParams(q).toString(), 302);
const safeRet = r => (r && /^[A-Za-z0-9\-_\/.%#=&?~가-한]{0,300}$/.test(r) && !r.startsWith('/') && !r.includes('//') && !r.includes('..')) ? r : '';
const SHORT_HOURS = 24;
async function oauthStart(env, url, p) {
  if (!providers(env)[p]) return back(env, { nbe: 'unavailable' });
  const keep = url.searchParams.get('keep') === '0' ? '0' : '1', ret = safeRet(url.searchParams.get('ret') || '');
  const st = rnd(16) + '.' + keep + '.' + encodeURIComponent(ret);
  try { await env.DB.prepare('INSERT INTO oauth_state(st,exp) VALUES(?,?)').bind(st, now() + 600_000).run(); } catch (e) { return back(env, { nbe: 'busy' }); }
  const cb = url.origin + '/auth/' + p + '/callback';
  let u;
  if (p === 'google') u = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: cb, response_type: 'code', scope: 'openid', state: st, prompt: 'select_account' });
  else if (p === 'kakao') u = 'https://kauth.kakao.com/oauth/authorize?' + new URLSearchParams({ client_id: env.KAKAO_REST_KEY, redirect_uri: cb, response_type: 'code', state: st });
  else if (p === 'naver') u = 'https://nid.naver.com/oauth2.0/authorize?' + new URLSearchParams({ client_id: env.NAVER_CLIENT_ID, redirect_uri: cb, response_type: 'code', state: st });
  else return back(env, { nbe: 'unavailable' });
  return Response.redirect(u, 302);
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
  const sp = st.split('.'), keep = sp[1] || '1', ret = sp.slice(2).join('.');
  try { return back(env, { nbt: await login(env, p, sub, keep !== '0'), nbp: p, keep, ret: safeRet(decodeURIComponent(ret)) }); }
  catch (e) { return back(env, { nbe: 'busy' }); }
}
// Restored full file with archive and fetch handlers
async function backup(env) {
  const out = {};
  for (const t of ['users', 'docs', 'push_subs']) out[t] = (await env.DB.prepare('SELECT * FROM ' + t).all()).results;
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
export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env, req) });
    try {
      if (p === '/' || p === '/health') return J(env, req, { ok: true, login: providers(env) });
      if (p.startsWith('/archive/') && env.AR) return archive(env, req, url, p);
      let m = p.match(/^\/auth\/(google|kakao|naver)\/(start|callback)$/);
      if (m) return await (m[2] === 'start' ? oauthStart(env, url, m[1]) : oauthCallback(env, url, m[1]));
      const uid = await who(env, req);
      if (!uid) return J(env, req, { error: 'auth' }, 401);
      if (p === '/me') return J(env, req, { uid });
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
        for (const t of ['docs', 'sessions', 'push_subs', 'users']) await env.DB.prepare('DELETE FROM ' + t + ' WHERE uid=?').bind(uid).run();
        return J(env, req, { ok: true });
      }
      return J(env, req, { error: 'not_found' }, 404);
    } catch (e) { return J(env, req, { error: 'server' }, 500); }
  },
  async scheduled(ev, env, ctx) { ctx.waitUntil(backup(env)); },
};
