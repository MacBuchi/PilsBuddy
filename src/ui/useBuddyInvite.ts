import { COPY } from '../data/copy'
import { encodeBuddy } from '../domain/buddyLink'
import { useApp } from '../state/AppContext'

/** Shares "my" buddy link (Web Share, else clipboard). */
export function useBuddyInvite(): () => Promise<void> {
  const { state, toast } = useApp()
  const { ratings, buddyNo } = state.profile
  return async () => {
    if (!Object.keys(ratings).length) {
      toast(COPY.buddy.needRatings)
      return
    }
    const url = `${window.location.origin}/?buddy=${encodeBuddy(buddyNo, ratings)}`
    try {
      if (navigator.share) {
        await navigator.share({ title: COPY.app.name, text: COPY.buddy.inviteText, url })
        return
      }
      await navigator.clipboard.writeText(`${COPY.buddy.inviteText} ${url}`)
      toast(COPY.buddy.copied)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      toast(COPY.buddy.failed)
    }
  }
}
