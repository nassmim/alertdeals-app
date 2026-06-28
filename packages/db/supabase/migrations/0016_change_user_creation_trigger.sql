CREATE OR REPLACE FUNCTION public.handle_new_user_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  user_email text;
  new_account_id uuid;
  is_invited boolean;
begin
  user_email := new.email;
  -- Admin-invited users have invited_at set natively by inviteUserByEmail;
  -- self-signups don't, so they stay pending until an admin confirms them.
  is_invited := new.invited_at is not null;

  insert into public.accounts (
    id,
    email,
    confirmed_by_admin
  )
  values (
    new.id,
    user_email,
    is_invited
  )
  on conflict (id) do update set
    email = excluded.email,
    -- Promote to confirmed once we detect the invite, but never demote
    -- an already-confirmed account (manual admin validation, etc.).
    confirmed_by_admin = public.accounts.confirmed_by_admin or excluded.confirmed_by_admin
  returning id into new_account_id;

  return new;
end;
$function$;