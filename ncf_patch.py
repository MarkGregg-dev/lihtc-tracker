with open('src/components/CapitalTab.jsx', 'r') as f:
    c = f.read()

target = "        {/* Runway model */}"

insert = """        {/* NCF dilution tracker */}
        <div style={{ border: '0.5px solid #e5e3db', borderRadius: '8px', padding: '12px 14px', marginBottom: 14, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>NCF % dilution threshold</div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: '#EAF3DE', color: '#27500A' }}>Currently 85%</span>
          </div>
          <div style={{ fontSize: 11, color: '#6b6a63', lineHeight: 1.5, marginBottom: 10 }}>
            If Investor LP Loans (AHF loans to the Partnership) ever exceed $50,000 cumulative, the NCF % permanently drops from 85%. Repaying the loan does NOT restore it. Only a Cure Payment directly to AHF does. One-way ratchet — irreversible.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>
            {[
              { label: 'Current NCF %', val: '85%', ok: true },
              { label: 'DDF %', val: '85%', ok: true },
              { label: 'Dilution trigger', val: '$50,000', ok: false },
              { label: 'Investor LP Loans', val: '$0', ok: true },
              { label: 'Headroom', val: '$50,000', ok: true },
            ].map(k => (
              <div key={k.label} style={{ background: k.ok ? '#EAF3DE' : '#FAEEDA', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: k.ok ? '#27500A' : '#633806', marginBottom: 2 }}>{k.label}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: k.ok ? '#27500A' : '#633806' }}>{k.val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: '#633806', background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: 6, padding: '6px 10px' }}>
            Never allow AHF to fund an Investor LP Loan without first exhausting SLP Special LP Loan capacity. Once $50K is crossed the dilution is permanent.
          </div>
        </div>

        {/* Runway model */}"""

if target in c:
    c = c.replace(target, insert, 1)
    with open('src/components/CapitalTab.jsx', 'w') as f:
        f.write(c)
    print('Done: NCF tracker added')
else:
    print('Target not found')
    import re
    matches = [m.start() for m in re.finditer(r'Runway model', c)]
    print('Runway model at:', matches)
