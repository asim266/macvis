import { execFile } from 'child_process'

function osa(script: string, timeout = 30000): Promise<string> {
  return new Promise((resolve) => {
    execFile('osascript', ['-e', script], { timeout, maxBuffer: 1024 * 1024 * 8 }, (err: any, stdout, stderr) => {
      if (err) resolve(`Error: ${stderr?.trim() || err.message}`)
      else resolve((stdout || '').trim() || 'OK')
    })
  })
}
const esc = (s: string) => (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')

// ─── Mail ───────────────────────────────────────────────────────────────────
export const MailTool = {
  definition: {
    name: 'mail',
    description:
      'Read and send email via the macOS Mail app. operations: list (recent inbox), search (by text), send (to/subject/body). ' +
      'Confirm with the user before sending on their behalf.',
    input_schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list', 'search', 'send'] },
        query: { type: 'string', description: 'Search text (search)' },
        count: { type: 'number', description: 'How many messages to list (default 10)' },
        to: { type: 'string', description: 'Recipient email (send)' },
        subject: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['operation'],
    },
  },
  async execute({ operation, query, count = 10, to, subject, body }: any) {
    if (operation === 'send') {
      if (!to) return 'Provide a "to" address.'
      return await osa(`tell application "Mail"
  set m to make new outgoing message with properties {subject:"${esc(subject || '')}", content:"${esc(body || '')}", visible:false}
  tell m to make new to recipient at end of to recipients with properties {address:"${esc(to)}"}
  send m
  return "Sent to ${esc(to)}"
end tell`)
    }
    const n = Math.max(1, Math.min(40, count))
    const filter = operation === 'search' && query
      ? `(messages of inbox whose subject contains "${esc(query)}" or content contains "${esc(query)}")`
      : `messages 1 thru ${n} of inbox`
    return await osa(`tell application "Mail"
  set out to ""
  set msgs to ${filter}
  set k to 0
  repeat with m in msgs
    set k to k + 1
    if k > ${n} then exit repeat
    try
      set out to out & "• " & (subject of m) & " — " & (sender of m) & linefeed
    end try
  end repeat
  if out is "" then return "No messages."
  return out
end tell`)
  },
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
export const CalendarTool = {
  definition: {
    name: 'calendar',
    description:
      'Read and create events in the macOS Calendar app. operations: list (upcoming N days), create (title + start + duration).',
    input_schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list', 'create'] },
        days: { type: 'number', description: 'Look-ahead window for list (default 7)' },
        title: { type: 'string', description: 'Event title (create)' },
        start: { type: 'string', description: 'Start date/time string parseable by macOS, e.g. "2026-06-01 14:00" (create)' },
        duration_minutes: { type: 'number', description: 'Event length (create, default 60)' },
        calendar: { type: 'string', description: 'Calendar name (create; default first calendar)' },
      },
      required: ['operation'],
    },
  },
  async execute({ operation, days = 7, title, start, duration_minutes = 60, calendar }: any) {
    if (operation === 'create') {
      if (!title || !start) return 'Provide title and start.'
      const calClause = calendar ? `calendar "${esc(calendar)}"` : `calendar 1`
      return await osa(`tell application "Calendar"
  set s to date "${esc(start)}"
  set e to s + (${Math.max(1, duration_minutes)} * minutes)
  tell ${calClause} to make new event with properties {summary:"${esc(title)}", start date:s, end date:e}
  return "Created event: ${esc(title)}"
end tell`)
    }
    return await osa(`tell application "Calendar"
  set now to current date
  set future to now + (${Math.max(1, days)} * days)
  set out to ""
  repeat with c in calendars
    try
      set evs to (every event of c whose start date ≥ now and start date ≤ future)
      repeat with ev in evs
        set out to out & "• " & (summary of ev) & " @ " & ((start date of ev) as string) & linefeed
      end repeat
    end try
  end repeat
  if out is "" then return "No upcoming events in the next ${days} days."
  return out
end tell`, 45000)
  },
}

// ─── Reminders ─────────────────────────────────────────────────────────────────
export const RemindersTool = {
  definition: {
    name: 'reminders',
    description: 'Read and add to the macOS Reminders app. operations: list (open reminders), add (name + optional due).',
    input_schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list', 'add'] },
        name: { type: 'string', description: 'Reminder text (add)' },
        due: { type: 'string', description: 'Due date/time string (add, optional)' },
      },
      required: ['operation'],
    },
  },
  async execute({ operation, name, due }: any) {
    if (operation === 'add') {
      if (!name) return 'Provide a reminder name.'
      const dueClause = due ? `, due date:(date "${esc(due)}")` : ''
      return await osa(`tell application "Reminders" to make new reminder with properties {name:"${esc(name)}"${dueClause}}
return "Added reminder: ${esc(name)}"`)
    }
    return await osa(`tell application "Reminders"
  set out to ""
  repeat with r in (reminders whose completed is false)
    set out to out & "• " & (name of r) & linefeed
  end repeat
  if out is "" then return "No open reminders."
  return out
end tell`)
  },
}

// ─── Contacts ─────────────────────────────────────────────────────────────────
export const ContactsTool = {
  definition: {
    name: 'contacts',
    description: 'Search the macOS Contacts app by name. Returns matching people with their emails and phone numbers.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Name to search for' } },
      required: ['query'],
    },
  },
  async execute({ query }: any) {
    return await osa(`tell application "Contacts"
  set out to ""
  repeat with p in (people whose name contains "${esc(query)}")
    set out to out & (name of p)
    try
      repeat with em in emails of p
        set out to out & " | " & (value of em)
      end repeat
    end try
    try
      repeat with ph in phones of p
        set out to out & " | " & (value of ph)
      end repeat
    end try
    set out to out & linefeed
  end repeat
  if out is "" then return "No contacts matching ${esc(query)}."
  return out
end tell`)
  },
}
