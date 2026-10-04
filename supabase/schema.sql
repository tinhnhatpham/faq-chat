-- FAQ Chat database. Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table businesses (
  id text primary key check (id ~ '^[a-z0-9-]{3,50}$'),   -- URL-safe slug, e.g. riverside-dental
  name text not null,
  faq_text text not null,
  color text not null default '#0f766e' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now()
);

create table messages (
  id bigint generated always as identity primary key,
  business_id text not null references businesses (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_business_created on messages (business_id, created_at);

-- Row Level Security ON with no policies: the public (publishable/anon) key can read nothing.
-- Only the Flask backend, using the secret key, can read and write.
alter table businesses enable row level security;
alter table messages enable row level security;

-- Demo business
insert into businesses (id, name, color, faq_text) values (
  'riverside-dental',
  'Riverside Dental',
  '#0f766e',
  $faq$Hours: Monday-Friday 8am-5pm, Saturday 9am-1pm, closed Sunday.
Location: 120 River Road, Suite 4.
Phone: (555) 010-2040.
New patients: Yes, we accept new patients. Book online or call.
Insurance: We accept Delta Dental, Cigna, Aetna, and MetLife.
Cleaning price without insurance: $120 for a standard cleaning.
Emergencies: Call the office. After hours, call the emergency line at (555) 010-2099.
Parking: Free parking behind the building.$faq$
);
