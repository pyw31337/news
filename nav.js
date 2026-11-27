// v2 canonical navigation: keep legacy pages out of the v2 shell.
document.querySelectorAll('.main-nav').forEach(nav => {
  const here = location.pathname;
  const root = '/news/v2/';
  const isToday = here.endsWith('/v2/') || here.endsWith('/v2/index.html') || here === '/news/' || here === '/news/index.html';
  nav.innerHTML = `<a href="${root}" class="${isToday ? 'is-on' : ''}">오늘</a><a href="${root}live/" class="${here.includes('/live/') ? 'is-on' : ''}">흐름</a><a href="${root}persons/" class="${here.includes('/persons/') ? 'is-on' : ''}">인물</a><a href="${root}market/" class="${here.includes('/market/') ? 'is-on' : ''}">마켓</a><a href="${root}archive/" class="${here.includes('/archive/') ? 'is-on' : ''}">아카이브</a>`;
});

// Ensure head-tools exist with SVG icons on all v2 subpages
document.querySelectorAll('.head-in').forEach(headIn => {
  if (!headIn.querySelector('.head-tools')) {
    const tools = document.createElement('div');
    tools.className = 'head-tools';
    tools.innerHTML = `
      <a class="tool" href="/news/v2/#search" title="검색" aria-label="검색">
        <svg class="icon"><use href="#i-search"></use></svg>
      </a>
      <a class="tool" href="/news/login/" title="로그인" aria-label="로그인">
        <svg class="icon"><use href="#i-user"></use></svg>
      </a>
    `;
    headIn.appendChild(tools);
  }
});

