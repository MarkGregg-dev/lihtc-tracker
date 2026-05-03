const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

module.exports.config = { api: { bodyParser: { sizeLimit: '50mb' } } }

const PROJECT_MAP = {
  '306': '79ab3b84-8837-4d77-b160-5a66861f45c0',
  'centerpoint': '79ab3b84-8837-4d77-b160-5a66861f45c0',
  'tapestry': '79ab3b84-8837-4d77-b160-5a66861f45c0',
}

function detectProject(subject, from) {
  const text = ((subject || '') + ' ' + (from || '')).toLowerCase()
  for (const [key, id] of Object.entries(PROJECT_MAP)) {
    if (text.includes(key)) return id
  }
  return null
}

// Parse a number from text - handles commas and negatives
function parseNum(str) {
  if (!str) return null
  const n = parseFloat(str.replace(/,/g, ''))
  return isNaN(n) ? null : n
}

// Extract first number after a label in text
function extractAfter(text, label) {
  const idx = text.indexOf(label)
  if (idx === -1) return null
  const after = text.substring(idx + label.length, idx + label.length + 100)
  const match = after.match(/-?[\d,]+\.?\d*/)
  return match ? parseNum(match[0]) : null
}

function parseFinancialText(text) {
  // Find period
  const periodMatch = text.match(/Period\s*=\s*(\w+)\s+(\d{4})/)
  let period = null
  let periodDate = null
  if (periodMatch) {
    const months = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' }
    const mo = months[periodMatch[1]]
    const yr = periodMatch[2]
    if (mo && yr) {
      period = `${yr}-${mo}`
      periodDate = `${yr}-${mo}-01`
    }
  }

  // Extract key line items - first number after label = PTD Actual
  const gpr = extractAfter(text, 'GROSS POTENTIAL RENT')
  const vacancyLoss = extractAfter(text, 'VACANCY LOSS')
  const concessions = extractAfter(text, 'CONCESSIONS')
  const netRental = extractAfter(text, 'Net Rental Income')
  const otherIncome = extractAfter(text, 'OTHER OPERATING INCOME')
  const totalIncome = extractAfter(text, 'TOTAL OPERATING INCOME')
  const salaries = extractAfter(text, 'SALARIES and BENEFITS')
  const repairs = extractAfter(text, 'RPRS and MAINTENANCE')
  const contractSvcs = extractAfter(text, 'CONTRACT SVCS')
  const utilities = extractAfter(text, 'UTILTIES EXPENSES') || extractAfter(text, 'UTILITIES EXPENSES')
  const genAdmin = extractAfter(text, 'GENERAL AND ADMIN')
  const leasing = extractAfter(text, 'LEASING - RESIDENTIAL') || extractAfter(text, 'LEASING')
  const mgmtFee = extractAfter(text, 'MANAGEMENT FEES') || extractAfter(text, 'MANGEMENT FEES')
  const totalExpenses = extractAfter(text, 'TOTAL OPERATING EXPENSES')
  const noi = extractAfter(text, 'NET OPERATING INCOME')

  // Budget NOI - second occurrence of NET OPERATING INCOME
  const firstNOI = text.indexOf('NET OPERATING INCOME')
  const secondNOI = text.indexOf('NET OPERATING INCOME', firstNOI + 1)
  let ptdBudgetNoi = null
  if (secondNOI > -1) {
    const after = text.substring(secondNOI + 'NET OPERATING INCOME'.length, secondNOI + 200)
    // Skip first number (PTD Actual), get second (PTD Budget)
    const nums = after.match(/-?[\d,]+\.?\d*/g)
    if (nums && nums.length >= 2) ptdBudgetNoi = parseNum(nums[1])
  }

  // PTD Budget income/expenses - look for numbers after TOTAL OPERATING INCOME/EXPENSES
  let ptdBudgetIncome = null
  let ptdBudgetExpenses = null
  if (totalIncome !== null) {
    const idx = text.indexOf('TOTAL OPERATING INCOME')
    const after = text.substring(idx + 'TOTAL OPERATING INCOME'.length, idx + 200)
    const nums = after.match(/-?[\d,]+\.?\d*/g)
    if (nums && nums.length >= 2) ptdBudgetIncome = parseNum(nums[1])
  }
  if (totalExpenses !== null) {
    const idx = text.indexOf('TOTAL OPERATING EXPENSES')
    const after = text.substring(idx + 'TOTAL OPERATING EXPENSES'.length, idx + 200)
    const nums = after.match(/-?[\d,]+\.?\d*/g)
    if (nums && nums.length >= 2) ptdBudgetExpenses = parseNum(nums[1])
  }

  return {
    period, periodDate,
    gross_potential_rent: gpr,
    vacancy_loss: vacancyLoss,
    concessions,
    net_rental_income: netRental,
    other_income: otherIncome,
    total_operating_income: totalIncome,
    salaries_benefits: salaries ? -Math.abs(salaries) : null,
    repairs_maintenance: repairs ? -Math.abs(repairs) : null,
    contract_services: contractSvcs ? -Math.abs(contractSvcs) : null,
    utilities: utilities ? -Math.abs(utilities) : null,
    general_admin: genAdmin ? -Math.abs(genAdmin) : null,
    leasing: leasing ? -Math.abs(leasing) : null,
    management_fee: mgmtFee ? -Math.abs(mgmtFee) : null,
    total_operating_expenses: totalExpenses ? -Math.abs(totalExpenses) : null,
    noi,
    ptd_budget_income: ptdBudgetIncome,
    ptd_budget_expenses: ptdBudgetExpenses ? -Math.abs(ptdBudgetExpenses) : null,
    ptd_budget_noi: ptdBudgetNoi,
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { base64, from, subject, project_id } = req.body
    if (!base64) return res.status(400).json({ error: 'No base64 content provided' })

    console.log('base64 length:', base64.length)

    // Extract PDF text
    let pdfText = null
    try {
      const pdfParse = require('pdf-parse')
      const buffer = Buffer.from(base64, 'base64')
      const data = await pdfParse(buffer, { max: 15 })
      pdfText = data.text
      console.log('PDF text length:', pdfText.length)
    } catch (err) {
      console.error('PDF parse error:', err.message)
      return res.status(200).json({ success: false, error: 'PDF extraction failed: ' + err.message })
    }

    // Parse financial data directly from text
    const parsed = parseFinancialText(pdfText)
    console.log('Parsed period:', parsed.period, 'NOI:', parsed.noi, 'Income:', parsed.total_operating_income)

    const projectId = project_id || detectProject(subject, from)

    if (!parsed.period) {
      return res.status(200).json({ success: false, error: 'Could not find period in PDF. Check that this is a Sandalwood monthly report.' })
    }

    if (projectId && parsed.period) {
      const snapshot = {
        project_id: projectId,
        period: parsed.period,
        period_date: parsed.periodDate,
        gross_potential_rent: parsed.gross_potential_rent,
        vacancy_loss: parsed.vacancy_loss,
        concessions: parsed.concessions,
        net_rental_income: parsed.net_rental_income,
        other_income: parsed.other_income,
        total_operating_income: parsed.total_operating_income,
        salaries_benefits: parsed.salaries_benefits,
        repairs_maintenance: parsed.repairs_maintenance,
        contract_services: parsed.contract_services,
        utilities: parsed.utilities,
        general_admin: parsed.general_admin,
        leasing: parsed.leasing,
        management_fee: parsed.management_fee,
        total_operating_expenses: parsed.total_operating_expenses,
        noi: parsed.noi,
        ptd_budget_income: parsed.ptd_budget_income,
        ptd_budget_expenses: parsed.ptd_budget_expenses,
        ptd_budget_noi: parsed.ptd_budget_noi,
      }

      const { error: dbErr } = await supabase
        .from('monthly_snapshots')
        .upsert(snapshot, { onConflict: 'project_id,period' })

      if (dbErr) {
        console.error('Supabase error:', dbErr.message)
        return res.status(200).json({ success: false, error: dbErr.message })
      }
      console.log('Saved snapshot:', parsed.period)
    }

    if (from || subject) {
      await supabase.from('email_queue').insert({
        from_email: from || '',
        subject: subject || '',
        sender_type: 'pm',
        detected_doc_type: 'pm-report',
        detected_project_id: projectId,
        confidence: 'high',
        extracted_data: parsed,
        attachments: [{ name: 'financials.pdf', contentType: 'application/pdf' }],
        status: 'approved',
      })
    }

    return res.status(200).json({
      success: true,
      period: parsed.period,
      noi: parsed.noi,
      occupancy_pct: parsed.occupancy_pct,
      total_operating_income: parsed.total_operating_income
    })

  } catch (err) {
    console.error('Handler error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
