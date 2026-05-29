---
name: Scheduled Workflows
description: Build cron/launchd jobs and recurring automations.
when_to_use: Setting up recurring or time-triggered tasks on macOS.
icon: ⏱
---

# Scheduled Workflows

## launchd (preferred on macOS)
- Create `~/Library/LaunchAgents/<label>.plist` with `ProgramArguments`, `StartCalendarInterval` (or `StartInterval`).
- Load: `launchctl load ~/Library/LaunchAgents/<label>.plist`. Unload to remove.
- Logs: set `StandardOutPath`/`StandardErrorPath` to a file under `~/.macvis/logs/`.

```xml
<key>StartCalendarInterval</key>
<dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
```

## cron (simple)
- `crontab -e`; line: `0 9 * * * /path/to/script.sh >> ~/.macvis/logs/job.log 2>&1`.
- Cron has a minimal PATH — use absolute paths to binaries.

## Practices
- Make the job idempotent and safe to run twice.
- Write a wrapper script that sets env and logs start/end + exit code.
- Tell the user how to disable it (unload / remove crontab line).

## Verify
- Run the script manually once before scheduling. Confirm the schedule with `launchctl list` / `crontab -l`.
