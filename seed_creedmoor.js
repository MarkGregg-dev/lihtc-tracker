// Creedmoor Apartments — Seed Script
// Run in Codespaces: node seed_creedmoor.js
// Requires: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function seed() {
  console.log('Seeding Creedmoor Apartments...')

  // 1. Insert project
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .upsert({
      name: 'Creedmoor Apartments',
      city: 'Creedmoor, TX',
      stage: 'Lease-up',
      units: 300,
      ami: [30, 40, 50, 60],
      tc_year: 2025,
      investor: 'AHP Housing Fund 365',
      lender: 'Cedar Rapids Bank and Trust',
      pm_company: 'TBD',
      alert: 'amber',
      alert_msg: 'Lease-up in progress — monitor stabilization pace',
      notes: 'CSL Creedmoor, LP · Travis County HFC bonds · Closed Jan 25, 2024 · 300 units · Creedmoor TX · Construction complete, leasing underway',
      sort_order: 2,
      total_budget: 76297227,
      bond_amount: 38800000,
      stab_deadline: '2027-02-01',
    }, { onConflict: 'name' })
    .select()
    .single()

  if (projErr) { console.error('Project error:', projErr.message); return }
  console.log('Project created:', project.id, project.name)

  const pid = project.id

  // 2. Insert draw data
  const { error: drawErr } = await supabase
    .from('draw_data')
    .upsert({
      project_id: pid,
      total_budget: 76297227,
      total_spent: 71500000,  // approximate — construction complete
      construction_budget: 48000000,
      construction_spent: 48000000,  // complete
      construction_remaining: 0,
      soft_costs_budget: 8000000,
      soft_costs_spent: 7500000,
      soft_costs_remaining: 500000,
      interest_budget: 4500000,
      interest_spent: 3800000,
      interest_remaining: 700000,
      contingency_budget: 2000000,
      contingency_spent: 800000,
      contingency_remaining: 1200000,
      change_orders: [],
      draw_log: [
        { draw: 1, amount: 4000000, date: '2024-01-25', status: 'Funded', description: 'Initial closing draw' },
        { draw: 2, amount: 2205644, date: '2024-06-15', status: 'Funded', description: '60% construction complete' },
        { draw: 3, amount: 9992845, date: '2024-09-01', status: 'Funded', description: '70% construction complete' },
        { draw: 4, amount: 6484976, date: '2025-02-01', status: 'Funded', description: '80% construction complete' },
        { draw: 5, amount: 3877950, date: '2025-11-01', status: 'Funded', description: '95% construction complete' },
      ],
    }, { onConflict: 'project_id' })

  if (drawErr) console.error('Draw error:', drawErr.message)
  else console.log('Draw data inserted')

  // 3. Insert LPA data
  const { error: lpaErr } = await supabase
    .from('lpa_data')
    .upsert({
      project_id: pid,
      // Capital contributions
      ahf_total_equity: 30550569,
      first_cc_amount: 26561515,
      second_cc_amount: 1100000,
      second_cc_date: '2026-01-15',
      third_cc_amount: 2289054,
      third_cc_date: '2026-04-01',
      fourth_cc_amount: 600000,
      // Credit data
      projected_annual_credits: 3637700,
      projected_total_credits: 36377000,
      credit_price: 0.84,
      certified_credit_base: 36369725,
      fy_first_threshold: 1363865,    // FY2025
      fy_subsequent_threshold: 3636972, // FY2026+
      late_delivery_rate: 0.60,
      // Deadlines
      all_pis_deadline: '2026-03-31',
      stabilization_deadline: '2027-02-01',
      // Bonus depreciation
      bonus_depr_2025_required: 10,  // ALL 10 buildings by Dec 31 2025
      bonus_depr_2025_rate: 0.40,
      // Key dates
      closing_date: '2024-01-25',
      state_designation_year: 2024,
      // Parties
      general_partner: 'TCC Hill Country Development Corporation',
      slp: 'CSL Creedmoor Partners, LLC',
      ahf_entity: 'AHP Housing Fund 365, LLC',
      bond_issuer: 'Travis County Housing Finance Corporation',
      bond_trustee: 'BOKF, NA',
      bond_lender: 'Cedar Rapids Bank and Trust Company',
      // Reporting penalties
      reporting_penalty_per_day: 250,
    }, { onConflict: 'project_id' })

  if (lpaErr) console.error('LPA error:', lpaErr.message)
  else console.log('LPA data inserted')

  // 4. Insert leasing snapshot (placeholder — update when first rent roll arrives)
  const { error: leasingErr } = await supabase
    .from('leasing_snapshots')
    .insert({
      project_id: pid,
      total_units: 300,
      occupied: 0,
      physical_occupancy: 0,
      economic_occupancy: 0,
      monthly_absorption: 0,
      is_current: true,
      as_of_date: new Date().toISOString().split('T')[0],
      notes: 'Initial placeholder — update with first rent roll from PM',
    })

  if (leasingErr && !leasingErr.message.includes('duplicate'))
    console.error('Leasing error:', leasingErr.message)
  else console.log('Leasing snapshot inserted')

  // 5. Insert document folder structure
  const folders = [
    // Bond documents
    { folder: 'A. Bond Documents', name: 'Trust Indenture', doc_type: 'executed', file_name: '01.03 Indenture of Trust.pdf', sort_order: 1 },
    { folder: 'A. Bond Documents', name: 'Loan Agreement', doc_type: 'executed', file_name: '01.07 Loan Agreement.pdf', sort_order: 2 },
    { folder: 'A. Bond Documents', name: 'Promissory Note (Tax-Exempt)', doc_type: 'executed', file_name: '01.08 Promissory Note.pdf', sort_order: 3 },
    { folder: 'A. Bond Documents', name: 'Regulatory Agreement', doc_type: 'executed', file_name: '01.09 Regulatory Agreement.pdf', sort_order: 4 },
    { folder: 'A. Bond Documents', name: 'Ground Lease', doc_type: 'executed', file_name: '01.10 Ground Lease - Creedmoor.pdf', sort_order: 5 },
    // Construction & Perm Loan
    { folder: 'B. Loan Documents', name: 'Promissory Note (Taxable)', doc_type: 'executed', file_name: '02.14 Promissory Note (Taxable).pdf', sort_order: 1 },
    { folder: 'B. Loan Documents', name: 'Continuing Covenants Agreement', doc_type: 'executed', file_name: '02.15 Continuing Covenants Agreement.pdf', sort_order: 2 },
    { folder: 'B. Loan Documents', name: 'Deed of Trust (Tax-Exempt)', doc_type: 'executed', file_name: '02.16 Deed of Trust (Tax-Exempt).pdf', sort_order: 3 },
    { folder: 'B. Loan Documents', name: 'Deed of Trust (Taxable)', doc_type: 'executed', file_name: '02.17 Deed of Trust (Taxable).pdf', sort_order: 4 },
    { folder: 'B. Loan Documents', name: 'Disbursing Agreement', doc_type: 'executed', file_name: '02.19 Disbursing Agreement.pdf', sort_order: 5 },
    { folder: 'B. Loan Documents', name: 'Replacement Reserve Agreement', doc_type: 'executed', file_name: '02.29 Replacement Reserve and Security Agreement.pdf', sort_order: 6 },
    // Guaranties
    { folder: 'C. Guaranties', name: 'Repayment and Completion Guaranty (Streamline)', doc_type: 'executed', file_name: '02.21a Repayment and Completion Guaranty (Streamline).pdf', sort_order: 1 },
    { folder: 'C. Guaranties', name: 'Repayment and Completion Guaranty (Joel Pollack)', doc_type: 'executed', file_name: '02.21b Repayment and Completion Guaranty (Joel Pollack).pdf', sort_order: 2 },
    { folder: 'C. Guaranties', name: 'Non-Recourse Carve-Out Guaranty (Mark Gregg)', doc_type: 'executed', file_name: '02.22c Guaranty of Non-Recourse Carve-Outs (Mark Gregg).pdf', sort_order: 3 },
    // Equity
    { folder: 'D. Equity', name: 'Amended and Restated Partnership Agreement (LPA)', doc_type: 'executed', file_name: 'Creedmoor - AMENDED AND RESTATED PARTNERSHIP AGREEMENT - signed.pdf', sort_order: 1 },
    { folder: 'D. Equity', name: 'Assignment of Partnership Interests', doc_type: 'executed', file_name: '02.23 Assignment of Partnership Interests.pdf', sort_order: 2 },
    // Swap
    { folder: 'E. Swap Documents', name: 'Swap Leasehold Deed of Trust', doc_type: 'executed', file_name: '03.34 Swap Leasehold Deed of Trust.pdf', sort_order: 1 },
    { folder: 'E. Swap Documents', name: 'Swap Unlimited Continuing Guaranty (Streamline)', doc_type: 'executed', file_name: '03.36a Swap Unlimited Continuing Guaranty (Streamline).pdf', sort_order: 2 },
    // Monthly reports
    { folder: 'Monthly Reports', name: 'Draw Schedule', doc_type: 'draw-schedule', file_name: 'Creedmoor_Draw_Schedule.xlsx', sort_order: 1 },
  ]

  const docs = folders.map(d => ({ ...d, project_id: pid, storage_path: null, file_size: null, notes: '' }))
  const { error: docsErr } = await supabase.from('documents').insert(docs)
  if (docsErr) console.error('Docs error:', docsErr.message)
  else console.log(`${docs.length} document records inserted`)

  console.log('\nCreedmoor seed complete!')
  console.log('Project ID:', pid)
  console.log('\nNext steps:')
  console.log('1. Upload closing binder PDFs to Supabase Storage under:', pid)
  console.log('2. Get first rent roll from PM and upload via Leasing Performance tab')
  console.log('3. Update PM company name once confirmed')
  console.log('4. Confirm actual draw amounts with Roxanne')
}

seed().catch(console.error)
