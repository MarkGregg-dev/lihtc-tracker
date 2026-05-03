import { pct } from '../lib/helpers'

const s = {
  radius: '8px',
  radiusLg: '12px',
  border: '0.5px solid #e5e3db',
  borderMed: '0.5px solid #c8c6bc',
}

export function Bar({ value, max = 100, color = '#378ADD', height = 6 }) {
  return (
    <div style={{ height, background: '#e5e3db', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${Math.min(pct(value, max), 100)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s' }} />
    </div>
  )
}

export function Kpi({ label, value, sub, warn }) {
  return (
    <div style={{ background: '#eceae3', borderRadius: s.radius, padding: '.8rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: warn ? '#a32d2d' : '#1a1a18', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#8f8e87', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function SectionLabel({ children, mt = 10 }) {
  return (
    <div style={{ fontSize: 11, color: '#8f8e87', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 500, marginBottom: 6, marginTop: mt }}>
      {children}
    </div>
  )
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 14, border: s.border, borderRadius: s.radius, overflow: 'hidden', width: 'fit-content' }}>
      {tabs.map((t, i) => (
        <div key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '5px 14px', fontSize: 12, cursor: 'pointer',
          borderRight: i < tabs.length - 1 ? s.border : 'none',
          background: active === t.id ? '#eceae3' : '#fff',
          color: active === t.id ? '#1a1a18' : '#6b6a63',
          fontWeight: active === t.id ? 500 : 400,
          userSelect: 'none',
        }}>{t.label}</div>
      ))}
    </div>
  )
}

export function Badge({ label, style: customStyle }) {
  return (
    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 500, ...customStyle }}>
      {label}
    </span>
  )
}

export function Card({ children, open, style: customStyle, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: open ? '0.5px solid #888780' : s.border,
        borderRadius: s.radiusLg,
        padding: '1rem 1.25rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .15s',
        ...customStyle,
      }}
    >
      {children}
    </div>
  )
}

export function Btn({ children, onClick, danger, small, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? '4px 10px' : '6px 14px',
        fontSize: small ? 11 : 13,
        border: s.borderMed,
        borderRadius: s.radius,
        background: 'transparent',
        color: danger ? '#a32d2d' : '#1a1a18',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}
