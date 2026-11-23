// v2 canonical navigation: keep legacy pages out of the v2 shell.
document.querySelectorAll('.main-nav').forEach(nav=>{
  const here=location.pathname;
  const root='/news/v2/';
  nav.innerHTML=`<a href="${root}">오늘</a><a href="${root}live/">흐름</a><a href="${root}persons/">인물</a><a href="${root}market/">마켓</a><a href="${root}archive/">아카이브</a>`;
});
