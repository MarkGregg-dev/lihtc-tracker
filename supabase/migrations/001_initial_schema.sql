-- LIHTC Project Tracker — Supabase Schema
-- Run this in the Supabase SQL editor

-- ── Projects ────────────────────────────────────────────────────────
create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  name         text not null,
  alias        text[] default '{}',
  city         text,
  stage        text check (stage in ('Pre-development','Construction','Lease-up','Stabilized')),
  units        integer,
  ami          integer[] default '{}',
  mix          jsonb default '{}',
  alert        text check (alert in ('green','amber','red')) default 'green',
  alert_msg    text,
  tc_year      integer,
  investor     text,
  lender       text,
  pm_company   text,
  notes        text,
  sort_order   integer default 0
);

-- ── Draw data ───────────────────────────────────────────────────────
create table if not exists draw_data (
  id                          uuid primary key default gen_random_uuid(),
  project_id                  uuid references projects(id) on delete cascade,
  updated_at                  timestamptz default now(),
  total_budget                bigint,
  total_spent                 bigint,
  construction_budget         bigint,
  construction_spent          bigint,
  construction_remaining      bigint,
  working_capital_start       bigint,
  working_capital_remaining   bigint,
  co_contingency_start        bigint,
  co_contingency_remaining    bigint,
  draw_count                  integer,
  last_draw_num               integer,
  gc_target                   text,
  lease_target                text,
  change_orders               jsonb default '[]',
  equity_schedule             jsonb default '[]'
);

-- ── Leasing snapshots ────────────────────────────────────────────────
create table if not exists leasing_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid references projects(id) on delete cascade,
  report_month        text,
  snapshot_date       date,
  total_units         integer,
  occupied            integer,
  vacant_unrented     integer,
  vacant_rented_ready integer,
  physical_occupancy  numeric(5,2),
  gpr                 bigint,
  vacancy_loss        bigint,
  concessions         bigint,
  net_rental_income   bigint,
  total_income        bigint,
  total_expenses      bigint,
  noi                 bigint,
  noi_budget          bigint,
  ytd_noi             bigint,
  ytd_noi_budget      bigint,
  cash_operating      bigint,
  cash_reserves       bigint,
  cash_op_reserve     bigint,
  cash_soft_cost      bigint,
  ami30_total         integer,
  ami30_occ           integer,
  ami60_total         integer,
  ami60_occ           integer,
  unit_mix_detail     jsonb default '[]',
  expense_breakdown   jsonb default '[]',
  delinquency         jsonb default '[]',
  history             jsonb default '[]',
  is_current          boolean default true,
  created_at          timestamptz default now()
);

-- ── LPA data ────────────────────────────────────────────────────────
create table if not exists lpa_data (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid references projects(id) on delete cascade,
  updated_at              timestamptz default now(),
  entity                  text,
  gp                      text,
  slp                     text,
  investor_lp             text,
  total_equity            bigint,
  credit_price            numeric(6,4),
  projected_credits       bigint,
  stabilization_deadline  text,
  odg_cap                 bigint,
  asset_mgmt_fee          integer,
  dev_fee_total           bigint,
  dev_fee_paid            bigint,
  dev_fee_deferred        bigint,
  dev_fee_ddf_outside     text,
  ncf_pct                 integer,
  capital_contributions   jsonb default '[]',
  guarantees              jsonb default '[]',
  reporting               jsonb default '[]',
  key_dates               jsonb default '[]',
  waterfall               jsonb default '[]',
  conversion_triggers     jsonb default '[]',
  pm_removal_triggers     jsonb default '[]'
);

-- ── Documents ────────────────────────────────────────────────────────
create table if not exists documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade,
  created_at   timestamptz default now(),
  folder       text,
  name         text not null,
  file_name    text,
  doc_type     text,
  storage_path text,        -- path in Supabase Storage bucket
  file_size    bigint,
  mime_type    text,
  notes        text,
  sort_order   integer default 0
);

-- ── Storage bucket ───────────────────────────────────────────────────
-- Run this separately in Supabase dashboard > Storage > New bucket
-- Name: project-docs
-- Public: false

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-docs',
  'project-docs',
  false,
  52428800,  -- 50MB per file
  array['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg','image/png','message/rfc822']
)
on conflict (id) do nothing;

-- Storage policy — only authenticated users (or service role for private URL app)
create policy "Allow all operations on project-docs"
  on storage.objects for all
  using (bucket_id = 'project-docs')
  with check (bucket_id = 'project-docs');

-- ── Indexes ──────────────────────────────────────────────────────────
create index if not exists idx_draw_data_project on draw_data(project_id);
create index if not exists idx_leasing_project on leasing_snapshots(project_id);
create index if not exists idx_leasing_current on leasing_snapshots(project_id, is_current);
create index if not exists idx_lpa_project on lpa_data(project_id);
create index if not exists idx_docs_project on documents(project_id);
create index if not exists idx_docs_folder on documents(project_id, folder);

-- ── Updated_at trigger ───────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_projects_updated before update on projects
  for each row execute function update_updated_at();
create trigger trg_draw_updated before update on draw_data
  for each row execute function update_updated_at();
create trigger trg_lpa_updated before update on lpa_data
  for each row execute function update_updated_at();

-- ── Seed — Centerpoint Depot ─────────────────────────────────────────
-- After running this, copy the project UUID and set it in your .env
-- You can get the UUID with: select id from projects where name = 'Centerpoint Depot';
