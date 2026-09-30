import { useRef } from 'react'
import type { ReactNode } from 'react'
import { COPY } from '../data/copy'
import { useApp } from '../state/AppContext'
import type { Profile } from '../state/reducer'
import { parseProfile } from '../state/storage'

/**
 * Restores a profile from an exported JSON file. Returns a hidden file input to render and an
 * `open()` to trigger it. Validation is parseProfile's – anything unusable is rejected with a toast.
 */
export function useProfileImport(onImported?: (p: Profile) => void): { open: () => void; input: ReactNode } {
  const { state, dispatch, toast } = useApp()
  const ref = useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const profile = parseProfile(await file.text())
    if (ref.current) ref.current.value = ''
    if (!profile) {
      toast(COPY.profile.importFailed)
      return
    }
    if (Object.keys(state.profile.ratings).length && !window.confirm(COPY.profile.importConfirm)) return
    dispatch({ type: 'IMPORT', profile })
    toast(COPY.profile.imported)
    onImported?.(profile)
  }

  const input = (
    <input
      ref={ref}
      type="file"
      accept="application/json,.json"
      hidden
      aria-label={COPY.profile.importLabel}
      onChange={(e) => onFile(e.target.files?.[0])}
    />
  )
  return { open: () => ref.current?.click(), input }
}
