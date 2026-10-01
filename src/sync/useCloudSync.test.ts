import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialProfile } from '../state/reducer'
import type { Profile } from '../state/reducer'

const cloud = vi.hoisted(() => ({
  signedInto: vi.fn(async () => true),
  joinWithCode: vi.fn(async () => undefined),
  syncNow: vi.fn(),
  createSyncCode: vi.fn(async () => 'PILS-AAAA-BBBB-CCCC-DDDD'),
  leave: vi.fn(async () => undefined),
  deleteAccount: vi.fn(async () => undefined),
}))
vi.mock('./cloud', () => cloud)

const { RETRY_MS, hasCloudAccount, syncActions, useCloudSync, useSyncStatus } = await import('./useCloudSync')

const profile = (): Profile => ({ ...initialProfile(), sync: { on: true, code: 'PILS-AAAA-BBBB-CCCC-DDDD' } })
const flush = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('useCloudSync', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('retries a failed sync by itself and recovers', async () => {
    cloud.syncNow.mockRejectedValueOnce(Object.assign(new Error('cold start'), { kind: 'server' }))
    cloud.syncNow.mockResolvedValue({ ratings: {}, remoteProfile: null })
    const dispatch = vi.fn()
    const p = profile()
    renderHook(() => useCloudSync(p, dispatch))
    const status = renderHook(() => useSyncStatus())

    await flush(1600)
    expect(cloud.syncNow).toHaveBeenCalledTimes(1)
    expect(status.result.current.state).toBe('error')

    await flush(RETRY_MS[0])
    expect(cloud.syncNow).toHaveBeenCalledTimes(2)
    expect(status.result.current.state).toBe('ok')
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SYNC_APPLY' }))
  })

  it('switches itself off when the account was deleted on another device – local data stays', async () => {
    cloud.syncNow.mockRejectedValue(Object.assign(new Error('fk'), { kind: 'gone' }))
    const dispatch = vi.fn()
    const p = profile()
    renderHook(() => useCloudSync(p, dispatch))
    const status = renderHook(() => useSyncStatus())

    await flush(1600)
    expect(cloud.leave).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SYNC', sync: { on: false, code: null } })
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SYNC_APPLY' }))
    expect(status.result.current.state).toBe('gone')
    await flush(RETRY_MS[3] * 2)
    expect(cloud.syncNow).toHaveBeenCalledTimes(1) // no retries
  })

  it('a code whose account no longer exists also counts as gone', async () => {
    cloud.signedInto.mockResolvedValueOnce(false)
    cloud.joinWithCode.mockRejectedValueOnce(Object.assign(new Error('404'), { kind: 'code' }))
    const dispatch = vi.fn()
    const p = profile()
    renderHook(() => useCloudSync(p, dispatch))
    await flush(1600)
    expect(cloud.syncNow).not.toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SYNC', sync: { on: false, code: null } })
  })

  it('erase deletes the cloud account and switches sync off', async () => {
    const dispatch = vi.fn()
    await syncActions.erase('PILS-AAAA-BBBB-CCCC-DDDD', dispatch)
    expect(cloud.deleteAccount).toHaveBeenCalledWith('PILS-AAAA-BBBB-CCCC-DDDD')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SYNC', sync: { on: false, code: null } })
  })

  it('knows whether this device ever used the sync', () => {
    const stored = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => stored.get(k) ?? null })
    expect(hasCloudAccount({ on: false, code: null })).toBe(false)
    expect(hasCloudAccount({ on: false, code: 'PILS-AAAA-BBBB-CCCC-DDDD' })).toBe(true)
    stored.set('pilsbuddy.auth', '{}')
    expect(hasCloudAccount({ on: false, code: null })).toBe(true)
    vi.unstubAllGlobals()
  })

  it('does nothing while sync is off', async () => {
    renderHook(() => useCloudSync(initialProfile(), vi.fn()))
    await flush(5000)
    expect(cloud.syncNow).not.toHaveBeenCalled()
  })
})
