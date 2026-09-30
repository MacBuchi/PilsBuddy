import {
  BeerSteinIcon,
  BinocularsIcon,
  CrownIcon,
  DnaIcon,
  FireIcon,
  HandWavingIcon,
  HandshakeIcon,
  HeartIcon,
  MedalIcon,
  PackageIcon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { ACHIEVEMENTS } from '../domain/achievements'
import type { AchievementDef } from '../domain/achievements'

export const ACH_ICON: Record<AchievementDef['icon'], ReactNode> = {
  heart: <HeartIcon weight="fill" />,
  crown: <CrownIcon weight="fill" />,
  binoculars: <BinocularsIcon weight="bold" />,
  'beer-stein': <BeerSteinIcon weight="fill" />,
  'hand-waving': <HandWavingIcon weight="bold" />,
  dna: <DnaIcon weight="bold" />,
  fire: <FireIcon weight="fill" />,
  medal: <MedalIcon weight="fill" />,
  package: <PackageIcon weight="bold" />,
  handshake: <HandshakeIcon weight="bold" />,
}

/** Sticker colours on the avatar glass, per achievement icon. */
export const ACH_COLOR: Record<AchievementDef['icon'], string> = {
  heart: '#E5534B',
  crown: '#F2B53A',
  binoculars: '#5B7FE0',
  'beer-stein': '#F2B53A',
  'hand-waving': '#8A8173',
  dna: '#5B7FE0',
  fire: '#F07A2B',
  medal: '#F2B53A',
  package: '#2FA56B',
  handshake: '#2FA56B',
}

export const ACH_BY_ID: Readonly<Record<string, AchievementDef>> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]))
