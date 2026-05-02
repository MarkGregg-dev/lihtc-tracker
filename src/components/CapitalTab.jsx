import { useState, useEffect } from 'react'
import { SectionLabel, Kpi, Bar } from './ui'
import { DrawParser } from './DrawParser'
import { supabase } from '../lib/supabase'

const S = { border: '0.5px solid #e5e3db', radius: '8px' }
const fm = (v) => v == null ? '—' : '$' + Math.abs(Math.round(v)).toLocaleString()

const HARD_COSTS = [
  { label: 'NRP Construction', amount: 2900780 },
  { label: 'Waterproof Testing', amount: 100000 },
  { label: 'Connection Fees', amount: 81907 },
  { label: 'Radon Testing', amount: 20000 },
  { label: 'As-Built Survey', amount: 25000 },
]

const SOFT_COSTS_RAW = [
  { label: 'Other Fees / Contingency', amount: 523386 },
  { label: 'SMHA Tax Savings', amount: 218282 },
  { label: 'Construction Consultant', amount: 142693 },
  { label: 'HUD MIP', amount: 132500 },
  { label: 'Other Fees - NRP', amount: 130000 },
  { label: 'Materials Testing', amount: 54684 },
  { label: 'Gershman Third Party', amount: 54833 },
  { label: 'FF&E', amount: 52913 },
  { label: 'Betco & JGR Consulting', amount: 47500 },
  { label: 'Title & Recording', amount: 32250 },
  { label: 'Health & Human Services', amount: 29000 },
  { label: 'Architect & Civil', amount: 25177 },
  { label: 'LIHTC Legal', amount: 23495 },
  { label: 'Building Plan Review', amount: 21725 },
  { label: 'Architect/Landscape Supervision', amount: 16541 },
  { label: 'Accounting', amount: 14861 },
  { label: 'Tax Credit Fees', amount: 8390 },
  { label: 'Insurance (remaining)', amount: 7430 },
  { label: 'TEFRA', amount: 5850 },
  { label: 'Verification Agent', amount: 3500 },
  { label: 'TBRB', amount: 17500 },
  { label: 'Texas AG Office', amount: 9500 },
  { label: 'Printing', amount: 4500 },
]
const SOFT_COSTS = SOFT_COSTS_RAW.filter((item, idx, arr) => arr.findIndex(x => x.label === item.label) === idx)

const WC_LEDGER = [
  { desc: 'Release #1 (To be reimbursed)', date: '2024-07-18', amount: 398656, balance: 661344 },
  { desc: 'Release #2 (To be reimbursed)', date: '2024-07-31', amount: 491901.25, balance: 169442.75 },
  { desc: 'Release #3 (To be reimbursed)', date: '2024-08-26', amount: 45518.45, balance: 123924.30 },
  { desc: 'Release #4 (To be reimbursed)', date: '2024-09-25', amount: 70553.60, balance: 53370.70 },
  { desc: 'Reimbursed on Draw #2', date: '', amount: -1006629.30, balance: 1060000 },
  { desc: 'Release #5 - Time Extension', date: '2024-12-05', amount: 159636.09, balance: 900363.91 },
  { desc: 'Release #6 - Time Extension', date: '2025-01-22', amount: 8570.06, balance: 891793.85 },
  { desc: 'Release #7 - Time Extension', date: '2025-02-21', amount: 56645.06, balance: 835148.79 },
  { desc: 'Release #8 - Time Extension', date: '2025-03-31', amount: 30897.31, balance: 804251.48 },
  { desc: 'Release #9 - Time Extension', date: '2025-04-18', amount: 77243.27, balance: 727008.21 },
  { desc: 'Release #10 - Time Extension', date: '2025-04-18', amount: 97841.47, balance: 629166.74 },
  { desc: 'Release #11', date: '2025-06-30', amount: 10299.10, balance: 618867.64 },
  { desc: 'Release #12 - Lease up Costs', date: '', amount: 144508, balance: 474359.64 },
  { desc: 'Release #13', date: '', amount: 163274, balance: 311085.64 },
]

