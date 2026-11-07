-- Members are created only after they verify their email (enter the OTP), not as soon as they sign up.
-- Until then they do not show in the admin Members list, stats, signals or emails.
-- With "Confirm email" OFF in Supabase the email counts as verified at once, so nothing changes there.
-- Run once in Supabase -> SQL Editor (live and local). Safe to re-run.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    v_ref  uuid;
    v_code text;
    v_input_code text := nullif(trim(new.raw_user_meta_data->>'referral_code'), '');
begin
    -- A member is created only once their email is verified (OTP entered), not at sign-up.
    if new.email_confirmed_at is null
       or exists (select 1 from public.profiles where id = new.id) then
        return new;
    end if;

    if v_input_code is not null then
        select id into v_ref from public.profiles where upper(referral_code) = upper(v_input_code);
    end if;

    loop
        v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
        exit when not exists (select 1 from public.profiles where referral_code = v_code);
    end loop;

    -- New members start with $0 and inactive. The $5 free credit is granted once,
    -- on their FIRST approved deposit (see approve_deposit).
    insert into public.profiles (id, email, name, phone, country, referral_code, referred_by, wallet_balance, is_active)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'country',
        v_code,
        v_ref,
        0,
        false
    );

    if v_ref is not null then
        update public.profiles set referral_count = referral_count + 1 where id = v_ref;
    end if;

    return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert or update of email_confirmed_at on auth.users
    for each row execute function public.handle_new_user();
