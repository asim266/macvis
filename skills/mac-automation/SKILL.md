---
name: Mac Automation
description: Drive the desktop — screenshots, clicks, app workflows.
when_to_use: Automating the Mac GUI across apps, or any task that needs to see and control the screen.
icon: 🖱
---

# Mac Automation

## Tool priority (most → least reliable)
1. A connected **MCP** for the app (if any).
2. **applescript** — script the app directly.
3. **computer** — screenshot + click/type when nothing else works.

## The computer-use loop
1. `computer{action:"screenshot"}` — LOOK at the screen first.
2. Identify the target's pixel coordinates from the screenshot.
3. Act: `left_click`, `type`, `key`, `scroll`, `drag`.
4. Screenshot again to verify the result. Repeat.

## Tips
- Open apps with `applescript`: `tell application "X" to activate`.
- Use `key` for shortcuts (`cmd+space` Spotlight, `cmd+tab` switch app, `Return`, `escape`).
- After typing into a field, take a screenshot to confirm focus/value before submitting.
- Requires Screen Recording + Accessibility permissions (System Settings → Privacy & Security).

## Don't
- Don't click links from untrusted emails/messages. Don't perform financial transactions on the user's behalf — ask them to confirm.
