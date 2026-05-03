import { useState, useRef } from 'react'

export function FinancialsParser({ projectId, onParsed }) {
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
      // Read file as base64
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })

      console.log('Sending base64 length:', base64.length)

      const response = await fetch('/api/parse-financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          mediaType: 'application/pdf',
          project_id: projectId
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error('Server error ' + response.status + ': ' + errText.substring(0, 200))
      }

      const parsed = await response.json()
      if (!parsed.success) throw new Error(parsed.error || 'Parse failed — check Vercel logs')

      setResult(parsed)
      if (onParsed) onParsed(parsed)

    } catch (err) {
      setError(err.message)
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div style={{ background: '#eceae3', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', marginBottom: 4 }}>Upload Sandalwood monthly report</div>
      <div style={{ fontSize: 11, color: '#6b6a63', marginBottom: 8 }}>
        Upload the monthly PDF — extracts P&L, NOI, budget variance, and occupancy. Takes ~20 seconds.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} disabled={parsing} style={{ fontSize: 12 }} />
        {parsing && <span style={{ fontSize: 12, color: '#633806' }}>Reading report (~20 seconds)...</span>}
      </div>
      {error && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: '#FCEBEB', borderRadius: 6, fontSize: 11, color: '#a32d2d' }}>
          Error: {error}
        </div>
      )}
      {result && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#EAF3DE', borderRadius: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#27500A', marginBottom: 4 }}>
            Parsed {result.period} successfully
          </div>
          {result.noi != null && (
            <div style={{ fontSize: 11, color: '#27500A' }}>
              NOI: <strong style={{ color: result.noi < 0 ? '#a32d2d' : '#27500A' }}>${Math.abs(Math.round(result.noi)).toLocaleString()}</strong>
              {result.occupancy_pct && <span> · Occupancy: <strong>{result.occupancy_pct}%</strong></span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
