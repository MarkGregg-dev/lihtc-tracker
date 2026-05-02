import { useState, useEffect } from 'react'
import { SectionLabel, Kpi } from './ui'
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

function calcScenario(pace, asOfDate, intR, wcE, opE) {
  const unitsNeeded = STAB_TARGET - CURRENT_OCC_UNITS
  const monthsToStab = unitsNeeded / pace
  let intReserve = intR
  let totalOpDeficit = 0
  let totalInterestShortfall = 0
  const monthly = []
  for (let m = 1; m <= Math.ceil(monthsToStab) + 1; m++) {
    const progress = Math.min(m / monthsToStab, 1.0)
    const noi = -CURRENT_MONTHLY_DEFICIT + (CURRENT_MONTHLY_DEFICIT + STAB_NOI) * progress
    const intDraw = Math.min(D.MONTHLY_BOND_INTEREST, intReserve)
    intReserve = Math.max(0, intReserve - D.MONTHLY_BOND_INTEREST)
    const intShortfall = D.MONTHLY_BOND_INTEREST - intDraw
    totalInterestShortfall += intShortfall
    if (noi < 0) totalOpDeficit += Math.abs(noi)
    monthly.push({ month: m, noi: Math.round(noi), interestShortfall: Math.round(intShortfall) })
  }
  const totalCashNeeded = totalOpDeficit + totalInterestShortfall
  const available = wcE + opE
  const surplus = available - totalCashNeeded
  return { pace, monthsToStab, totalOpDeficit, totalInterestShortfall, totalCashNeeded, available, surplus, monthly, stabDate: addMonths(monthsToStab, asOfDate) }
}