const CO_LEDGER = [
  { desc: 'Release #1 (CO #2) - HUD Time', date: '2024-12-06', amount: 56420, balance: 1003580 },
  { desc: 'Release #2 (CO #3) - General conditions', date: '2025-01-22', amount: 41355.17, balance: 962224.83 },
  { desc: 'Release #3 (CO #4) - Water Line', date: '2025-01-22', amount: 3640, balance: 958584.83 },
  { desc: 'Release #4 (CO #6) - General conditions', date: '2025-01-22', amount: 24466.75, balance: 934118.08 },
  { desc: 'Release #5 (CO #7) - HUD Time', date: '2025-01-22', amount: 26155.39, balance: 907962.69 },
  { desc: 'Release #6 (CO #8) - Moisture Barrier', date: '2025-01-28', amount: 111664.46, balance: 796298.23 },
  { desc: 'Release #7 (CO #10) - Water Line', date: '2025-02-21', amount: 20020, balance: 776278.23 },
  { desc: 'Release #8 (CO #12)', date: '2025-04-30', amount: 10920, balance: 765358.23 },
  { desc: 'Release #9 (CO #14)', date: '2025-04-18', amount: 27300, balance: 738058.23 },
  { desc: 'Release #10 (CO #16)', date: '2025-04-18', amount: 34580, balance: 703478.23 },
  { desc: 'Release #11 (CO #17)', date: '2025-04-18', amount: 6000.05, balance: 697478.18 },
  { desc: 'Release #12', date: '2025-06-30', amount: 3640, balance: 693838.18 },
]

const D = {
  INTEREST_REMAINING: 287384,
  MONTHLY_BOND_INTEREST: 117167,
  WC_ESCROW: 311086,
  CO_CONTINGENCY: 693838,
  OP_DEFICIT_ESCROW: 1590000,
  HUD_REMAINING: 4815030,
  EQUITY_REMAINING: 120000,
}

const STAB_TARGET = 326
const CURRENT_OCC_UNITS = 63
const CURRENT_MONTHLY_DEFICIT = 23834
const STAB_NOI = 22749

