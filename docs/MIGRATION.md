# 다른 컴퓨터로 옮기기 (맥미니 → 다른 맥 / 윈도 / 리눅스)

사이트 운영(매시간 수집·배포)은 **GitHub Actions**가 하므로 컴퓨터가 없어도 계속 돌아갑니다.
로컬 컴퓨터는 새벽 03:30 **추가 AI 분석**(overlay)만 맡습니다. 이 단계가 멈춰도 사이트는 그대로 보입니다.

## 구성
| 위치 | 역할 |
|---|---|
| `main` 브랜치 | 사이트·스크립트 전체(여기가 원본) |
| `data` 브랜치 | 누적 데이터(아카이브·자체 DB `db/`·overlay) |
| `media` 브랜치 | 자체 저장 썸네일 WebP (`img/`, `map.json`) |
| `local/` | 로컬 분석 스크립트: `run.sh`(맥·리눅스), `run.ps1`(윈도), `nbai.swift`(애플 AI), 설치 스크립트, launchd 템플릿 |

## 맥 / 리눅스
```bash
git clone https://github.com/pyw31337/news.git && cd news
bash local/install.sh          # venv·nbai 빌드(맥)·배포 키·매일 03:30 예약(맥 launchd / 리눅스 cron)
```
화면에 나온 공개키를 GitHub → 저장소 **Settings → Deploy keys → Add deploy key**에 붙여넣고 **Allow write access**를 체크합니다.

## 윈도
Git for Windows, Python 3.11+, (권장) [Ollama](https://ollama.com) 설치 → `ollama pull qwen2.5:3b`
```powershell
git clone https://github.com/pyw31337/news.git; cd news
powershell -ExecutionPolicy Bypass -File local\install-windows.ps1
```

## AI 백엔드 (`~/Developer/newsboard-local/local.env`, 윈도는 `%USERPROFILE%\newsboard-local\local.env`)
- `auto`(기본): 애플 온디바이스 → Ollama → API 키 순서로 자동 선택. 아무것도 없으면 AI 없이 수집만 합니다.
- Apple Intelligence가 없는 PC에서는 **Ollama + qwen2.5:3b**(무료, 4GB 정도 메모리)를 권장. 문맥창이 작은 모델이라 작업별로 나눠 호출합니다(`LLM_SMALL=1` 자동).
- 클라우드 키(Gemini 등)를 쓸 때는 `local.env`의 `LLM_API_KEY`에만 적으세요. 이 파일은 git에 올라가지 않습니다.

## 기존 맥미니 정리(옮긴 뒤)
`launchctl unload ~/Library/LaunchAgents/com.pyw31337.newsboard-ai.plist` 후 GitHub Deploy keys에서 예전 키를 삭제.
