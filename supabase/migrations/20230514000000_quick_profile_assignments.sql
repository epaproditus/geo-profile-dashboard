-- Create quick_profile_assignments table for temporary profile installations
create table if not exists quick_profile_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null,
  device_id text not null,
  user_id uuid not null references auth.users(id),
  status text not null default 'scheduled',
  install_at timestamp with time zone not null,
  remove_at timestamp with time zone not null,
  error_message text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add RLS policies to protect the quick_profile_assignments table
alter table quick_profile_assignments enable row level security;

-- Allow authenticated users to view only their own quick profile assignments
create policy "Users can view their own quick profile assignments"
  on quick_profile_assignments
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Allow authenticated users to insert their own quick profile assignments
create policy "Users can create their own quick profile assignments"
  on quick_profile_assignments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Allow authenticated users to update their own quick profile assignments
create policy "Users can update their own quick profile assignments"
  on quick_profile_assignments
  for update
  to authenticated
  using (auth.uid() = user_id);

-- Allow authenticated users to delete their own quick profile assignments
create policy "Users can delete their own quick profile assignments"
  on quick_profile_assignments
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Service function to process quick profile removals
create or replace function process_quick_profile_removals()
returns setof quick_profile_assignments
language plpgsql
security definer
as $$
begin
  return query
  update quick_profile_assignments
  set status = 'pending_removal',
      updated_at = now()
  where status = 'installed'
    and remove_at <= now()
  returning *;
end;
$$;
