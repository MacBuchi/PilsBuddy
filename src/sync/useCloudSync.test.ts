import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialProfile } from '../state/reducer'
import type { Profile } from '../state/reducer'

const cloud = vi.hoisted(() => ({
  signedInto: vi.fn(async () => true),
  joinWithCode: vi.fn(async () => undefined),
  syncNow: vi.fn(),
  createSyncCode: vi.fn(async () => 'PILS-AAAA-BBBB-CCCC-DDDD'),
}))
vi.mock('./cloud', () => cloud)

const { RETRY_MS, useCloudSync, useSyncStatus } = await import('./useCloudSync')

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

  it('does nothing while sync is off', async () => {
    renderHook(() => useCloudSync(initialProfile(), vi.fn()))
    await flush(5000)
    expect(cloud.syncNow).not.toHaveBeenCalled()
  })
})
