# MacVis — UI Design Spec

## Overall design language

- **Dark by default** — deep charcoal background, not pure black
- **macOS native feel** — vibrancy, traffic lights, blurs
- **Minimal chrome** — content is the focus
- **Inspired by:** Linear, Raycast, Arc browser

## Color palette

```css
:root {
  --bg-primary:    #0d0d0d;   /* Main window background */
  --bg-secondary:  #141414;   /* Sidebar, cards */
  --bg-tertiary:   #1a1a1a;   /* Input fields, hover states */
  --bg-elevated:   #202020;   /* Modals, dropdowns */

  --border:        #2a2a2a;   /* Subtle borders */
  --border-bright: #3a3a3a;   /* Active/hover borders */

  --text-primary:  #f0f0f0;   /* Main text */
  --text-secondary:#888888;   /* Labels, meta text */
  --text-muted:    #555555;   /* Placeholder text */

  --accent:        #7c6af7;   /* Purple — primary action */
  --accent-hover:  #8f7ff9;
  --accent-dim:    rgba(124, 106, 247, 0.15);

  --success:       #34d399;   /* Green */
  --warning:       #fbbf24;   /* Amber */
  --error:         #f87171;   /* Red */
  --info:          #60a5fa;   /* Blue */
}
```

## Layout

```
┌──────────────────────────────────────────────────────────┐
│ ● ● ●  [sidebar toggle]              MacVis  [search]   │  ← TitleBar (40px)
├────────┬─────────────────────────────────────────────────┤
│        │                                                  │
│  NAV   │              MAIN CONTENT AREA                   │
│ (56px) │                                                  │
│        │                                                  │
│  💬    │                                                  │
│  ⚙️    │                                                  │
│  🔌    │                                                  │
│  🎨    │                                                  │
│  📡    │                                                  │
│        │                                                  │
│        │                                                  │
├────────┴─────────────────────────────────────────────────┤
│  [MCP status dots]    [model: claude-opus]   [telegram]  │  ← StatusBar (32px)
└──────────────────────────────────────────────────────────┘
```

## Sidebar (56px wide, icon-only by default)

Icons with tooltips on hover:
- 💬 Chat (keyboard: Cmd+1)
- ⚙️ Settings (keyboard: Cmd+,)
- 🔌 MCPs (keyboard: Cmd+2)
- 🎨 Skills (keyboard: Cmd+3)
- 🌐 Web Builder (keyboard: Cmd+4)
- 📡 Telegram (keyboard: Cmd+5)

Active icon has accent color background pill.

## Chat page layout

```
┌────────────────────────────────────────────┐
│  [+ New chat]  [Session 1] [Session 2] ... │  ← Session tabs
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 👤 User                    10:34 AM  │  │
│  │ Can you list my GitHub repos?        │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 🦞 MacVis                 10:34 AM  │  │
│  │                                      │  │
│  │  ┌─────────────────────────────────┐ │  │
│  │  │ 🔧 github__list_repositories    │ │  │
│  │  │ → found 23 repositories         │ │  │
│  │  └─────────────────────────────────┘ │  │
│  │                                      │  │
│  │  Here are your repos:                │  │
│  │  1. my-app (Next.js)                 │  │
│  │  2. api-server (Node.js)             │  │
│  │  ...                                 │  │
│  └──────────────────────────────────────┘  │
│                                            │
├────────────────────────────────────────────┤
│  ┌────────────────────────────────────┐    │
│  │ Message MacVis...         [Send]  │    │
│  └────────────────────────────────────┘    │
│  [📎 Attach]  [🎤 Voice]  [🔍 Search]      │
└────────────────────────────────────────────┘
```

## Message bubbles

### User message
```
rounded rect, bg-secondary, right-aligned (or full width)
timestamp: text-muted, top-right
```

### Assistant message
```
no background (flows naturally)
🦞 avatar + "MacVis" label
markdown rendered with:
  - syntax-highlighted code blocks
  - tables
  - bullet points
  - inline code
```

### Tool call card
```
┌────────────────────────────────────┐
│ 🔧 bash                  running… │
│ $ ls -la ~/Desktop                 │
└────────────────────────────────────┘

after completion:
┌────────────────────────────────────┐
│ ✅ bash                     done  │
│ $ ls -la ~/Desktop                 │
│                                    │
│ total 48                           │
│ drwx------  8 user staff  256      │
│ ...                                │
└────────────────────────────────────┘
```

## Settings page

Tabbed layout. Each tab is a vertical form.

### API Keys tab
Group inputs by category. Each input:
```
Label (text-secondary, 12px uppercase)
[password input field                    ] [Test] [✅/❌]
Helper text (text-muted, 11px)
```

### MCPs tab
Grid of MCP cards, 2 per row:
```
┌─────────────────────────────────┐
│  [GitHub logo]  GitHub     [●]  │ ← toggle
│  Repos, PRs, issues, actions    │
│                                 │
│  Token: [████████████] [Test]   │
│  Status: ✅ Connected           │
└─────────────────────────────────┘
```

## Status bar

Left: MCP connection dots (colored circles, one per MCP — green/red/grey)
Center: Current model name (clickable → opens model selector)
Right: Telegram status (green pulse if running)

## Onboarding wizard (first launch)

Step 1: Welcome screen — "Let's set up MacVis"
Step 2: Add Anthropic API key (required)
Step 3: Add optional keys (OpenAI, search)
Step 4: Connect MCPs (checkboxes for GitHub, Vercel, Supabase etc)
Step 5: Set up Telegram (optional)
Step 6: Done — opens main chat

## Typography

```css
font-family: -apple-system, 'SF Pro Display', sans-serif;

--text-xs:   11px;
--text-sm:   13px;
--text-base: 15px;
--text-lg:   17px;
--text-xl:   20px;

--weight-normal: 400;
--weight-medium: 500;
--weight-semibold: 600;
```

## Animations

- Message appear: fade up 150ms ease-out
- Tool card expand: height 200ms ease-in-out
- Sidebar hover: bg 100ms
- Status dots: pulse for "running" state
- Streaming text: no animation (just append)

## Keyboard shortcuts

| Key | Action |
|---|---|
| Cmd+Enter | Send message |
| Cmd+N | New session |
| Cmd+, | Open settings |
| Cmd+K | Command palette (future) |
| Escape | Stop agent |
| Cmd+1..5 | Switch sidebar section |
