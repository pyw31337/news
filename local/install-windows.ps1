# NewsBoard 로컬 분석 설치(Windows). PowerShell에서:  powershell -ExecutionPolicy Bypass -File local\install-windows.ps1
# 미리 설치: Git for Windows, Python 3.11+, (권장) Ollama → 설치 후  ollama pull qwen2.5:3b
$ErrorActionPreference = 'Stop'
$NB = if ($env:NB_HOME) { $env:NB_HOME } else { "$HOME\newsboard-local" }; $SRC = $PSScriptRoot
New-Item -ItemType Directory -Force "$NB\logs" | Out-Null
Copy-Item "$SRC\run.ps1" "$NB\run.ps1" -Force
if (!(Test-Path "$NB\local.env")) { Copy-Item "$SRC\local.env.example" "$NB\local.env" }
if (!(Test-Path "$NB\venv")) { python -m venv "$NB\venv" }
& "$NB\venv\Scripts\pip.exe" install -q -r "$SRC\..\requirements.txt"
$K = "$HOME\.ssh\newsboard_deploy"
if (!(Test-Path $K)) {
  New-Item -ItemType Directory -Force "$HOME\.ssh" | Out-Null
  ssh-keygen -q -t ed25519 -N '""' -f $K -C "newsboard-$env:COMPUTERNAME"
  Add-Content "$HOME\.ssh\config" "`nHost github-newsboard`n  HostName github.com`n  User git`n  IdentityFile $K`n  IdentitiesOnly yes`n"
  "`n▶ 아래 공개키를 GitHub 저장소 → Settings → Deploy keys → Add deploy key 에 붙여넣고 'Allow write access' 체크:"; Get-Content "$K.pub"
}
$a = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$NB\run.ps1`""
$t = New-ScheduledTaskTrigger -Daily -At 3:30am
Register-ScheduledTask -TaskName 'NewsBoard-AI' -Action $a -Trigger $t -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun) -Force | Out-Null
"완료: 작업 스케줄러 'NewsBoard-AI' 매일 03:30. 바로 시험: powershell -File `"$NB\run.ps1`""
