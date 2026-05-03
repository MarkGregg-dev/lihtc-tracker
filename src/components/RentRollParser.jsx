import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { Btn } from './ui'

export function RentRollParser({ projectId, onParsed }) {
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setParsing(true)
    setError(null)
    setResult(null)

    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

      // Extract period from header
      let period = null
      let periodDate = null
      for (const row of rows.slice(0, 5)) {
        for (const cell of row) {
          if (cell && String(cell).includes('Month Year =')) {
            const match = String(cell).match(/(\d{2})\/(\d{4})/)
            if (match) {
              period = `${match[2]}-${match[1]}`
              periodDate = `${match[2]}-${match[1]}-01`
            }
          }
        }
      }

      // Find header row
      let headerRow = -1
      for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].some(c => c && String(c).includes('Unit Type'))) {
          headerRow = i
          break
        }
      }

      // Parse units
      const units = []
      const buildingData = {}
      const unitTypeData = {}

      for (let i = headerRow + 2; i < rows.length; i++) {
        const row = rows[i]
        if (!row || !row[0]) continue
        const unitNum = String(row[0]).trim()
        if (!unitNum || !/^\d+/.test(unitNum)) continue

        const building = String(row[1] || '').trim()
        const unitType = String(row[2] || '').trim()
        const sqft = parseFloat(row[3]) || 0
        const residentId = String(row[4] || '').trim()
        const marketRent = parseFloat(row[6]) || 0
        const actualRent = parseFloat(row[7]) || 0
        const moveIn = row[10]
        const leaseExp = row[11]
        const balance = parseFloat(row[13]) || 0
        const isVacant = residentId.toUpperCase() === 'VACANT' || !residentId

        units.push({ unit: unitNum, building, unitType, sqft, isVacant, marketRent, actualRent, balance, moveIn, leaseExp })

        // Building rollup
        if (!buildingData[building]) buildingData[building] = { total: 0, occupied: 0, marketRent: 0, actualRent: 0 }
        buildingData[building].total++
        buildingData[building].marketRent += marketRent
        if (!isVacant) { buildingData[building].occupied++; buildingData[building].actualRent += actualRent }

        // Unit type rollup
        if (!unitTypeData[unitType]) unitTypeData[unitType] = { total: 0, occupied: 0, marketRent: 0 }
        unitTypeData[unitType].total++
        unitTypeData[unitType].marketRent += marketRent
        if (!isVacant) unitTypeData[unitType].occupied++
      }

      const totalUnits = units.length
      const occupiedUnits = units.filter(u => !u.isVacant).length
      const vacantUnits = totalUnits - occupiedUnits
      const occupancyPct = totalUnits > 0 ? Math.round(occupiedUnits / totalUnits * 1000) / 10 : 0
      const actualRentCollected = units.reduce((a, u) => a + u.actualRent, 0)
      const grossPotentialRent = units.reduce((a, u) => a + u.marketRent, 0)
      const delinquency = units.reduce((a, u) => a + (u.balance > 0 ? u.balance : 0), 0)

      const snapshot = {
        project_id: projectId,
        period,
        period_date: periodDate,
        total_units: totalUnits,
        occupied_units: occupiedUnits,
        vacant_units: vacantUnits,
        occupancy_pct: occupancyPct,
        gross_potential_rent: grossPotentialRent,
        actual_rent_collected: actualRentCollected,
        vacancy_loss: -(grossPotentialRent - actualRentCollected),
        delinquency,
        building_data: buildingData,
        unit_type_data: unitTypeData,
      }

      // Upsert to Supabase
      const { error: dbErr } = await supabase
        .from('monthly_snapshots')
        .upsert(snapshot, { onConflict: 'project_id,period' })

      if (dbErr) throw new Error(dbErr.message)

      setResult({ period, totalUnits, occupiedUnits, vacantUnits, occupancyPct, actualRentCollected, delinquency })
      if (onParsed) onParsed(snapshot)

    } catch (err) {
      setError(err.message)
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div style={{ background: '#eceae3', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', marginBottom: 4 }}>Upload rent roll</div>
      <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 8 }}>Excel rent roll from Yardi/Sandalwood — updates occupancy, building breakdown, and unit mix automatically.</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} disabled={parsing} style={{ fontSize: 12 }} />
        {parsing && <span style={{ fontSize: 12, color: '#633806' }}>Parsing rent roll...</span>}
      </div>
      {error && <div style={{ marginTop: 8, padding: '6px 10px', background: '#FCEBEB', borderRadius: 6, fontSize: 11, color: '#a32d2d' }}>Error: {error}</div>}
      {result && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#EAF3DE', borderRadius: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#27500A', marginBottom: 4 }}>Parsed {result.period} — {result.occupancyPct}% occupied ({result.occupiedUnits}/{result.totalUnits} units)</div>
          <div style={{ fontSize: 11, color: '#27500A' }}>Actual rent: ${Math.round(result.actualRentCollected).toLocaleString()} · Delinquency: ${Math.round(result.delinquency).toLocaleString()}</div>
        </div>
      )}
    </div>
  )
}
