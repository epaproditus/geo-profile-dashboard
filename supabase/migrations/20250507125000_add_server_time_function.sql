-- Create a function to get the current server time
create or replace function get_server_time()
returns timestamptz
language sql
as $$
  select now();
$$;