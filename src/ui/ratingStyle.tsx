import { EyeIcon, FireIcon, HeartBreakIcon, HeartIcon, QuestionIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { Rating } from '../domain/types'

/** Semantic action colours – identical in light and dark mode (Designsystem §3a). */
export const RATING_COLOR: Record<Rating, string> = {
  LIKE: '#2FA56B',
  DISLIKE: '#E5534B',
  WANT_TO_TRY: '#F07A2B',
  KNOW: '#5B7FE0',
  UNKNOWN: '#8A8173',
}

export const RATING_ICON: Record<Rating, ReactNode> = {
  LIKE: <HeartIcon weight="fill" />,
  DISLIKE: <HeartBreakIcon weight="bold" />,
  WANT_TO_TRY: <FireIcon weight="fill" />,
  KNOW: <EyeIcon weight="bold" />,
  UNKNOWN: <QuestionIcon weight="bold" />,
}
