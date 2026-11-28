# patches/ — 워크플로 수정 패치 보관

에이전트(GitHub App)가 `.github/workflows/*` 를 직접 커밋할 수 없어(워크플로 권한 없음),
수정안을 패치 파일로 두고 영우님이 한 줄로 적용·푸시합니다. 적용 후 이 폴더는 지워도 됩니다.

| 패치 | 고치는 것 | 상태 |
|---|---|---|
| `news-site-bundle-fix-20261128.patch` | `collect.yml`·`pages.yml` 의 '사이트 묶기' 단계 — 사라진 `v3/` 참조로 인한 `cp: cannot stat 'v3'` 실패(2026-11-27 04:42Z~11-28 02:42Z 실행 41건 전부 실패)와, 루트 자산(`v2-home.css`·`v2-home.js`·`nav.js`·`timeline.css`·`section.css`·`gutters.css` 등) 및 하위 페이지(`live/`·`market/`·`insu/`·`lawtech/`·`reports/`) 누락 보강 | 적용 대기 |

## 적용

```bash
cd ~/Developer/news && git pull --ff-only && \
  curl -fsSL https://raw.githubusercontent.com/pyw31337/news/main/patches/news-site-bundle-fix-20261128.patch | git apply - && \
  git commit -am "fix(ci): 사이트 묶기에서 사라진 v3/ 참조 제거 · 루트 자산·하위 페이지 누락 보강" && git push
```

적용 뒤 `gh workflow run collect.yml -R pyw31337/news` 로 한 번 돌려 '사이트 묶기'가 통과하는지 보고,
`https://pyw31337.github.io/news/v2-home.css` 가 200 인지 확인합니다.
