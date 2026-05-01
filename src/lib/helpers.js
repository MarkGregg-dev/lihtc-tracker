export const fm = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '—'
  const v = Number(n)
  if (Math.abs(v) >= 1e6) return (v < 0 ? '-$' : '$') + (Math.abs(v) / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (Math.abs(v) >= 1e3) return (v < 0 ? '-$' : '$') + Math.round(Math.abs(v) / 1000) + 'K'
  return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString()
}

export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

export const clr = { green: '#639922', amber: '#BA7517', red: '#E24B4A' }

export const STAGE_STYLE = {
  'Pre-development': { background: '#FAEEDA', color: '#633806' },
  'Construction':   { background: '#E6F1FB', color: '#0C447C' },
  'Lease-up':       { background: '#EAF3DE', color: '#27500A' },
  'Stabilized':     { background: '#EEEDFE', color: '#3C3489' },
}

export const TYPE_COLORS = {
  executed:       { background: '#EAF3DE', color: '#27500A' },
  opinion:        { background: '#EEEDFE', color: '#3C3489' },
  reference:      { background: '#E6F1FB', color: '#0C447C' },
  'pm-report':    { background: '#FAEEDA', color: '#633806' },
  'rent-roll':    { background: '#FAEEDA', color: '#633806' },
  'draw-schedule':{ background: '#FAEEDA', color: '#633806' },
}

export const FOLDER_ORDER = [
  'A. Land Acquisition', 'B. Bond', 'C. HUD Transcript', 'D. Equity',
  'E. Land and Lease', 'F. Construction', 'G. Opinions', 'H. Title Misc', 'Monthly Reports'
]

export const FOLDER_LABELS = {
  'A. Land Acquisition': 'Land acquisition',
  'B. Bond': 'Bond',
  'C. HUD Transcript': 'HUD transcript',
  'D. Equity': 'Equity / LPA',
  'E. Land and Lease': 'Land & lease',
  'F. Construction': 'Construction',
  'G. Opinions': 'Opinions',
  'H. Title Misc': 'Title & misc',
  'Monthly Reports': 'Monthly reports',
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 }
  const parts = dateStr.replace(',', '').split(' ')
  if (parts.length < 2) return null
  const month = months[parts[0]]
  const year = parseInt(parts[parts.length - 1])
  if (isNaN(month) || isNaN(year)) return null
  const day = parts.length === 3 ? parseInt(parts[1]) : 1
  const target = new Date(year, month, day)
  const today = new Date()
  return Math.round((target - today) / 86400000)
}