function addMonths(n, fromDate) {
  const d = new Date(fromDate || '2026-03-02')
  d.setMonth(d.getMonth() + Math.round(n))
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function getMonthLabel(offset, fromDate) {
  const d = new Date(fromDate || '2026-03-02')
  d.setMonth(d.getMonth() + offset)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function calcScenario(pace, asOfDate, interestRemaining, wcEscrow, opEscrow) {
  const unitsNeeded = STAB_TARGET - CURRENT_OCC_UNITS
  const monthsToStab = unitsNeeded / pace
  let interestReserve = interestRemaining
  let totalOpDeficit = 0
  let totalInterestShortfall = 0
  const monthly = []
  for (let m = 1; m <= Math.ceil(monthsToStab) + 1; m++) {
    const progress = Math.min(m / monthsToStab, 1.0)
    const noi = -CURRENT_MONTHLY_DEFICIT + (CURRENT_MONTHLY_DEFICIT + STAB_NOI) * progress
    const interestDraw = Math.min(D.MONTHLY_BOND_INTEREST, interestReserve)
    interestReserve = Math.max(0, interestReserve - D.MONTHLY_BOND_INTEREST)
    const interestShortfall = D.MONTHLY_BOND_INTEREST - interestDraw
    totalInterestShortfall += interestShortfall
    if (noi < 0) totalOpDeficit += Math.abs(noi)
    monthly.push({ month: m, noi: Math.round(noi), interestShortfall: Math.round(interestShortfall) })
  }
  const totalCashNeeded = totalOpDeficit + totalInterestShortfall
  const available = wcEscrow + opEscrow
  const surplus = available - totalCashNeeded
  return { pace, monthsToStab, totalOpDeficit, totalInterestShortfall, totalCashNeeded, available, surplus, monthly, stabDate: addMonths(monthsToStab, asOfDate) }
}


function EscrowLedger({ ledger, beginning, label }

function RunwayModel({ asOfDate, interestRemaining, wcEscrow, opDeficitEscrow, currentOccUnits, pace }) {
  const MONTHLY_BOND_INT = 117167
  const CURRENT_DEFICIT = 23834
  const STAB_NOI = 22749
  const STAB_TARGET = 326
  const TOTAL_UNITS = 363

  const unitsNeeded = STAB_TARGET - currentOccUnits
  const monthsToStab = unitsNeeded / pace

  function getMonthDate(offset) {
    const d = new Date(asOfDate)
    d.setMonth(d.getMonth() + offset)
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const months = []
  let intReserve = interestRemaining
  let wc = wcEscrow
  let stabilized = false

  for (let m = 1; m <= 18; m++) {
    const progress = Math.min(m / monthsToStab, 1.0)
    const occUnits = Math.min(currentOccUnits + Math.round(pace * m), STAB_TARGET)
    const occPct = Math.round(occUnits / TOTAL_UNITS * 100)
    const noi = Math.round(-CURRENT_DEFICIT + (CURRENT_DEFICIT + STAB_NOI) * progress)

    // Bond interest: first from interest reserve, then WC
    const intFromReserve = Math.min(MONTHLY_BOND_INT, intReserve)
    intReserve = Math.max(0, intReserve - MONTHLY_BOND_INT)
    const intFromWC = MONTHLY_BOND_INT - intFromReserve

    // Op deficit from WC (pre-stab only)
    const opFromWC = (!stabilized && noi < 0) ? Math.abs(noi) : 0
    wc = Math.max(0, wc - intFromWC - opFromWC)

    if (occUnits >= STAB_TARGET && !stabilized) stabilized = true

    const totalBurn = MONTHLY_BOND_INT + Math.max(0, -noi)
    const slpRequired = (intReserve <= 0 && wc <= 0 && !stabilized)

    let status, statusColor, statusBg
    if (stabilized) {
      status = 'Stabilized'; statusColor = '#27500A'; statusBg = '#EAF3DE'
    } else if (slpRequired || (intReserve <= 0 && wc <= 0)) {
      status = 'SLP cash required'; statusColor = '#791F1F'; statusBg = '#FCEBEB'
    } else if (intReserve <= 0) {
      status = 'WC only'; statusColor = '#633806'; statusBg = '#FEF3E2'
    } else if (intReserve < MONTHLY_BOND_INT * 2) {
      status = 'Watch'; statusColor = '#633806'; statusBg = '#FAEEDA'
    } else {
      status = 'OK'; statusColor = '#27500A'; statusBg = '#EAF3DE'
    }

    months.push({
      m, label: getMonthDate(m), occPct, noi, totalBurn,
      intReserve: Math.max(0, intReserve), wc: Math.max(0, wc),
      slpRequired, stabilized, status, statusColor, statusBg
    })

    if (stabilized && m > monthsToStab + 2) break
  }

  const slpStartMonth = months.find(m => m.slpRequired)
  const stabMonth = months.find(m => m.stabilized)
  const maxReserve = interestRemaining + wcEscrow

  return (
    <div style={{ marginTop: 16 }}>
      <SectionLabel>Month-by-month cash runway — {pace} units/month</SectionLabel>

      {/* Key milestone callouts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, marginBottom: 14 }}>
        <div style={{ padding: '10px 14px', background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: '8px' }}>
          <div style={{ fontSize: 11, color: '#633806', marginBottom: 2 }}>Interest reserve exhausted</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#633806' }}>{getMonthDate(Math.ceil(interestRemaining / MONTHLY_BOND_INT))}</div>
          <div style={{ fontSize: 10, color: '#8f8e87', marginTop: 1 }}>Month {Math.ceil(interestRemaining / MONTHLY_BOND_INT)}</div>
        </div>
        {slpStartMonth ? (
          <div style={{ padding: '10px 14px', background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: '8px' }}>
            <div style={{ fontSize: 11, color: '#791F1F', marginBottom: 2 }}>⚠ SLP cash required from</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#791F1F' }}>{slpStartMonth.label}</div>
            <div style={{ fontSize: 10, color: '#8f8e87', marginTop: 1 }}>Under construction guaranty</div>
          </div>
        ) : (
          <div style={{ padding: '10px 14px', background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: '8px' }}>
            <div style={{ fontSize: 11, color: '#27500A', marginBottom: 2 }}>✓ Reserves hold until stab</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#27500A' }}>No SLP cash needed</div>
          </div>
        )}
        {stabMonth && (
          <div style={{ padding: '10px 14px', background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: '8px' }}>
            <div style={{ fontSize: 11, color: '#27500A', marginBottom: 2 }}>Stabilization — op escrow unlocks</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#27500A' }}>{stabMonth.label}</div>
            <div style={{ fontSize: 10, color: '#8f8e87', marginTop: 1 }}>${(opDeficitEscrow/1000).toFixed(0)}K released</div>
          </div>
        )}
        <div style={{ padding: '10px 14px', background: '#eceae3', border: '0.5px solid #e5e3db', borderRadius: '8px' }}>
          <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 2 }}>Op deficit escrow (locked)</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a18' }}>${(opDeficitEscrow/1000).toFixed(0)}K</div>
          <div style={{ fontSize: 10, color: '#8f8e87', marginTop: 1 }}>Unlocks at stabilization only</div>
        </div>
      </div>

      {/* Reserve level chart */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 60 }}>
          {months.map((m, i) => {
            const total = m.intReserve + m.wc
            const h = Math.max(2, Math.round((total / maxReserve) * 55))
            const intH = Math.max(0, Math.round((m.intReserve / maxReserve) * 55))
            const wcH = h - intH
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '80%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  {intH > 0 && <div style={{ height: intH, background: '#BA7517', borderRadius: '2px 2px 0 0' }} />}
                  {wcH > 0 && <div style={{ height: wcH, background: '#378ADD' }} />}
                  {total <= 0 && !m.stabilized && <div style={{ height: 4, background: '#E24B4A', borderRadius: 2 }} />}
                  {m.stabilized && <div style={{ height: 4, background: '#639922', borderRadius: 2 }} />}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {months.map((m, i) => (
            <div key={i} style={{ flex: 1, fontSize: 6, color: '#8f8e87', textAlign: 'center', marginTop: 2 }}>{m.label.split(' ')[0]}</div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        {[['#BA7517','Interest reserve'],['#378ADD','WC escrow'],['#E24B4A','Reserves exhausted'],['#639922','Stabilized']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, background: c, borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: '#6b6a63' }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Month-by-month table */}
      <div style={{ border: '0.5px solid #e5e3db', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#eceae3' }}>
            {['Month','Occ %','Monthly NOI','Bond interest','Int reserve','WC escrow','Status'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: '0.5px solid #e5e3db' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {months.map((m, i) => (
              <tr key={i} style={{ borderBottom: i < months.length - 1 ? '0.5px solid #e5e3db' : 'none', background: m.statusBg }}>
                <td style={{ padding: '5px 10px', fontWeight: 500, color: '#1a1a18' }}>{m.label}</td>
                <td style={{ padding: '5px 10px', color: '#1a1a18' }}>{m.occPct}%</td>
                <td style={{ padding: '5px 10px', color: m.noi < 0 ? '#a32d2d' : '#27500A', fontWeight: 500 }}>{m.noi < 0 ? `(${fm(Math.abs(m.noi))})` : fm(m.noi)}</td>
                <td style={{ padding: '5px 10px', color: '#6b6a63' }}>{fm(117167)}</td>
                <td style={{ padding: '5px 10px', color: m.intReserve < 50000 ? '#a32d2d' : '#1a1a18', fontWeight: m.intReserve < 50000 ? 600 : 400 }}>{m.intReserve <= 0 ? '—' : fm(m.intReserve)}</td>
                <td style={{ padding: '5px 10px', color: m.wc < 50000 && !m.stabilized ? '#a32d2d' : '#1a1a18', fontWeight: m.wc < 50000 && !m.stabilized ? 600 : 400 }}>{m.wc <= 0 && !m.stabilized ? '—' : fm(m.wc)}</td>
                <td style={{ padding: '5px 10px' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: m.statusColor }}>{m.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 10, color: '#8f8e87', marginTop: 6, lineHeight: 1.5 }}>
        Operating deficit escrow (${(opDeficitEscrow/1000).toFixed(0)}K) is excluded — locked until stabilization per LPA. After reserves exhaust, SLP funds bond interest under construction guaranty as excess development costs.

      <RunwayModel
        asOfDate={asOfDate}
        interestRemaining={INTEREST_REMAINING}
        wcEscrow={WC_ESCROW}
        opDeficitEscrow={OP_DEFICIT_ESCROW}
        currentOccUnits={63}
        pace={activePace}
      />
    </div>
  )
}
) {
  const [expanded, setExpanded] = useState(false)
  const currentBalance = ledger.length > 0 ? ledger[ledger.length - 1].balance : beginning
  const totalReleased = beginning - currentBalance
  const pctUsed = Math.round((totalReleased / beginning) * 100)
  const displayLedger = ledger.filter(t => t.amount !== 0)
  return (
    <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
      <div onClick={() => setExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#eceae3', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>{label}</span>
          <span style={{ fontSize: 11, color: '#6b6a63' }}>Start: {fm(beginning)}</span>
          <span style={{ fontSize: 11, color: '#633806', fontWeight: 500 }}>Released: {fm(totalReleased)} ({pctUsed}%)</span>
          <span style={{ fontSize: 11, color: currentBalance < beginning * 0.3 ? '#a32d2d' : '#27500A', fontWeight: 600 }}>Balance: {fm(currentBalance)}</span>
        </div>
        <span style={{ fontSize: 10, color: '#8f8e87', transform: expanded ? 'none' : 'rotate(-90deg)', transition: 'transform .2s' }}>▼</span>
      </div>
      <div style={{ padding: '6px 12px 4px', background: '#fff' }}>
        <div style={{ height: 5, background: '#e5e3db', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: pctUsed + '%', height: '100%', background: pctUsed > 70 ? '#E24B4A' : '#378ADD', borderRadius: 3 }} />
        </div>
      </div>
      {expanded && (
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f5f4f0' }}>
            {['#', 'Date', 'Description', 'Amount', 'Balance'].map(h => (
              <th key={h} style={{ padding: '5px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {displayLedger.map((t, i) => (
              <tr key={i} style={{ borderBottom: i < displayLedger.length - 1 ? S.border : 'none' }}>
                <td style={{ padding: '5px 10px', color: '#8f8e87' }}>{i + 1}</td>
                <td style={{ padding: '5px 10px', color: '#6b6a63' }}>{t.date || '—'}</td>
                <td style={{ padding: '5px 10px', color: '#1a1a18' }}>{t.desc}</td>
                <td style={{ padding: '5px 10px', color: t.amount < 0 ? '#27500A' : '#633806', fontWeight: 500 }}>{t.amount < 0 ? '+' : ''}{fm(Math.abs(t.amount))}</td>
                <td style={{ padding: '5px 10px', color: '#1a1a18', fontWeight: 500 }}>{fm(t.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function CapitalTab({ project }) {
  const [activePace, setActivePace] = useState(22)
  const [showAllSoft, setShowAllSoft] = useState(false)
  const [dbData, setDbData] = useState(null)

  useEffect(() => {
    if (!project?.id) return
    supabase.from('capital_data').select('*').eq('project_id', project.id).single()
      .then(({ data }) => { if (data) setDbData(data) })
  }, [project?.id])

  const asOfDate = dbData?.as_of_date || dbData?.last_draw_date || '2026-03-02'
  const INTEREST_REMAINING = dbData?.interest_remaining ?? D.INTEREST_REMAINING
  const WC_ESCROW = dbData?.wc_escrow ?? D.WC_ESCROW
  const CO_CONTINGENCY = dbData?.co_contingency ?? D.CO_CONTINGENCY
  const OP_DEFICIT_ESCROW = dbData?.op_deficit_escrow ?? D.OP_DEFICIT_ESCROW
  const HUD_REMAINING = dbData?.hud_remaining ?? D.HUD_REMAINING
  const EQUITY_REMAINING = dbData?.equity_remaining ?? D.EQUITY_REMAINING
  const MONTHS_INTEREST_LEFT = INTEREST_REMAINING / D.MONTHLY_BOND_INTEREST
  const wcLedger = dbData?.wc_ledger || WC_LEDGER
  const coLedger = dbData?.co_ledger || CO_LEDGER

  const dbLineItems = dbData?.line_items || []
  const dynamicHard = dbLineItems.filter(l => ['nrp construction','waterproof','connection fee','radon','as-built'].some(t => l.label.toLowerCase().includes(t)) && l.remaining > 0)
  const dynamicSoft = dbLineItems.filter(l => !['nrp construction','waterproof','connection fee','radon','as-built','interest','deferred','operating deficit','working capital','equity','gershman','total'].some(t => l.label.toLowerCase().includes(t)) && l.remaining > 0)
  const displayHardCosts = dynamicHard.length > 0 ? dynamicHard.map(l => ({ label: l.label, amount: l.remaining })) : HARD_COSTS
  const displaySoftCosts = dynamicSoft.length > 0 ? dynamicSoft.map(l => ({ label: l.label, amount: l.remaining })) : SOFT_COSTS

  const hardTotal = displayHardCosts.reduce((a, c) => a + c.amount, 0)
  const softTotal = displaySoftCosts.reduce((a, c) => a + c.amount, 0)
  const totalUsesRemaining = hardTotal + softTotal + INTEREST_REMAINING
  const scenarios = [15, 22, 30].map(p => calcScenario(p, asOfDate, INTEREST_REMAINING, WC_ESCROW, OP_DEFICIT_ESCROW))
  const activeScenario = scenarios.find(s => s.pace === activePace)
  const interestExhaustDate = addMonths(MONTHS_INTEREST_LEFT, asOfDate)

  return (
    <div>
      <DrawParser projectId={project?.id} onParsed={(d) => setDbData(d)} />
      {dbData?.updated_at && (
        <div style={{ fontSize: 11, color: '#8f8e87', marginBottom: 10 }}>
          Last updated: {new Date(dbData.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {dbData.last_draw_num && ` · Draw #${dbData.last_draw_num}`}
          {dbData.last_draw_date && ` (${dbData.last_draw_date})`}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, marginBottom: 16 }}>
        <Kpi label="HUD draws remaining" value={fm(HUD_REMAINING)} sub="covers all construction" />
        <Kpi label="Interest reserve left" value={fm(INTEREST_REMAINING)} sub={`${MONTHS_INTEREST_LEFT.toFixed(1)} months`} warn />
        <Kpi label="Interest exhausted" value={interestExhaustDate} sub="~Jul 2026" warn />
        <Kpi label="Working capital escrow" value={fm(WC_ESCROW)} sub="restricted HUD escrow" />
        <Kpi label="Operating deficit escrow" value={fm(OP_DEFICIT_ESCROW)} sub="restricted HUD escrow" />
        <Kpi label="CO contingency" value={fm(CO_CONTINGENCY)} sub="for change orders" />
        <Kpi label="Total escrow cushion" value={fm(WC_ESCROW + OP_DEFICIT_ESCROW)} sub="for interest + ops" warn />
      </div>

      <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: S.radius, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#791F1F', marginBottom: 4 }}>⚠ Interest reserve is the critical risk</div>
        <div style={{ fontSize: 12, color: '#a32d2d', lineHeight: 1.6 }}>
          Bond interest is $38M × 3.70% = <strong>${D.MONTHLY_BOND_INTEREST.toLocaleString()}/month</strong>.
          Only <strong>${INTEREST_REMAINING.toLocaleString()}</strong> remains — approximately <strong>{MONTHS_INTEREST_LEFT.toFixed(1)} months</strong> ({interestExhaustDate}).
          After that, interest must be funded from working capital ($311K) and operating deficit escrow ($1.59M).
          At 22 units/month: <strong>$721K surplus</strong>. At 15 units/month: <strong>$15K gap</strong> — SLP construction guaranty backstops any shortfall.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <SectionLabel mt={0}>Sources remaining</SectionLabel>
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#eceae3' }}>
                {['Source', 'Amount', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[
                  { label: 'HUD loan — remaining draws', amount: HUD_REMAINING, note: 'Covers construction + soft costs', color: '#EAF3DE' },
                  { label: 'LIHTC equity (AHP)', amount: EQUITY_REMAINING, note: 'In draw schedule', color: '#fff' },
                  { label: 'Interest income (BOKF)', amount: 465207, note: 'Not yet received', color: '#fff' },
                  { label: 'Working capital escrow', amount: WC_ESCROW, note: 'Restricted — ops/interest', color: '#E6F1FB' },
                  { label: 'Operating deficit escrow', amount: OP_DEFICIT_ESCROW, note: 'Restricted — ops/interest', color: '#E6F1FB' },
                  { label: 'CO contingency escrow', amount: CO_CONTINGENCY, note: 'Restricted — change orders', color: '#E6F1FB' },
                  { label: 'Deferred developer fee', amount: 3506343, note: 'Non-cash — due Dec 2039', color: '#f5f4f0' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: S.border, background: row.color }}>
                    <td style={{ padding: '7px 10px', color: '#1a1a18', fontWeight: 500 }}>{row.label}</td>
                    <td style={{ padding: '7px 10px', color: '#1a1a18' }}>{fm(row.amount)}</td>
                    <td style={{ padding: '7px 10px', color: '#8f8e87', fontSize: 11 }}>{row.note}</td>
                  </tr>
                ))}
                <tr style={{ background: '#eceae3', borderTop: S.border }}>
                  <td style={{ padding: '7px 10px', fontWeight: 600, color: '#1a1a18' }}>Total liquid sources</td>
                  <td style={{ padding: '7px 10px', fontWeight: 600, color: '#1a1a18' }}>{fm(HUD_REMAINING + EQUITY_REMAINING + 465207 + WC_ESCROW + OP_DEFICIT_ESCROW + CO_CONTINGENCY)}</td>
                  <td style={{ padding: '7px 10px', fontSize: 11, color: '#8f8e87' }}>excl. deferred fee</td>
                </tr>
              </tbody>
            </table>
          </div>

          <SectionLabel>Working capital escrow — transaction history</SectionLabel>
          <EscrowLedger ledger={wcLedger} beginning={1060000} label="Working capital escrow" />

          <SectionLabel>CO contingency escrow — transaction history</SectionLabel>
          <EscrowLedger ledger={coLedger} beginning={1060000} label="CO contingency escrow" />

          <SectionLabel>Hard costs remaining — paid from HUD draws</SectionLabel>
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <tbody>
                {displayHardCosts.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < displayHardCosts.length - 1 ? S.border : 'none' }}>
                    <td style={{ padding: '6px 10px', color: '#1a1a18' }}>{row.label}</td>
                    <td style={{ padding: '6px 10px', color: '#1a1a18', textAlign: 'right', fontWeight: 500 }}>{fm(row.amount)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#eceae3', borderTop: S.border }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1a1a18' }}>Subtotal hard costs</td>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1a1a18', textAlign: 'right' }}>{fm(hardTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <SectionLabel>Soft costs remaining — paid from HUD draws</SectionLabel>
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <tbody>
                {(showAllSoft ? displaySoftCosts : displaySoftCosts.slice(0, 6)).map((row, i) => (
                  <tr key={i} style={{ borderBottom: S.border }}>
                    <td style={{ padding: '6px 10px', color: '#1a1a18' }}>{row.label}</td>
                    <td style={{ padding: '6px 10px', color: '#1a1a18', textAlign: 'right', fontWeight: 500 }}>{fm(row.amount)}</td>
                  </tr>
                ))}
                {!showAllSoft && (
                  <tr style={{ borderBottom: S.border }}>
                    <td colSpan={2} style={{ padding: '6px 10px' }}>
                      <button onClick={() => setShowAllSoft(true)} style={{ fontSize: 11, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        + Show all {displaySoftCosts.length} line items
                      </button>
                    </td>
                  </tr>
                )}
                <tr style={{ background: '#eceae3', borderTop: S.border }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1a1a18' }}>Subtotal soft costs</td>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1a1a18', textAlign: 'right' }}>{fm(softTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ padding: '10px 14px', background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: S.radius, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#633806', fontWeight: 500 }}>Interest reserve remaining</span>
              <span style={{ fontWeight: 600, color: '#633806' }}>{fm(INTEREST_REMAINING)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#633806' }}>Monthly bond interest ($38M @ 3.70%)</span>
              <span style={{ fontWeight: 600, color: '#633806' }}>{fm(D.MONTHLY_BOND_INTEREST)}/mo</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: '#633806' }}>Months remaining</span>
              <span style={{ fontWeight: 600, color: '#a32d2d' }}>{MONTHS_INTEREST_LEFT.toFixed(1)} months → {interestExhaustDate}</span>
            </div>
            <div style={{ height: 6, background: 'rgba(0,0,0,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${(INTEREST_REMAINING / 3341650) * 100}%`, height: '100%', background: '#E24B4A', borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 10, color: '#633806', marginTop: 4 }}>{fm(INTEREST_REMAINING)} remaining of {fm(3341650)} original interest budget</div>
          </div>

          <div style={{ border: S.border, borderRadius: S.radius, padding: '10px 14px', background: '#eceae3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>
              <span>Total cash uses remaining</span>
              <span>{fm(totalUsesRemaining)}</span>
            </div>
            <div style={{ fontSize: 11, color: '#6b6a63', marginTop: 4 }}>Hard costs + soft costs + interest reserve. HUD draws cover all of this.</div>
          </div>
        </div>

        <div>
          <SectionLabel mt={0}>Absorption scenarios — cash runway to stabilization</SectionLabel>
          <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 12 }}>
            After interest reserve exhausts (~{interestExhaustDate}), interest and operating deficits must be funded from restricted escrows.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {scenarios.map(sc => (
              <div key={sc.pace} onClick={() => setActivePace(sc.pace)} style={{
                padding: '12px 14px', borderRadius: S.radius, cursor: 'pointer',
                border: `0.5px solid ${activePace === sc.pace ? '#1a1a18' : '#e5e3db'}`,
                background: activePace === sc.pace ? '#1a1a18' : sc.surplus < 0 ? '#FCEBEB' : '#EAF3DE',
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: activePace === sc.pace ? '#fff' : '#1a1a18', marginBottom: 2 }}>{sc.pace}/mo</div>
                <div style={{ fontSize: 11, color: activePace === sc.pace ? 'rgba(255,255,255,0.7)' : '#6b6a63', marginBottom: 6 }}>{Math.ceil(sc.monthsToStab)} months · {sc.stabDate}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: activePace === sc.pace ? (sc.surplus < 0 ? '#ffaaaa' : '#aaffaa') : sc.surplus < 0 ? '#a32d2d' : '#27500A' }}>
                  {sc.surplus < 0 ? '⚠ ' : '✓ '}{sc.surplus < 0 ? `(${fm(Math.abs(sc.surplus))}) gap` : `${fm(sc.surplus)} surplus`}
                </div>
              </div>
            ))}
          </div>

          {activeScenario && (
            <>
              <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#eceae3' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>Item</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>Amount</th>
                  </tr></thead>
                  <tbody>
                    {[
                      { label: 'Months to stabilization', val: `${Math.ceil(activeScenario.monthsToStab)} months (${activeScenario.stabDate})`, color: '#1a1a18' },
                      { label: 'Total operating deficit', val: fm(activeScenario.totalOpDeficit), color: '#633806' },
                      { label: 'Interest after reserve exhausted', val: fm(activeScenario.totalInterestShortfall), color: '#a32d2d' },
                      { label: 'Total additional cash needed', val: fm(activeScenario.totalCashNeeded), color: '#a32d2d', bold: true },
                      { label: '—', val: '' },
                      { label: 'Working capital escrow', val: fm(WC_ESCROW), color: '#27500A' },
                      { label: 'Operating deficit escrow', val: fm(OP_DEFICIT_ESCROW), color: '#27500A' },
                      { label: 'Total escrows available', val: fm(activeScenario.available), color: '#27500A', bold: true },
                      { label: '—', val: '' },
                      { label: 'Surplus / (Gap)', val: activeScenario.surplus < 0 ? `(${fm(Math.abs(activeScenario.surplus))})` : fm(activeScenario.surplus), color: activeScenario.surplus < 0 ? '#a32d2d' : '#27500A', bold: true },
                    ].map((row, i) => row.label === '—' ? (
                      <tr key={i}><td colSpan={2} style={{ padding: '2px', background: '#f5f4f0', borderBottom: S.border }} /></tr>
                    ) : (
                      <tr key={i} style={{ borderBottom: S.border }}>
                        <td style={{ padding: '7px 10px', color: '#6b6a63', fontWeight: row.bold ? 600 : 400 }}>{row.label}</td>
                        <td style={{ padding: '7px 10px', color: row.color || '#1a1a18', fontWeight: row.bold ? 600 : 500, textAlign: 'right' }}>{row.val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <SectionLabel>Monthly cash flow — {activeScenario.pace} units/month scenario</SectionLabel>
              <div style={{ fontSize: 10, color: '#8f8e87', marginBottom: 8 }}>
                Blue = interest from escrow · Red = operating deficit · Green = positive NOI
              </div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 90, marginBottom: 4 }}>
                {activeScenario.monthly.slice(0, 15).map((m, i) => {
                  const maxVal = 130000
                  const noiH = Math.max(3, Math.round((Math.abs(m.noi) / maxVal) * 70))
                  const intH = Math.max(3, Math.round((m.interestShortfall / maxVal) * 70))
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      {m.interestShortfall > 0 && <div style={{ width: '90%', height: intH, background: '#378ADD', borderRadius: '2px 2px 0 0', marginBottom: 1 }} />}
                      <div style={{ width: '90%', height: noiH, background: m.noi < 0 ? '#E24B4A' : '#639922', borderRadius: m.interestShortfall > 0 ? '0' : '2px 2px 0 0' }} />
                      <div style={{ fontSize: 7, color: '#8f8e87', marginTop: 1 }}>{getMonthLabel(m.month, asOfDate)}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                {[['#378ADD','Interest (from escrow)'],['#E24B4A','Operating deficit'],['#639922','Positive NOI']].map(([c,l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, background: c, borderRadius: 2 }} />
                    <span style={{ fontSize: 10, color: '#6b6a63' }}>{l}</span>
                  </div>
                ))}
              </div>

              <div style={{ padding: '10px 14px', background: activeScenario.surplus < 0 ? '#FCEBEB' : '#EAF3DE', border: `0.5px solid ${activeScenario.surplus < 0 ? '#F09595' : '#C0DD97'}`, borderRadius: S.radius }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: activeScenario.surplus < 0 ? '#791F1F' : '#27500A', marginBottom: 4 }}>
                  {activeScenario.pace}/mo: {activeScenario.surplus < 0 ? '⚠ Gap — SLP construction guaranty backstops' : '✓ Sufficient — escrows cover all obligations'}
                </div>
                <div style={{ fontSize: 11, color: activeScenario.surplus < 0 ? '#a32d2d' : '#27500A', lineHeight: 1.5 }}>
                  {activeScenario.surplus < 0
                    ? `At ${activeScenario.pace}/mo, escrows fall short by ${fm(Math.abs(activeScenario.surplus))}. SLP obligated under construction guaranty to fund excess development costs.`
                    : `At ${activeScenario.pace}/mo, stabilization by ${activeScenario.stabDate} leaves ${fm(activeScenario.surplus)} in reserve. CO contingency ($${(CO_CONTINGENCY/1000).toFixed(0)}K) provides additional buffer.`
                  }
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
// cache bust Sat May  2 04:39:04 UTC 2026
