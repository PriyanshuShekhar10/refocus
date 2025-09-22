-- Fix RLS policy to avoid per-row re-evaluation performance penalty
-- Replace auth.uid() with (select auth.uid()) in policy definitions

-- Example for public.users "Allow authenticated users to insert"
-- Adjust the policy name to match your current one if different.

begin;

-- Drop existing policy if it exists
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'Allow authenticated users to insert'
  ) then
    execute 'drop policy "Allow authenticated users to insert" on public.users';
  end if;
end$$;

-- Recreate the policy using (select auth.uid())
create policy "Allow authenticated users to insert" on public.users
for insert
with check ((select auth.uid()) is not null);

commit;
