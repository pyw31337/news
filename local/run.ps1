# NewsBoard 로컬 분석(Windows): 수집 + AI(Ollama/API) → data 브랜치 overlay/ 업로드
$B = if ($env:NB_HOME) { $env:NB_HOME } else { "$HOME\newsboard-local" }; Set-Location $B
New-Item -ItemType Directory -Force logs | Out-Null; $log = "$B\logs\run-$(Get-Date -f yyyyMMdd).log"
Start-Transcript -Append $log | Out-Null
if (Test-Path "$B\local.env") { Get-Content "$B\local.env" | ? { $_ -match '^\s*([A-Z_]+)=(.*)$' } | % { Set-Item "env:$($Matches[1])" $Matches[2] } }
$R = if ($env:NB_REMOTE) { $env:NB_REMOTE } else { 'git@github-newsboard:pyw31337/news.git' }
if (!(Test-Path news)) { git clone -q $R news }
Set-Location news; git fetch -q origin; git reset -q --hard origin/main
if (!(Test-Path data\.git)) { Remove-Item -Recurse -Force data -EA 0; git clone -q -b data $R data }
git -C data fetch -q origin; git -C data reset -q --hard origin/data
$bk = if ($env:LLM_BACKEND) { $env:LLM_BACKEND } else { 'auto' }
if ($bk -eq 'auto') { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://127.0.0.1:11434/api/tags | Out-Null; $bk = 'ollama' } catch { $bk = if ($env:LLM_API_KEY) { 'api' } else { 'none' } } }
"backend: $bk"
if ($bk -eq 'ollama') { $env:LLM_ENDPOINT = 'http://127.0.0.1:11434/v1/chat/completions'; $env:LLM_MODEL = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL } else { 'qwen2.5:3b' }; $env:LLM_API_KEY = 'ollama'; $env:LLM_SMALL = '1' }
if ($bk -eq 'none') { $env:LLM_API_KEY = '' }
$env:LLM_BACKEND = 'openai'; $env:OVERLAY_WRITE = '1'; if (!$env:LLM_BUDGET) { $env:LLM_BUDGET = '90' }; $env:PYTHONIOENCODING = 'utf-8'
& "$B\venv\Scripts\python.exe" scripts\collect.py; if ($LASTEXITCODE) { "collect failed"; exit 1 }
& "$B\venv\Scripts\python.exe" scripts\enrich.py; if ($LASTEXITCODE) { "enrich failed"; exit 1 }
$T = New-Item -ItemType Directory "$env:TEMP\nb-ov-$(Get-Random)"; Copy-Item data\overlay\*.json $T
Set-Location data
foreach ($n in 1..3) {
  git fetch -q origin; git reset -q --hard origin/data; New-Item -ItemType Directory -Force overlay | Out-Null; Copy-Item "$T\*.json" overlay\
  git add overlay; git -c user.name="newsboard-$env:COMPUTERNAME" -c user.email=local@users.noreply.github.com commit -qm "overlay: $env:COMPUTERNAME $(Get-Date -f 'yyyy-MM-dd HH:mm')"
  if ($LASTEXITCODE) { "nothing to commit"; break }
  git push -q origin HEAD:data; if (!$LASTEXITCODE) { "pushed"; break }; Start-Sleep 20
}
Remove-Item -Recurse -Force $T; Stop-Transcript | Out-Null
