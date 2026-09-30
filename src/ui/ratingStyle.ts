import type { Rating } from '../domain/types'

/** Semantic action colours – identical in light and dark mode (Designsystem §3a). */
export const RATING_COLOR: Record<Rating, string> = {
  LIKE: '#2FA56B',
  DISLIKE: '#E5534B',
  WANT_TO_TRY: '#F07A2B',
  KNOW: '#5B7FE0',
  UNKNOWN: '#8A8173',
}
