-- Bring back member profiles that were removed by the old clean-up step.
-- Their login accounts (auth.users) were never deleted; this rebuilds the profile row from the
-- details saved at sign-up (name, phone, country, referral code) and keeps their original join date.
-- New: Member ID number and their own referral code. Wallet starts at $0 (they had no deposits).
-- Run once in Supabase -> SQL Editor (live). Safe to re-run: it only adds profiles that are missing.

insert into public.profiles (id, email, name, phone, country, referral_code, referred_by, wallet_balance, is_active, created_at)
select u.id,
       u.email,
       coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name'),
       u.raw_user_meta_data->>'phone',
       u.raw_user_meta_data->>'country',
       upper(substr(md5(random()::text || u.id::text), 1, 8)),
       (select r.id from public.profiles r
         where upper(r.referral_code) = upper(nullif(trim(u.raw_user_meta_data->>'referral_code'), ''))
         limit 1),
       0, false, u.created_at
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- Check: should now be close to the old total.
select count(*) as member_profiles from public.profiles where not is_admin;
