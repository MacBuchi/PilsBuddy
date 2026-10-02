-- Feedback: the live project hands new public tables to anon/authenticated by default privileges
-- (select, update, delete …). RLS already blocks them (no policy), but the API roles should not hold
-- them at all: only the four insert columns of 20261002120000_feedback.sql remain.
revoke all on public.feedback from anon, authenticated;
grant insert (type, message, app_version, platform) on public.feedback to anon, authenticated;
