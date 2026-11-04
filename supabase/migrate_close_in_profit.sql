-- Close in profit: the admin can close an open signal early at the current price, before TP is hit.
-- The signal is saved with status 'Early TP Hit' (counted as a win / Profit everywhere, like 'TP Hit')
-- and the price it was closed at. Run once in Supabase -> SQL Editor (live and local). Safe to re-run.

alter table public.signals add column if not exists closed_price numeric;
