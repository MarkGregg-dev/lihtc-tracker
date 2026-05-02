import { useState, useEffect } from 'react'
import { SectionLabel, Kpi, Bar } from './ui'
import { DrawParser } from './DrawParser'
import { supabase } from '../lib/supabase'

const S = { border: '0.5px solid #e5e3db', radius: '8px' }
const fm = (v) => v == null ? '—' : '$' + Math.abs(Math.round(v)).toLocaleString()

const HARD_COSTS = [
  { label: 'NRP Construction', amount: 2900780, source: 'HUD draws' },
  { label: 'Waterproof Testing', amount: 100000, source: 'HUD draws' },
  { label: 'Connection Fees', amount: 81907, source: 'HUD draws' },
  { label: 'Radon Testing', amount: 20000, source: 'HUD draws' },
  { label: 'As-Built Survey', amount: 25000, source: 'HUD draws' },
]

const SOFT_COSTS = [
  { label: 'Other Fees / Contingency', amount: 523386, source: 'HUD draws' },
  { label: 'SMHA Tax Savings', amount: 218282, source: 'HUD draws' },
  { label: 'Construction Consultant', amount: 142693, source: 'HUD draws' },
  { label: 'HUD MIP', amount: 132500, source: 'HUD draws' },
  { label: 'Other Fees - NRP', amount: 130000, source: 'HUD draws' },
  { label: 'HUD MIP', amount: 132500, source: 'HUD draws' },
  { label: 'Materials Testing', amount: 54684, source: 'HUD draws' },
  { label: 'Gershman Third Party', amount: 54833, source: 'HUD draws' },
  { label: 'FF&E', amount: 52913, source: 'HUD draws' },
  { label: 'Betco & JGR Consulting', amount: 47500, source: 'HUD draws' },
  { label: 'Title & Recording', amount: 32250, source: 'HUD draws' },
  { label: 'Health & Human Services', amount: 29000, source: 'HUD draws' },
  { label: 'Architect & Civil', amount: 25177, source: 'HUD draws' },
  { label: 'LIHTC Legal', amount: 23495, source: 'HUD draws' },
  { label: 'Building Plan Review', amount: 21725, source: 'HUD draws' },
  { label: 'Architect/Landscape Supervision', amount: 16541, source: 'HUD draws' },
  { label: 'Accounting', amount: 14861, source: 'HUD draws' },
  { label: 'Tax Credit Fees', amount: 8390, source: 'HUD draws' },
  { label: 'Insurance (remaining)', amount: 7430, source: 'HUD draws' },
  { label: 'TEFRA', amount: 5850, source: 'HUD draws' },
  { label: 'Verification Agent', amount: 3500, source: 'HUD draws' },
  { label: 'TBRB', amount: 17500, source: 'HUD draws' },
  { label: 'Texas AG Office', amount: 9500, source: 'HUD draws' },
  { label: 'Printing', amount: 4500, source: 'HUD draws' },
]

// De-duplicate HUD MIP

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
const SOFT_DEDUPED = SOFT_COSTS.filter((item, idx, arr) =>
  arr.findIndex(x => x.label === item.label) === idx
)

const INTEREST_REMAINING = 287384
const MONTHLY_BOND_INTEREST = 117167
const MONTHS_INTEREST_LEFT = INTEREST_REMAINING / MONTHLY_BOND_INTEREST

const WC_ESCROW = 311086
const OP_DEFICIT_ESCROW = 1590000
const CO_CONTINGENCY = 693838
const HUD_REMAINING = 4815030
const EQUITY_REMAINING = 120000

const CURRENT_OCC_UNITS = 63
const STAB_TARGET = 326
const CURRENT_MONTHLY_DEFICIT = 23834
const STAB_NOI = 22749

