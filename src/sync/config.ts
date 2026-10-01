/**
 * Supabase project for device sync (Stufe B2). The publishable key is public by design – access is
 * guarded by RLS. `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` point a dev build at the local stack.
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? 'https://rwqpljpnotnyovvuxjgl.supabase.co'
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_X2teAee681xX1mw4hvPVLQ_I_XqNsjV'

/** Where supabase-js keeps the anonymous session – next to the profile, so it survives updates. */
export const AUTH_STORAGE_KEY = 'pilsbuddy.auth'
/** Last agreed state per beer (merge base), device-local. */
export const SYNC_BASE_KEY = 'pilsbuddy.sync-base'
/** The Sync-Code of the account this device is signed into (to notice an imported foreign code). */
export const SYNC_ACCOUNT_KEY = 'pilsbuddy.sync-account'