function EscrowLedger({ ledger, beginning, label }) {
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

function RunwayModel({ asOfDate, intR, wcE, opE, pace }) {
  const MONTHLY_BOND_INT = 117167
  const CURRENT_DEFICIT = 23834
  const STAB_NOI_VAL = 22749
  const TOTAL_UNITS = 363
  const unitsNeeded = STAB_TARGET - CURRENT_OCC_UNITS
  const monthsToStab = unitsNeeded / pace

  function getDate(offset) {
    const d = new Date(asOfDate)
    d.setMonth(d.getMonth() + offset)
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const months = []
  let ir = intR
  let wc = wcE
  let stabilized = false

  for (let m = 1; m <= 18; m++) {
    const progress = Math.min(m / monthsToStab, 1.0)
    const occUnits = Math.min(CURRENT_OCC_UNITS + Math.round(pace * m), STAB_TARGET)
    const occPct = Math.round(occUnits / TOTAL_UNITS * 100)
    const noi = Math.round(-CURRENT_DEFICIT + (CURRENT_DEFICIT + STAB_NOI_VAL) * progress)
    const intFromReserve = Math.min(MONTHLY_BOND_INT, ir)
    ir = Math.max(0, ir - MONTHLY_BOND_INT)
    const intFromWC = MONTHLY_BOND_INT - intFromReserve
    const opFromWC = (!stabilized && noi < 0) ? Math.abs(noi) : 0
    wc = Math.max(0, wc - intFromWC - opFromWC)
    if (occUnits >= STAB_TARGET && !stabilized) stabilized = true
    const slpRequired = ir <= 0 && wc <= 0 && !stabilized
    let status, sc, sb
    if (stabilized) { status = 'Stabilized'; sc = '#27500A'; sb = '#EAF3DE' }
    else if (slpRequired) { status = 'SLP cash required'; sc = '#791F1F'; sb = '#FCEBEB' }
    else if (ir <= 0) { status = 'WC only'; sc = '#633806'; sb = '#FEF3E2' }
    else if (ir < MONTHLY_BOND_INT * 2) { status = 'Watch'; sc = '#633806'; sb = '#FAEEDA' }
    else { status = 'OK'; sc = '#27500A'; sb = '#EAF3DE' }
    months.push({ m, label: getDate(m), occPct, noi, ir: Math.max(0, ir), wc: Math.max(0, wc), slpRequired, stabilized, status, sc, sb })
    if (stabilized && m > monthsToStab + 2) break
  }

  const intExhaust = Math.ceil(intR / MONTHLY_BOND_INT)
  const slpMonth = months.find(m => m.slpRequired)
  const stabMonth = months.find(m => m.stabilized)
  const maxR = intR + wcE

  return (
    <div style={{ marginTop: 20 }}>
      <SectionLabel>Month-by-month cash runway — {pace} units/month</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8, marginBottom: 14 }}>
        <div style={{ padding: '10px 14px', background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: S.radius }}>
          <div style={{ fontSize: 11, color: '#633806', marginBottom: 2 }}>Interest reserve exhausted</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#633806' }}>{getDate(intExhaust)}</div>
          <div style={{ fontSize: 10, color: '#8f8e87', marginTop: 1 }}>Month {intExhaust}</div>
        </div>
        {slpMonth ? (
          <div style={{ padding: '10px 14px', background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: S.radius }}>
            <div style={{ fontSize: 11, color: '#791F1F', marginBottom: 2 }}>⚠ SLP cash required from</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#791F1F' }}>{slpMonth.label}</div>
            <div style={{ fontSize: 10, color: '#8f8e87', marginTop: 1 }}>Under construction guaranty</div>
          </div>
        ) : (
          <div style={{ padding: '10px 14px', background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: S.radius }}>
            <div style={{ fontSize: 11, color: '#27500A', marginBottom: 2 }}>✓ No SLP cash needed</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#27500A' }}>Reserves hold</div>
          </div>
        )}
        {stabMonth && (
          <div style={{ padding: '10px 14px', background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: S.radius }}>
            <div style={{ fontSize: 11, color: '#27500A', marginBottom: 2 }}>Stabilization — op escrow unlocks</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#27500A' }}>{stabMonth.label}</div>
            <div style={{ fontSize: 10, color: '#8f8e87', marginTop: 1 }}>${(opE/1000).toFixed(0)}K released</div>
          </div>
        )}
        <div style={{ padding: '10px 14px', background: '#eceae3', border: S.border, borderRadius: S.radius }}>
          <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 2 }}>Op deficit escrow (locked pre-stab)</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a18' }}>${(opE/1000).toFixed(0)}K</div>
          <div style={{ fontSize: 10, color: '#8f8e87', marginTop: 1 }}>Unlocks at stabilization only per LPA</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 50, marginBottom: 4 }}>
        {months.map((m, i) => {
          const total = m.ir + m.wc
          const h = Math.max(2, Math.round((total / maxR) * 46))
          const irH = Math.max(0, Math.round((m.ir / maxR) * 46))
          const wcH = h - irH
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '80%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 46 }}>
                {irH > 0 && <div style={{ height: irH, background: '#BA7517' }} />}
                {wcH > 0 && <div style={{ height: wcH, background: '#378ADD' }} />}
                {total <= 0 && !m.stabilized && <div style={{ height: 4, background: '#E24B4A', borderRadius: 2 }} />}
                {m.stabilized && <div style={{ height: 4, background: '#639922', borderRadius: 2 }} />}
              </div>
              <div style={{ fontSize: 6, color: '#8f8e87', marginTop: 1 }}>{m.label.split(' ')[0]}</div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {[['#BA7517','Interest reserve'],['#378ADD','WC escrow'],['#E24B4A','Exhausted'],['#639922','Stabilized']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, background: c, borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: '#6b6a63' }}>{l}</span>
          </div>
        ))}
      </div>

      <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#eceae3' }}>
            {['Month','Occ','NOI','Int reserve','WC escrow','Status'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {months.map((m, i) => (
              <tr key={i} style={{ borderBottom: i < months.length - 1 ? S.border : 'none', background: m.sb }}>
                <td style={{ padding: '5px 10px', fontWeight: 500, color: '#1a1a18' }}>{m.label}</td>
                <td style={{ padding: '5px 10px', color: '#1a1a18' }}>{m.occPct}%</td>
                <td style={{ padding: '5px 10px', color: m.noi < 0 ? '#a32d2d' : '#27500A', fontWeight: 500 }}>{m.noi < 0 ? '(' + fm(Math.abs(m.noi)) + ')' : fm(m.noi)}</td>
                <td style={{ padding: '5px 10px', color: m.ir < 50000 ? '#a32d2d' : '#1a1a18', fontWeight: m.ir < 50000 ? 600 : 400 }}>{m.ir <= 0 ? '—' : fm(m.ir)}</td>
                <td style={{ padding: '5px 10px', color: m.wc < 50000 && !m.stabilized ? '#a32d2d' : '#1a1a18', fontWeight: m.wc < 50000 && !m.stabilized ? 600 : 400 }}>{m.wc <= 0 && !m.stabilized ? '—' : fm(m.wc)}</td>
                <td style={{ padding: '5px 10px' }}><span style={{ fontSize: 10, fontWeight: 600, color: m.sc }}>{m.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 10, color: '#8f8e87', marginTop: 6, lineHeight: 1.5 }}>
        Operating deficit escrow (${(opE/1000).toFixed(0)}K) excluded — locked until stabilization per LPA Section 6.9(b). After reserves exhaust, SLP funds bond interest under construction guaranty as excess development costs.
      </div>
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
          {dbData.last_draw_num && ' · Draw #' + dbData.last_draw_num}
          {dbData.last_draw_date && ' (' + dbData.last_draw_date + ')'}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, marginBottom: 16 }}>
        <Kpi label="HUD draws remaining" value={fm(HUD_REMAINING)} sub="covers all construction" />
        <Kpi label="Interest reserve left" value={fm(INTEREST_REMAINING)} sub={MONTHS_INTEREST_LEFT.toFixed(1) + ' months'} warn />
        <Kpi label="Interest exhausted" value={interestExhaustDate} sub="~Jul 2026" warn />
        <Kpi label="Working capital escrow" value={fm(WC_ESCROW)} sub="restricted HUD escrow" />
        <Kpi label="Operating deficit escrow" value={fm(OP_DEFICIT_ESCROW)} sub="LOCKED until stabilization" warn />
        <Kpi label="CO contingency" value={fm(CO_CONTINGENCY)} sub="for change orders" />
        <Kpi label="Total pre-stab cushion" value={fm(WC_ESCROW + INTEREST_REMAINING)} sub="int reserve + WC only" warn />
      </div>

      <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: S.radius, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#791F1F', marginBottom: 4 }}>⚠ Pre-stabilization cash exhausts ~Jul 2026</div>
        <div style={{ fontSize: 12, color: '#a32d2d', lineHeight: 1.6 }}>
          Interest reserve ($287K, 2.5 months) exhausts ~May 2026. Working capital ($311K) then covers bond interest + ops — exhausts ~Jul 2026.
          <strong> Operating deficit escrow ($1.59M) is LOCKED until stabilization per LPA Section 6.9(b).</strong>
          After Jul 2026, SLP must fund bond interest from personal cash under the construction guaranty until stabilization unlocks the escrow.
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
                  { label: 'Working capital escrow', amount: WC_ESCROW, note: 'Available pre-stabilization', color: '#E6F1FB' },
                  { label: 'Operating deficit escrow', amount: OP_DEFICIT_ESCROW, note: 'LOCKED — post-stabilization only', color: '#FCEBEB' },
                  { label: 'CO contingency escrow', amount: CO_CONTINGENCY, note: 'Change orders only', color: '#E6F1FB' },
                  { label: 'Deferred developer fee', amount: 3506343, note: 'Non-cash — due Dec 2039', color: '#f5f4f0' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: S.border, background: row.color }}>
                    <td style={{ padding: '7px 10px', color: '#1a1a18', fontWeight: 500 }}>{row.label}</td>
                    <td style={{ padding: '7px 10px', color: '#1a1a18' }}>{fm(row.amount)}</td>
                    <td style={{ padding: '7px 10px', color: '#8f8e87', fontSize: 11 }}>{row.note}</td>
                  </tr>
                ))}
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
              <div style={{ width: (INTEREST_REMAINING / 3341650 * 100) + '%', height: '100%', background: '#E24B4A', borderRadius: 3 }} />
            </div>
          </div>

          <div style={{ border: S.border, borderRadius: S.radius, padding: '10px 14px', background: '#eceae3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>
              <span>Total cash uses remaining</span>
              <span>{fm(totalUsesRemaining)}</span>
            </div>
            <div style={{ fontSize: 11, color: '#6b6a63', marginTop: 4 }}>Hard + soft costs + interest. All covered by HUD draws.</div>
          </div>
        </div>

        <div>
          <SectionLabel mt={0}>Absorption scenarios — cash runway to stabilization</SectionLabel>
          <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 12 }}>
            Select a scenario. Op deficit escrow ($1.59M) excluded — locked until stabilization.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {scenarios.map(sc => (
              <div key={sc.pace} onClick={() => setActivePace(sc.pace)} style={{ padding: '12px 14px', borderRadius: S.radius, cursor: 'pointer', border: '0.5px solid ' + (activePace === sc.pace ? '#1a1a18' : '#e5e3db'), background: activePace === sc.pace ? '#1a1a18' : sc.surplus < 0 ? '#FCEBEB' : '#EAF3DE' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: activePace === sc.pace ? '#fff' : '#1a1a18', marginBottom: 2 }}>{sc.pace}/mo</div>
                <div style={{ fontSize: 11, color: activePace === sc.pace ? 'rgba(255,255,255,0.7)' : '#6b6a63', marginBottom: 6 }}>{Math.ceil(sc.monthsToStab)} months · {sc.stabDate}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: activePace === sc.pace ? (sc.surplus < 0 ? '#ffaaaa' : '#aaffaa') : sc.surplus < 0 ? '#a32d2d' : '#27500A' }}>
                  {sc.surplus < 0 ? '⚠ (' + fm(Math.abs(sc.surplus)) + ') gap' : '✓ ' + fm(sc.surplus) + ' surplus'}
                </div>
              </div>
            ))}
          </div>
          {activeScenario && (
            <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#eceae3' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>Item</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 500, color: '#6b6a63', borderBottom: S.border }}>Amount</th>
                </tr></thead>
                <tbody>
                  {[
                    { label: 'Months to stabilization', val: Math.ceil(activeScenario.monthsToStab) + ' months (' + activeScenario.stabDate + ')', color: '#1a1a18' },
                    { label: 'Total operating deficit', val: fm(activeScenario.totalOpDeficit), color: '#633806' },
                    { label: 'Interest after reserve exhausted', val: fm(activeScenario.totalInterestShortfall), color: '#a32d2d' },
                    { label: 'Total additional cash needed', val: fm(activeScenario.totalCashNeeded), color: '#a32d2d', bold: true },
                    { label: 'Working capital escrow', val: fm(WC_ESCROW), color: '#27500A' },
                    { label: 'Operating deficit escrow', val: fm(OP_DEFICIT_ESCROW), color: '#27500A' },
                    { label: 'Total escrows available', val: fm(activeScenario.available), color: '#27500A', bold: true },
                    { label: 'Surplus / (Gap)', val: activeScenario.surplus < 0 ? '(' + fm(Math.abs(activeScenario.surplus)) + ')' : fm(activeScenario.surplus), color: activeScenario.surplus < 0 ? '#a32d2d' : '#27500A', bold: true },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: S.border }}>
                      <td style={{ padding: '7px 10px', color: '#6b6a63', fontWeight: row.bold ? 600 : 400 }}>{row.label}</td>
                      <td style={{ padding: '7px 10px', color: row.color || '#1a1a18', fontWeight: row.bold ? 600 : 500, textAlign: 'right' }}>{row.val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <SectionLabel>Monthly NOI projection — {activePace} units/month</SectionLabel>
          <div style={{ fontSize: 10, color: '#8f8e87', marginBottom: 8 }}>Blue = interest from escrow · Red = operating deficit · Green = positive NOI</div>
          {activeScenario && (
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
          )}
        </div>
      </div>

      <RunwayModel
        asOfDate={asOfDate}
        intR={INTEREST_REMAINING}
        wcE={WC_ESCROW}
        opE={OP_DEFICIT_ESCROW}
        pace={activePace}
      />
    </div>
  )
}