function addMonths(n) {
  const d = new Date('2026-04-22')
  d.setMonth(d.getMonth() + Math.round(n))
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function calcScenario(pace) {
  const unitsNeeded = STAB_TARGET - CURRENT_OCC_UNITS
  const monthsToStab = unitsNeeded / pace
  let interestReserve = INTEREST_REMAINING
  let totalOpDeficit = 0
  let totalInterestShortfall = 0
  const monthly = []

  for (let m = 1; m <= Math.ceil(monthsToStab) + 1; m++) {
    const progress = Math.min(m / monthsToStab, 1.0)
    const noi = -CURRENT_MONTHLY_DEFICIT + (CURRENT_MONTHLY_DEFICIT + STAB_NOI) * progress

    // Interest
    const interestDraw = Math.min(MONTHLY_BOND_INTEREST, interestReserve)
    interestReserve = Math.max(0, interestReserve - MONTHLY_BOND_INTEREST)
    const interestShortfall = MONTHLY_BOND_INTEREST - interestDraw
    totalInterestShortfall += interestShortfall

    if (noi < 0) totalOpDeficit += Math.abs(noi)
    monthly.push({ month: m, noi: Math.round(noi), interestShortfall: Math.round(interestShortfall), interestReserve: Math.max(0, interestReserve) })
  }

  const totalCashNeeded = totalOpDeficit + totalInterestShortfall
  const available = WC_ESCROW + OP_DEFICIT_ESCROW
  const surplus = available - totalCashNeeded

  return { pace, monthsToStab, totalOpDeficit, totalInterestShortfall, totalCashNeeded, available, surplus, monthly, stabDate: addMonths(monthsToStab) }
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
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>{label}</span>
          <span style={{ fontSize: 11, color: '#6b6a63' }}>Beginning: {fm(beginning)}</span>
          <span style={{ fontSize: 11, color: '#633806', fontWeight: 500 }}>Released: {fm(totalReleased)} ({pctUsed}%)</span>
          <span style={{ fontSize: 11, color: currentBalance < beginning * 0.3 ? '#a32d2d' : '#27500A', fontWeight: 600 }}>Balance: {fm(currentBalance)}</span>
        </div>
        <span style={{ fontSize: 10, color: '#8f8e87', transform: expanded ? 'none' : 'rotate(-90deg)', transition: 'transform .2s' }}>▼</span>
      </div>
      <div style={{ padding: '6px 12px 2px', background: '#fff' }}>
        <div style={{ height: 5, background: '#e5e3db', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ width: pctUsed + '%', height: '100%', background: pctUsed > 70 ? '#E24B4A' : '#378ADD', borderRadius: 3 }} />
        </div>
      </div>
      {expanded && displayLedger.length > 0 && (
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
      {expanded && displayLedger.length === 0 && (
        <div style={{ padding: '8px 12px', fontSize: 11, color: '#8f8e87' }}>No transactions yet — upload draw spreadsheet to populate.</div>
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

  // Use DB data if available, otherwise fall back to hardcoded defaults
  const INTEREST_REMAINING = dbData?.interest_remaining ?? DEFAULTS.INTEREST_REMAINING
  const MONTHLY_BOND_INTEREST = DEFAULTS.MONTHLY_BOND_INTEREST
  const WC_ESCROW = dbData?.wc_escrow ?? DEFAULTS.WC_ESCROW
  const CO_CONTINGENCY = dbData?.co_contingency ?? DEFAULTS.CO_CONTINGENCY
  const OP_DEFICIT_ESCROW = dbData?.op_deficit_escrow ?? DEFAULTS.OP_DEFICIT_ESCROW
  const HUD_REMAINING = dbData?.hud_remaining ?? DEFAULTS.HUD_REMAINING
  const EQUITY_REMAINING = dbData?.equity_remaining ?? DEFAULTS.EQUITY_REMAINING
  const MONTHS_INTEREST_LEFT = INTEREST_REMAINING / MONTHLY_BOND_INTEREST
  const wcLedger = dbData?.wc_ledger || WC_LEDGER
  const coLedger = dbData?.co_ledger || CO_LEDGER

  // Use line items from DB if available
  const dbLineItems = dbData?.line_items || []
  const dynamicHardCosts = dbLineItems.filter(l =>
    ['nrp construction','waterproof','connection fee','radon','as-built','soil boring'].some(t => l.label.toLowerCase().includes(t)) && l.remaining > 0
  )
  const dynamicSoftCosts = dbLineItems.filter(l =>
    !['nrp construction','waterproof','connection fee','radon','as-built','soil boring','interest','deferred','operating deficit','working capital','equity','gershman','total'].some(t => l.label.toLowerCase().includes(t)) && l.remaining > 0
  )
  const displayHardCosts = dynamicHardCosts.length > 0 ? dynamicHardCosts.map(l => ({ label: l.label, amount: l.remaining })) : HARD_COSTS
  const displaySoftCosts = dynamicSoftCosts.length > 0 ? dynamicSoftCosts.map(l => ({ label: l.label, amount: l.remaining })) : SOFT_DEDUPED

  const hardTotal = displayHardCosts.reduce((a, c) => a + c.amount, 0)
  const softTotal = displaySoftCosts.reduce((a, c) => a + c.amount, 0)
  const totalUsesRemaining = hardTotal + softTotal + INTEREST_REMAINING
  const scenarios = [15, 22, 30].map(calcScenario)
  const activeScenario = scenarios.find(s => s.pace === activePace)

  const interestExhaustDate = addMonths(MONTHS_INTEREST_LEFT)

  return (
    <div>
      {/* Upload parser */}
      <DrawParser projectId={project?.id} onParsed={(d) => setDbData(d)} />
      {dbData?.updated_at && (
        <div style={{ fontSize: 11, color: '#8f8e87', marginBottom: 10 }}>
          Last updated from draw spreadsheet: {new Date(dbData.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {dbData.last_draw_num && ` · Draw #${dbData.last_draw_num}`}
          {dbData.last_draw_date && ` (${dbData.last_draw_date})`}
        </div>
      )}
      {/* Top KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, marginBottom: 16 }}>
        <Kpi label="HUD draws remaining" value={fm(HUD_REMAINING)} sub="covers all construction" />
        <Kpi label="Interest reserve left" value={fm(INTEREST_REMAINING)} sub={`${MONTHS_INTEREST_LEFT.toFixed(1)} months`} warn />
        <Kpi label="Interest reserve exhausted" value={interestExhaustDate} sub="~Jul 2026" warn />
        <Kpi label="Working capital escrow" value={fm(WC_ESCROW)} sub="restricted HUD escrow" />
        <Kpi label="Operating deficit escrow" value={fm(OP_DEFICIT_ESCROW)} sub="restricted HUD escrow" />
        <Kpi label="CO contingency" value={fm(CO_CONTINGENCY)} sub="for change orders" />
        <Kpi label="Total escrow cushion" value={fm(WC_ESCROW + OP_DEFICIT_ESCROW)} sub="for interest + ops" warn />
      </div>

      {/* Interest reserve warning */}
      <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: S.radius, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#791F1F', marginBottom: 4 }}>⚠ Interest reserve is the critical risk</div>
        <div style={{ fontSize: 12, color: '#a32d2d', lineHeight: 1.6 }}>
          Bond interest is $38M × 3.70% = <strong>${MONTHLY_BOND_INTEREST.toLocaleString()}/month</strong>. 
          Only <strong>${INTEREST_REMAINING.toLocaleString()}</strong> remains in the interest reserve — approximately <strong>{MONTHS_INTEREST_LEFT.toFixed(1)} months</strong> ({interestExhaustDate}). 
          After that, interest must be funded from the working capital escrow ($311K) and operating deficit escrow ($1.59M). 
          At 22 units/month you have a <strong>$721K surplus</strong>. At 15 units/month you have a <strong>$15K gap</strong> — essentially breakeven and the SLP construction guaranty backstops any shortfall.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* LEFT — Sources & Uses */}
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
          <EscrowLedger ledger={wcLedger} beginning={1060000} label="Working capital" />

          <SectionLabel>CO contingency escrow — transaction history</SectionLabel>
          <EscrowLedger ledger={coLedger} beginning={1060000} label="CO contingency" />

          <SectionLabel>Hard costs remaining — paid from HUD draws</SectionLabel>
          <div style={{ border: S.border, borderRadius: S.radius, overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <tbody>
                {displayHardCosts.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < HARD_COSTS.length - 1 ? S.border : 'none' }}>
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
              <span style={{ fontWeight: 600, color: '#633806' }}>{fm(MONTHLY_BOND_INTEREST)}/mo</span>
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

        {/* RIGHT — Scenarios */}
        <div>
          <SectionLabel mt={0}>Absorption scenarios — cash runway to stabilization</SectionLabel>
          <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 12 }}>
            After interest reserve exhausts (~Jul 2026), interest and operating deficits must be funded from restricted escrows. Select a scenario to see monthly detail.
          </div>

          {/* Scenario selector */}
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

          {/* Active scenario detail */}
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
                      { label: '—', val: '', color: '#e5e3db' },
                      { label: 'Working capital escrow', val: fm(WC_ESCROW), color: '#27500A' },
                      { label: 'Operating deficit escrow', val: fm(OP_DEFICIT_ESCROW), color: '#27500A' },
                      { label: 'Total escrows available', val: fm(activeScenario.available), color: '#27500A', bold: true },
                      { label: '—', val: '', color: '#e5e3db' },
                      { label: 'Surplus / (Gap)', val: activeScenario.surplus < 0 ? `(${fm(Math.abs(activeScenario.surplus))})` : fm(activeScenario.surplus), color: activeScenario.surplus < 0 ? '#a32d2d' : '#27500A', bold: true },
                    ].map((row, i) => row.label === '—' ? (
                      <tr key={i}><td colSpan={2} style={{ padding: '2px', background: '#f5f4f0', borderBottom: S.border }} /></tr>
                    ) : (
                      <tr key={i} style={{ borderBottom: S.border }}>
                        <td style={{ padding: '7px 10px', color: '#6b6a63', fontWeight: row.bold ? 600 : 400 }}>{row.label}</td>
                        <td style={{ padding: '7px 10px', color: row.color, fontWeight: row.bold ? 600 : 500, textAlign: 'right' }}>{row.val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <SectionLabel>Monthly cash flow — {activeScenario.pace} units/month scenario</SectionLabel>
              <div style={{ fontSize: 10, color: '#8f8e87', marginBottom: 8 }}>
                Blue = interest reserve funded by escrow · Red = operating deficit · Green = positive NOI
              </div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 90, marginBottom: 4 }}>
                {activeScenario.monthly.slice(0, 15).map((m, i) => {
                  const maxVal = 130000
                  const noiH = Math.max(3, Math.round((Math.abs(m.noi) / maxVal) * 70))
                  const intH = Math.max(3, Math.round((m.interestShortfall / maxVal) * 70))
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      {m.interestShortfall > 0 && (
                        <div style={{ width: '90%', height: intH, background: '#378ADD', borderRadius: '2px 2px 0 0', marginBottom: 1 }} />
                      )}
                      <div style={{ width: '90%', height: noiH, background: m.noi < 0 ? '#E24B4A' : '#639922', borderRadius: m.interestShortfall > 0 ? '0' : '2px 2px 0 0' }} />
                      <div style={{ fontSize: 7, color: '#8f8e87', marginTop: 1 }}>M{m.month}</div>
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
                  {activeScenario.pace}/mo scenario: {activeScenario.surplus < 0 ? '⚠ Gap — SLP construction guaranty backstops' : '✓ Sufficient — escrows cover all obligations'}
                </div>
                <div style={{ fontSize: 11, color: activeScenario.surplus < 0 ? '#a32d2d' : '#27500A', lineHeight: 1.5 }}>
                  {activeScenario.surplus < 0
                    ? `At ${activeScenario.pace} units/month, escrows fall short by ${fm(Math.abs(activeScenario.surplus))}. SLP is obligated under the construction guaranty to fund excess development costs. Operating deficit escrow ($1.59M) + working capital ($311K) = $1.90M covers most of the $${(activeScenario.totalCashNeeded/1000).toFixed(0)}K needed.`
                    : `At ${activeScenario.pace} units/month, stabilization by ${activeScenario.stabDate} leaves ${fm(activeScenario.surplus)} in reserve after covering all interest and operating deficits. CO contingency ($${(CO_CONTINGENCY/1000).toFixed(0)}K) provides additional buffer for change orders.`
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
