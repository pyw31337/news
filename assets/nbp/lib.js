/* NewsBoard 인물·엔티티 디자인 시스템(v2) 공통 모듈: 실제 데이터 → 컴포넌트(HTML 문자열). 문서: docs/design-system.md 「인물 페이지 v2」
   컴포넌트 클래스: .sh(섹션 헤더) .facts(사실 목록) .stat(수치) .tl(연대기) .era(생애 단계) .bars/.stack/.spark(차트)
   .pchip(인물 칩) .arow(기사 행) .acard(썸네일 기사) .quote(발언) .exp(펼치기) .seg(세그먼트 필터) */
const NB = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ic = (n, on) => `<svg class="ic" aria-hidden="true"><use href="#i-${n}${on ? '-f' : ''}"/></svg>`;
  const num = n => Number(n).toLocaleString('ko-KR');
  const won = k => { /* 천원 → 'n억 n,nnn만 원' */
    const man = Math.round(k / 10), eok = Math.floor(man / 10000), rest = man % 10000;
    return ((eok ? eok + '억' : '') + (rest ? ' ' + num(rest) + '만' : '')).trim() + ' 원';
  };
  const eok1 = k => (k / 100000).toFixed(1).replace(/\.0$/, '') + '억';
  const dot = s => String(s || '').replace(/~/g, '–').replace(/-/g, '.');
  const md = t => { const d = String(t || '').slice(0, 10).split('-'); return d.length < 3 ? '' : `${+d[1]}.${+d[2]}`; };
  const ymd = t => String(t).slice(0, 10).replace(/-/g, '.');
  const DOW = '일월화수목금토';
  const dayLabel = t => { const d = new Date(String(t || '').slice(0, 10) + 'T00:00:00+09:00'); if (isNaN(d)) return '날짜 미상'; return `${d.getMonth() + 1}월 ${d.getDate()}일 ${DOW[d.getDay()]}요일`; };
  const titleClean = s => String(s).replace(/\s+-\s+[^-]{2,30}$/, '').trim();

  /* 생애 이벤트 분류 */
  const EVG = { birth: '성장', edu: '학업', career: '경력', military: '병역', ruling: '법조', business: '시민사회', election: '선거', office: '공직' };
  const EVI = { birth: 'user', edu: 'school', career: 'briefcase', military: 'shield', ruling: 'gavel', business: 'building-community', election: 'checkbox', office: 'building-bank' };
  const FILTERS = [
    ['전체', () => true],
    ['성장·학업', e => ['birth', 'edu', 'military'].includes(e.typ) || e.stage === '출생·성장' || e.stage === '학업'],
    ['경력·활동', e => ['career', 'ruling', 'business', 'work', 'team', 'mem', 'emp'].includes(e.typ) && !['출생·성장', '정치 활동'].includes(e.stage)],
    ['선거·공직', e => ['election', 'office', 'pos', 'party'].includes(e.typ) || e.stage === '정치 활동'],
  ];
  const ERAS = [];
  const yearOf = e => { const m = String(e.d).match(/\d{4}/); return m ? +m[0] : 1964; };

  /* ── 컴포넌트 ── */
  const sh = (title, opt = {}) => `<header class="sh"><h2 class="sh-t">${opt.icon ? ic(opt.icon) : ''}${esc(title)}</h2>${opt.count != null ? `<span class="sh-n">${esc(opt.count)}</span>` : ''}${opt.aside ? `<div class="sh-a">${opt.aside}</div>` : ''}</header>`;
  const facts = rows => `<dl class="facts">${rows.map(([k, v, icon]) => `<div class="facts-r"><dt>${icon ? ic(icon) : ''}${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  const stat = (label, value, unit = '', sub = '', extra = '') => `<div class="stat"><div class="stat-l">${esc(label)}</div><div class="stat-v">${esc(value)}<small>${esc(unit)}</small></div>${sub ? `<div class="stat-s">${sub}</div>` : ''}${extra}</div>`;
  const exp = (label, count, body, open = false, id = '') => `<div class="exp${open ? ' is-open' : ''}"${id ? ` id="${id}"` : ''}><button class="exp-b" type="button" aria-expanded="${open}"><span>${esc(label)}</span>${count != null ? `<span class="exp-n">${esc(count)}</span>` : ''}${ic('chevron-down')}</button><div class="exp-c"${open ? '' : ' hidden'}>${body}</div></div>`;
  const seg = (name, items, cur = 0) => `<div class="seg" role="tablist" data-seg="${name}">${items.map((t, i) => `<button type="button" role="tab" class="seg-i${i === cur ? ' is-on' : ''}" aria-selected="${i === cur}" data-i="${i}">${esc(t[0] ?? t)}${t[1] != null ? `<span class="seg-n">${t[1]}</span>` : ''}</button>`).join('')}</div>`;
  const pchip = (p, sub = '', href = p.href) => { const tag = href ? 'a' : 'span'; return `<${tag} class="pchip"${href ? ` href="${esc(href)}"` : ''}>${p.photo ? `<img src="${esc(p.photo)}" alt="" loading="lazy" width="32" height="32">` : `<span class="pchip-av">${ic('user')}</span>`}<span class="pchip-t"><b>${esc(p.name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></${tag}>`; };
  const arow = a => `<a class="arow" href="${esc(a.url)}" target="_blank" rel="noopener"><time>${esc(md(a.t))}</time><span class="arow-t">${esc(titleClean(a.title))}</span><span class="arow-p">${esc(a.press)}</span></a>`;
  const BASE = (document.querySelector('meta[name=nb-base]') || {}).content || '../';
  const href = { p: id => `${BASE}person/?id=${encodeURIComponent(id)}`, g: k => `${BASE}e/?k=${encodeURIComponent(k)}` };
  /* 압축 JSON(.json.gz) 읽기: 화면이 직접 풂 */
  const gz = async url => { const r = await fetch(url); if (!r.ok) throw new Error(r.status); if (!('DecompressionStream' in window)) throw new Error('no gzip'); return JSON.parse(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text()); };
  const shard = async (s, n) => { const b = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s))); return parseInt([...b.slice(0, 3)].map(x => x.toString(16).padStart(2, '0')).join(''), 16) % n; };
  const RAW = 'https://raw.githubusercontent.com/pyw31337/news/';
  const acard = a => `<a class="acard" href="${esc(a.url)}" target="_blank" rel="noopener"><span class="acard-img"><img src="${esc(a.img)}" alt="" loading="lazy" decoding="async"></span><span class="acard-t">${esc(titleClean(a.title))}</span><span class="acard-m">${esc(a.press)}<i></i>${esc(ymd(a.t))}</span></a>`;
  const quote = q => `<figure class="quote"><blockquote>${esc(q.quote)}</blockquote><figcaption>${q.press ? `${esc(q.press)}<i></i>` : ''}${esc(ymd(q.d))}</figcaption></figure>`;
  const tlItem = e => `<li class="tl-i" data-typ="${e.typ}"><span class="tl-d">${esc(dot(e.d))}</span><span class="tl-dot">${ic(EVI[e.typ] || 'calendar')}</span><div class="tl-b"><b class="tl-t">${esc(e.title)}</b><p class="tl-x">${esc(e.desc)}</p>${e.src ? (e.url ? `<a class="tl-s" href="${esc(e.url)}" target="_blank" rel="noopener">${ic('link')}${esc(e.src)}</a>` : `<span class="tl-s">${ic('file-text')}${esc(e.src)}</span>`) : ''}</div></li>`;
  const tl = evs => `<ol class="tl">${evs.map(tlItem).join('')}</ol>`;
  /* 생애 단계: eras=[{y,name,role,href,now,n}] — 데이터에서 만든 구간만 */
  const era = (eras, mode = 'auto') => `<ol class="era era--${mode}" style="--era-cols:${Math.min(7, eras.length)}">${eras.map(r => `<li class="era-i${r.now ? ' is-now' : ''}"><span class="era-y">${esc(r.y)}</span>${r.href ? `<a class="era-n" href="${esc(r.href)}">${esc(r.name)}</a>` : `<b class="era-n">${esc(r.name)}</b>`}${r.role ? `<span class="era-r">${esc(r.role)}</span>` : ''}${r.n ? `<span class="era-c" aria-hidden="true">${'<i></i>'.repeat(Math.min(12, r.n))}</span>` : ''}</li>`).join('')}</ol>`;

  /* 날짜별 기사 묶음 */
  const agroup = (list, cnt = {}) => { const g = {}; list.forEach(a => (g[(a.t || '').slice(0, 10)] ||= []).push(a)); return Object.keys(g).sort().reverse().map(d => `<div class="aday"><div class="aday-h">${dayLabel(d)}<small>${cnt[d] ?? g[d].length}건</small></div><div class="alist">${g[d].map(arow).join('')}</div></div>`).join(''); };
  /* 막대(HTML): items=[[label,value,cls?]] — 라벨은 HTML이라 폭이 바뀌어도 글자 크기 유지 */
  const hbars = (items, opt = {}) => { const max = Math.max(...items.map(x => x[1])); return `<ul class="hbars">${items.map(([l, v, c]) => `<li class="hbars-i ${c || ''}"><span class="hbars-l">${esc(l)}</span><span class="hbars-tr"><span class="hbars-f" style="width:${(v / max * 100).toFixed(1)}%"></span></span><span class="hbars-v">${opt.fmt ? opt.fmt(v) : num(v)}</span></li>`).join('')}</ul>`; };
  /* 세로 막대(연도별): 라벨 간격은 CSS가 폭에 따라 솎아 냄 */
  const vbars = (items, opt = {}) => { const max = Math.max(...items.map(x => x[1])); return `<div class="vbars ${opt.cls || ''}" style="--n:${items.length}">${items.map(([l, v, hi]) => `<div class="vbars-i${hi ? ' is-hi' : ''}" title="${esc(l)} · ${v}건"><span class="vbars-f" style="height:${Math.max(2, v / max * 100).toFixed(1)}%"></span>${l ? `<span class="vbars-l">${esc(l)}</span>` : ''}</div>`).join('')}</div>`; };
  /* 누적 막대: parts=[[label,value,cls]] */
  const stack = (parts, opt = {}) => { const tot = parts.reduce((s, p) => s + p[1], 0); return `<div class="stack"><div class="stack-bar">${parts.filter(p => p[1] > 0).map(([l, v, c]) => `<span class="stack-s ${c}" style="flex:${v}"></span>`).join('')}</div>${opt.legend === false ? '' : `<ul class="stack-lg">${parts.map(([l, v, c]) => `<li class="${c}"><i></i>${esc(l)}<b>${opt.fmt ? opt.fmt(v) : num(v)}</b>${opt.pct ? `<small>${Math.round(v / tot * 100)}%</small>` : ''}</li>`).join('')}</ul>`}</div>`; };
  /* 스파크라인(SVG 선만, 글자 없음) */
  const spark = (vals, opt = {}) => { const w = 300, h = 64, max = Math.max(...vals, 1), st = w / (vals.length - 1 || 1); const pts = vals.map((v, i) => `${(i * st).toFixed(1)},${(h - 4 - v / max * (h - 8)).toFixed(1)}`); return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path class="spark-a" d="M0,${h} L${pts.join(' L')} L${w},${h} Z"/><path class="spark-l" d="M${pts.join(' L')}" vector-effect="non-scaling-stroke"/></svg>`; };
  /* 도넛(SVG 원호만) */
  const donut = (parts, center = '') => { const tot = parts.reduce((s, p) => s + p[1], 0) || 1; let a = 0; const r = 15.915; return `<div class="donut"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="donut-bg" cx="18" cy="18" r="${r}"/>${parts.map(([l, v, c]) => { const s = `<circle class="donut-s ${c}" cx="18" cy="18" r="${r}" stroke-dasharray="${(v / tot * 100).toFixed(2)} ${(100 - v / tot * 100).toFixed(2)}" stroke-dashoffset="${(25 - a).toFixed(2)}"/>`; a += v / tot * 100; return s; }).join('')}</svg><div class="donut-c">${center}</div></div>`; };

  const assetParts = r => [['건물', r.cats['건물'] || 0, 'k1'], ['예금', r.cats['예금'] || 0, 'k2'], ['채권', r.cats['채권'] || 0, 'k3'], ['정치자금 예금', r.cats['정치자금법에따른정치자금의수입및지출을위한예금계좌의예금'] || 0, 'k4'], ['자동차 등', r.cats['부동산에관한규정이준용되는권리와자동차·건설기계·선박및항공기'] || 0, 'k5'], ['회원권', r.cats['회원권'] || 0, 'k5']];
  const voteParts = s => [['찬성', s['찬성'] || 0, 'pos'], ['반대', s['반대'] || 0, 'neg'], ['기권', s['기권'] || 0, 'warn'], ['불참', s['불참'] || 0, 'mute']];

  /* 누적 세로 막대(연도×분류) */
  const vstack = (rows, keys, opt = {}) => { const tot = r => keys.reduce((s, k) => s + (r[1][k[0]] || 0), 0); const max = Math.max(...rows.map(tot)); return `<div class="vbars vstack ${opt.cls || ''}" style="--n:${rows.length}">${rows.map(r => { const [l, c] = r, t = tot(r), lb = opt.lab ? opt.lab(l) : l; return `<div class="vbars-i" title="${esc(opt.tip ? opt.tip(l) : l)} · ${t}건"><span class="vstack-col" style="height:${t ? Math.max(2, t / max * 100).toFixed(1) : 0}%">${keys.map(k => c[k[0]] ? `<span class="${k[1]}" style="flex:${c[k[0]]}"></span>` : '').join('')}</span>${lb ? `<span class="vbars-l${opt.lc ? ' ' + opt.lc(l) : ''}">${esc(lb)}</span>` : ''}</div>`; }).join('')}</div>`; };
  /* 재임 기간 막대(간트) */
  const span = d => { const m = String(d).match(/(\d{4})(?:[.\d]*)?(?:\s*[~–-]\s*(\d{4}))?/); if (!m) return null; return [+m[1], m[2] ? +m[2] : +m[1]]; };
  const gantt = (rows, y0, y1, ticks) => `<div class="gantt"><span class="gantt-ax-pad"></span><span class="gantt-ax-pad gantt-ax-pad2"></span><div class="gantt-ax">${ticks.map(t => `<span style="left:${((t - y0) / (y1 - y0) * 100).toFixed(2)}%">${t}</span>`).join('')}</div>${rows.map(r => { const [a, b] = span(r.d) || [y0, y0]; const l = (a - y0) / (y1 - y0) * 100, w = (b - a) / (y1 - y0) * 100; return `<div class="gantt-r${r.now ? ' is-now' : ''}" data-typ="${r.typ}" data-g="${r.g || ''}"><span class="gantt-d">${esc(dot(r.d))}</span>${r.href ? `<a class="gantt-l" href="${esc(r.href)}">${esc(r.title)}</a>` : `<span class="gantt-l">${esc(r.title)}</span>`}<span class="gantt-tr"><span class="gantt-b${b === a ? ' is-pt' : ''}" style="left:${l.toFixed(2)}%;width:${w.toFixed(2)}%"></span></span></div>`; }).join('')}</div>`;
  /* 축 눈금: 양 끝 + 10년 단위, 너비의 7% 안쪽으로 붙는 눈금은 뺌 */
  const ticks = (y0, y1) => { const g = Math.max(4, (y1 - y0) * .07), t = [y0]; for (let y = Math.ceil(y0 / 10) * 10; y < y1; y += 10) if (y - y0 >= g && y1 - y >= g) t.push(y); t.push(y1); return t; };
  /* 관계 나무: 가운데 인물 → 분류 → 노드 */
  const rtree = (center, cats) => `<div class="rtree"><div class="rt-c">${center}</div><ul class="rt-br">${cats.map(([c, rs]) => `<li><span class="rt-cat">${esc(c)}<small>${rs.length}</small></span><div class="rt-n">${rs.map(r => r.kind === 'person' ? pchip(r.people[0], r.role) : `<span class="rt-g"><b>${esc(r.name)}</b><small>${esc(r.role)}</small></span>`).join('')}</div></li>`).join('')}</ul></div>`;
  /* 섹션 목차 + 스크롤 위치 표시 */
  const toc = (secs, cls = '') => `<nav class="toc ${cls}" aria-label="목차">${secs.map((x, i) => `<a class="toc-i${i ? '' : ' is-on'}" href="#${x.id}"><svg class="ic" aria-hidden="true">${document.getElementById('i-' + x.icon + '-f') ? `<use class="u0" href="#i-${x.icon}"/><use class="u1" href="#i-${x.icon}-f"/>` : `<use href="#i-${x.icon}"/>`}</svg>${esc(x.title)}${x.count ? `<small>${esc(x.count)}</small>` : ''}</a>`).join('')}</nav>`;
  const spy = ids => {
    const links = [...document.querySelectorAll('.toc-i')];
    const set = id => links.forEach(a => { const on = a.getAttribute('href') === '#' + id; a.classList.toggle('is-on', on); if (on) { const bar = a.closest('.toc--bar'); if (bar && bar.offsetParent) bar.scrollTo({ left: Math.max(0, a.offsetLeft - bar.clientWidth / 2 + a.offsetWidth / 2), behavior: 'instant' }); } });
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) set(en.target.id); }), { rootMargin: '-25% 0px -65% 0px' });
    ids.forEach(id => io.observe(document.getElementById(id)));
    /* 첫 섹션보다 위(히어로)에 있을 땐 첫 항목을 켬 */
    const top = () => { if (document.getElementById(ids[0]).getBoundingClientRect().top > innerHeight * .25) set(ids[0]); };
    addEventListener('scroll', top, { passive: true });
    return set;
  };
  /* 상호작용: 펼치기, 세그먼트 필터(연대기) */
  const bind = (root = document) => {
    root.addEventListener('click', ev => {
      const b = ev.target.closest('.exp-b');
      if (b) { const x = b.parentElement, o = !x.classList.contains('is-open'); x.classList.toggle('is-open', o); b.setAttribute('aria-expanded', o); x.querySelector('.exp-c').hidden = !o; return; }
      const s = ev.target.closest('.seg-i');
      if (s) { const g = s.parentElement; g.querySelectorAll('.seg-i').forEach(x => { const on = x === s; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on); }); g.dispatchEvent(new CustomEvent('seg', { bubbles: true, detail: { name: g.dataset.seg, i: +s.dataset.i } })); }
    });
  };
  /* 부호 있는 금액(천원) */
  const swon = k => (k < 0 ? '−' : '+') + won(Math.abs(k));
  /* 작은 사실 줄(라벨 위, 값 아래) */
  const mini = rows => `<dl class="mini">${rows.map(([k, v, icon]) => `<div class="mini-r"><dt>${icon ? ic(icon) : ''}${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  /* 작은 표: head=[...], rows=[[...]] — 숫자 열은 오른쪽 정렬 */
  const table = (head, rows, numCols = []) => `<div class="tbl-w"><table class="tbl"><thead><tr>${head.map((h, i) => `<th${numCols.includes(i) ? ' class="n"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${numCols.includes(i) ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  /* 묶음 목록에 이어 붙이기: 같은 묶음이면 기존 목록 끝에 붙임 */
  const grouper = (host, key, head, row) => { let k = null, list = null; return items => { for (const it of items) { const kk = key(it); if (kk !== k) { k = kk; host.insertAdjacentHTML('beforeend', `<div class="aday"><div class="aday-h">${head(kk)}</div><div class="alist"></div></div>`); list = host.lastElementChild.lastElementChild; } list.insertAdjacentHTML('beforeend', row(it)); } }; };
  /* 점진 불러오기: step개씩 render(from,to), 남은 건수 버튼 */
  const more = (host, n, step, render) => { let i = 0; const b = document.createElement('button'); b.type = 'button'; b.className = 'more-b';
    const upd = () => { const left = n - i; b.hidden = left <= 0; b.innerHTML = `<span>더 보기</span><span class="exp-n">${num(left)}건</span>${ic('chevron-down')}`; };
    const go = () => { const to = Math.min(n, i + step); render(i, to); i = to; upd(); };
    host.after(b); b.addEventListener('click', go); go(); return b; };
  /* 장기 기록 분류 → 색(의미 있는 것만 의미색) */
  const HCAT = { '보도': 'k3', '발언': 'k1', '논란': 'warn', '법적': 'neg', '활동': 'mute', '수상': 'pos' };
  const host = p => String(p || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  const hrow = x => `<div class="arow hrow"><time>${esc(md(x.d))}</time><span class="arow-t">${esc(x.title)}</span><span class="arow-p">${x.press ? `<span>${esc(host(x.press))}</span>` : ''}<span class="tag ${['논란', '법적', '수상'].includes(x.cat) ? HCAT[x.cat] : ''}">${esc(x.cat)}</span></span></div>`;
  const ym = t => { const d = String(t).slice(0, 7).split('-'); return `${d[0]}년 ${+d[1]}월`; };
  const load = u => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const openAll = () => { if (/[?&]open=1/.test(location.search)) document.querySelectorAll('.exp').forEach(x => { x.classList.add('is-open'); x.querySelector('.exp-b').setAttribute('aria-expanded', true); x.querySelector('.exp-c').hidden = false; }); };
  return { ticks, href, gz, shard, RAW, BASE, swon, mini, table, grouper, more, HCAT, hrow, ym, toc, spy, vstack, span, gantt, rtree, agroup, esc, ic, num, won, eok1, dot, md, ymd, dayLabel, titleClean, EVG, EVI, FILTERS, ERAS, yearOf, sh, facts, stat, exp, seg, pchip, arow, acard, quote, tl, tlItem, era, hbars, vbars, stack, spark, donut, assetParts, voteParts, bind, load, openAll };
})();
