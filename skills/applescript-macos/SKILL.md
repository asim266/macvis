---
name: AppleScript / JXA
description: Automate native macOS apps via osascript.
when_to_use: Controlling or reading data from native Mac apps (Notes, Mail, Calendar, Finder, Reminders, Music, Safari).
icon: 🍎
---

# AppleScript / JXA

Use the `applescript` tool. Prefer scripting an app directly over `computer` pixel-clicking — it's far more reliable.

## Common recipes
**Create a note**
```applescript
tell application "Notes" to make new note at folder "Notes" with properties {name:"Title", body:"Body"}
```
**Add a reminder**
```applescript
tell application "Reminders" to make new reminder with properties {name:"Call Bob", due date:(current date) + 3600}
```
**Reveal a file in Finder**
```applescript
tell application "Finder" to reveal POSIX file "/Users/me/file.txt"
```
**Send a Messages text** (confirm with user first)
```applescript
tell application "Messages" to send "hi" to buddy "+1..." of service 1
```

## Tips
- App must be scriptable; check its dictionary (Script Editor → Open Dictionary).
- For UI automation of non-scriptable apps, use `System Events` with `key code`/`keystroke`, or the `computer` tool.
- JXA (`language:"jxa"`) when you prefer JavaScript syntax.

## Permissions
- First run prompts for Automation/Accessibility permission. Tell the user to approve it in System Settings → Privacy.
