// seed.js — run once with: node seed.js
// Populates your Supabase database with Centerpoint Depot data
// Prerequisites: npm install @supabase/supabase-js dotenv

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // use service role key for seed (bypasses RLS)
)

async function seed() {
  console.log('Seeding Centerpoint Depot...')

  // 1. Insert project
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .insert({
      name: 'Centerpoint Depot',
      alias: ['centerpoint', 'tapestry centerpoint', '306'],
      city: 'San Marcos, TX',
      stage: 'Lease-up',
      units: 363,
      ami: [30, 60],
      mix: {
        'A 30% AMI': 24, 'B 30% AMI': 11, 'C 30% AMI': 15, 'D 30% AMI': 5,
        'A 60% AMI': 60, 'B 60% AMI': 138, 'C 60% AMI': 88, 'D 60% AMI': 21, 'Model': 1
      },
      alert: 'red',
      alert_msg: '17.4% occupied — 63/362 leasable units (Apr 22)',
      tc_year: 2023,
      investor: 'AHP / Raymond James',
      lender: 'Gershman FHA ($53M)',
      pm_company: 'Sandalwood Management',
      notes: '363 units (362 leasable + 1 model). Early lease-up — 17.4% occupied Apr 22. 30% AMI: 25/55 (45%). 60% AMI: 38/307 (12%). B-60 and C-60 are primary absorption gap.',
      sort_order: 1,
    })
    .select()
    .single()

  if (pErr) { console.error('Project insert failed:', pErr); return }
  const pid = project.id
  console.log(`Project created: ${pid}`)

  // 2. Draw data
  const { error: dErr } = await supabase.from('draw_data').insert({
    project_id: pid,
    total_budget: 88487352,
    total_spent: 79580690,
    construction_budget: 52108701,
    construction_spent: 49207921,
    construction_remaining: 2900780,
    working_capital_start: 1060000,
    working_capital_remaining: 311086,
    co_contingency_start: 1060000,
    co_contingency_remaining: 693838,
    draw_count: 24,
    last_draw_num: 24,
    gc_target: 'Q4 2025',
    lease_target: 'Q1 2026',
    change_orders: [
      { num: 2, desc: 'HUD Time Extension', amount: 56420, date: 'Dec 2024' },
      { num: 3, desc: 'General conditions', amount: 41355, date: 'Jan 2025' },
      { num: 4, desc: 'Water Line', amount: 3640, date: 'Jan 2025' },
      { num: 6, desc: 'General conditions', amount: 24467, date: 'Jan 2025' },
      { num: 7, desc: 'HUD Time Extension', amount: 26155, date: 'Jan 2025' },
      { num: 8, desc: 'Moisture Barrier', amount: 111664, date: 'Jan 2025' },
      { num: 10, desc: 'Water Line', amount: 20020, date: 'Feb 2025' },
      { num: 12, desc: '', amount: 10920, date: 'Apr 2025' },
      { num: 14, desc: '', amount: 27300, date: 'Apr 2025' },
      { num: 16, desc: '', amount: 34580, date: 'Apr 2025' },
      { num: 17, desc: '', amount: 6000, date: 'Apr 2025' },
    ],
    equity_schedule: [
      { label: 'Close (1.0)', amount: 6303140, status: 'funded', date: 'Jul 2024' },
      { label: '60% complete', amount: 5178474, status: 'funded', date: 'Oct 2024' },
      { label: '70% complete', amount: 8132769, status: 'funded', date: 'Jan 2025' },
      { label: '80% complete', amount: 4413994, status: 'pending', date: 'TBD' },
      { label: '90% complete', amount: 3438553, status: 'pending', date: 'TBD' },
      { label: '2nd contribution', amount: 100000, status: 'pending', date: 'No earlier than Jun 1 2026' },
      { label: '3rd contribution', amount: 3348772, status: 'pending', date: 'No earlier than Jan 15 2027' },
      { label: '4th contribution', amount: 600000, status: 'pending', date: 'No earlier than Jun 1 2027' },
    ],
  })
  if (dErr) console.error('Draw data failed:', dErr)
  else console.log('Draw data inserted')

  // 3. Leasing snapshot
  const { error: lErr } = await supabase.from('leasing_snapshots').insert({
    project_id: pid,
    report_month: 'April 22, 2026 (rent roll)',
    snapshot_date: '2026-04-22',
    total_units: 362,
    occupied: 63,
    vacant_unrented: 299,
    vacant_rented_ready: 0,
    physical_occupancy: 17.4,
    gpr: 457444,
    vacancy_loss: 416705,
    concessions: 5875,
    net_rental_income: 33288,
    total_income: 35320,
    total_expenses: 59154,
    noi: -23834,
    noi_budget: -64934,
    ytd_noi: -99610,
    ytd_noi_budget: -122521,
    cash_operating: 83079,
    cash_reserves: 750000,
    cash_op_reserve: 1590000,
    cash_soft_cost: 1812218,
    ami30_total: 55, ami30_occ: 25,
    ami60_total: 307, ami60_occ: 38,
    unit_mix_detail: [
      { type: 'A-30', label: 'A 30% AMI', total: 24, occ: 12, rent: 683 },
      { type: 'B-30', label: 'B 30% AMI', total: 11, occ: 6, rent: 812 },
      { type: 'C-30', label: 'C 30% AMI', total: 15, occ: 3, rent: 933 },
      { type: 'D-30', label: 'D 30% AMI', total: 5, occ: 4, rent: 1033 },
      { type: 'A-60', label: 'A 60% AMI', total: 60, occ: 27, rent: 995 },
      { type: 'B-60', label: 'B 60% AMI', total: 138, occ: 8, rent: 1295 },
      { type: 'C-60', label: 'C 60% AMI', total: 88, occ: 3, rent: 1495 },
      { type: 'D-60', label: 'D 60% AMI', total: 21, occ: 0, rent: 1995 },
    ],
    delinquency: [
      { unit: '1205', name: 'Thenathus Howard', balance: 1094.24 },
      { unit: '10218', name: 'Nazarene Kitcher', balance: 954.12 },
      { unit: '2305', name: 'Emmanuel Halliburton', balance: 890.02 },
      { unit: '2301', name: 'Laynie Coleman', balance: 750.60 },
      { unit: '4310', name: 'Marina Vazquez', balance: 22.00 },
      { unit: '10110', name: 'Selma De Luna', balance: 21.55 },
      { unit: '10111', name: 'Amanda Castro', balance: 16.83 },
      { unit: '4204', name: 'Jenny Berg', balance: 16.50 },
      { unit: '4305', name: 'Davonne Jones', balance: 10.50 },
    ],
    expense_breakdown: [
      { label: 'Salaries & benefits', actual: 24398, budget: 28209 },
      { label: 'Repairs & maintenance', actual: 386, budget: 2755 },
      { label: 'Contract services', actual: 4497, budget: 4312 },
      { label: 'Utilities', actual: 7261, budget: 14579 },
      { label: 'General & admin', actual: 6089, budget: 16553 },
      { label: 'Leasing', actual: 9523, budget: 10866 },
      { label: 'Management fees', actual: 7000, budget: 7000 },
    ],
    history: [
      { month: 'Oct 2025', occ: 0, noi: -9378 },
      { month: 'Nov 2025', occ: 0, noi: -25269 },
      { month: 'Dec 2025', occ: 0, noi: -31539 },
      { month: 'Jan 2026', occ: 0, noi: -58321 },
      { month: 'Feb 2026', occ: 0, noi: -49616 },
      { month: 'Mar 2026', occ: 17.4, noi: -23834 },
    ],
    is_current: true,
  })
  if (lErr) console.error('Leasing snapshot failed:', lErr)
  else console.log('Leasing snapshot inserted')

  // 4. Pre-populate document registry (no files yet — just metadata)
  const docs = [
    { folder: 'A. Land Acquisition', name: 'Real Estate Sale Agreement', file_name: '1. Real Estate Sale Agreement.receipted.pdf', doc_type: 'executed' },
    { folder: 'A. Land Acquisition', name: 'First Amendment to Real Estate Agreement', file_name: '2. First Amendment to Real Estate Agreement.pdf', doc_type: 'executed' },
    { folder: 'A. Land Acquisition', name: 'Special Warranty Deed to Partnership', file_name: '3  Special Warranty Deed to Partnership.pdf', doc_type: 'executed' },
    { folder: 'A. Land Acquisition', name: 'Special Warranty Deed PFC', file_name: '4.  Special Warranty Deed PFC.pdf', doc_type: 'executed' },
    { folder: 'A. Land Acquisition', name: 'Temporary Construction Easement', file_name: '5  Temporary Const Easement.pdf', doc_type: 'executed' },
    { folder: 'A. Land Acquisition', name: 'Declaration of Restrictive Covenants', file_name: '6  Declaration of Rest Covenants.pdf', doc_type: 'executed' },
    { folder: 'A. Land Acquisition', name: 'Notice to Purchaser', file_name: '7.  Notice to Purchaser.pdf', doc_type: 'executed' },
    { folder: 'A. Land Acquisition', name: 'Affidavit of Debts and Liens', file_name: '8. Affidavit of Debts and liens.pdf', doc_type: 'executed' },
    { folder: 'A. Land Acquisition', name: 'Post Closing Agreement', file_name: '14. Post Closing Agreement.pdf', doc_type: 'executed' },
    { folder: 'B. Bond', name: 'Trust Indenture', file_name: '01 Trust Indenture (Centerpoint).pdf', doc_type: 'executed' },
    { folder: 'B. Bond', name: 'Loan Agreement', file_name: '03 Loan Agreement (Centerpoint).pdf', doc_type: 'executed' },
    { folder: 'B. Bond', name: 'Regulatory Agreement (Bond)', file_name: '04 Regulatory Agreement (Centerpoint).pdf', doc_type: 'executed' },
    { folder: 'B. Bond', name: 'Promissory Note', file_name: '05 Promissory Note - Centerpoint Depot.pdf', doc_type: 'executed' },
    { folder: 'B. Bond', name: 'Bond Purchase Agreement', file_name: '08 Bond Purchase Agreement.pdf', doc_type: 'executed' },
    { folder: 'C. HUD Transcript', name: 'HUD Firm Commitment', file_name: '01.a. HUD Firm Commitment.pdf', doc_type: 'executed' },
    { folder: 'C. HUD Transcript', name: 'HUD Regulatory Agreement', file_name: '19.  Regulatory Agreement.pdf', doc_type: 'executed' },
    { folder: 'C. HUD Transcript', name: 'Security Instrument / Deed of Trust', file_name: '17. Security Instrument.pdf', doc_type: 'executed' },
    { folder: 'C. HUD Transcript', name: 'Operating Deficit Escrow Agreement', file_name: '25. Operating Deficit Escrow.pdf', doc_type: 'executed' },
    { folder: 'C. HUD Transcript', name: 'Working Capital Escrow Agreement', file_name: '26. Working Capital Escrow.pdf', doc_type: 'executed' },
    { folder: 'C. HUD Transcript', name: 'Settlement Statement', file_name: '39. Settlement Statement.pdf', doc_type: 'executed' },
    { folder: 'D. Equity', name: 'Amended and Restated Partnership Agreement (LPA)', file_name: 'Centerpoint - AMENDED AND RESTATED PARTNERSHIP AGREEMENT - signed.pdf', doc_type: 'executed' },
    { folder: 'E. Land and Lease', name: 'Ground Lease', file_name: '2. Ground Lease (Centerpoint).pdf', doc_type: 'executed' },
    { folder: 'E. Land and Lease', name: 'Right of First Refusal Agreement', file_name: '1._Right of First Refusal Agreement.pdf', doc_type: 'executed' },
    { folder: 'F. Construction', name: 'Construction Contract', file_name: '1. Construction Contract.pdf', doc_type: 'executed' },
    { folder: 'F. Construction', name: 'Joint Venture Agreement', file_name: '2. Joint Venture Ageement - Centerpoint.pdf', doc_type: 'executed' },
    { folder: 'G. Opinions', name: 'Bond Opinion (Bracewell)', file_name: '1. Bond Opinion (Bracewell).pdf', doc_type: 'opinion' },
    { folder: 'G. Opinions', name: 'Equity Opinion (Bracewell)', file_name: '2. Equity Opinion (Bracewell).pdf', doc_type: 'opinion' },
    { folder: 'G. Opinions', name: 'HUD Opinion (SM&N)', file_name: '5. HUD Opinion (SM&N).pdf', doc_type: 'opinion' },
    { folder: 'G. Opinions', name: 'Property Tax Exemption Opinion', file_name: '6. Property Tax Exemption Opinion.pdf', doc_type: 'opinion' },
    { folder: 'H. Title Misc', name: 'Loan Policy', file_name: '1. Loan Policy - signed.pdf', doc_type: 'executed' },
    { folder: 'H. Title Misc', name: 'Settlement Statement - Title Company', file_name: '3. Settlement Statement - Title Company.pdf', doc_type: 'executed' },
    { folder: 'Monthly Reports', name: 'PM Financials — March 2026', file_name: '306_Tapestry_Centerpoint_-_Financials_03_2026.pdf', doc_type: 'pm-report' },
    { folder: 'Monthly Reports', name: 'Rent Roll — April 22, 2026', file_name: 'RentRoll04_22_2026__4_.xlsx', doc_type: 'rent-roll' },
    { folder: 'Monthly Reports', name: 'Draw Schedule — Aug 2025 / Feb 2026', file_name: '_Centerpoint_Draws_CPG_8-8-25_Roxanne_mpg_2-9-26.xlsx', doc_type: 'draw-schedule' },
  ]

  const { error: docErr } = await supabase.from('documents').insert(
    docs.map((d, i) => ({ ...d, project_id: pid, sort_order: i }))
  )
  if (docErr) console.error('Documents failed:', docErr)
  else console.log(`${docs.length} document records inserted`)

  console.log('\nDone! Your project ID is:', pid)
  console.log('Add this to your .env.local if needed: VITE_DEFAULT_PROJECT_ID=' + pid)
}

seed().catch(console.error)
