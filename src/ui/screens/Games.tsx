import { BeerBottleIcon, CrownSimpleIcon, PlayIcon, SealQuestionIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { BEER_BY_ID } from '../../data/beers'
import { COPY, fill } from '../../data/copy'
import { GLASS_BY_ID, GLASSES, POINTS_PER_ROUND } from '../../domain/games/fill'
import { QUIZ_QUESTIONS } from '../../domain/games/quiz'
import { useApp } from '../../state/AppContext'
import { BeerBottle } from '../components/BeerBottle'
import { FillGlass } from '../components/FillGlass'
import page from './page.module.css'
import styles from './Games.module.css'

const FAN = ['guinness', 'jever', 'paulaner-weisse'].map((id) => BEER_BY_ID[id]).filter(Boolean)
/** Three glasses for the „Wie viel ist drin?“ tile: [glass, ml]. */
const SHELF = [
  [GLASS_BY_ID.stange, 140],
  [GLASS_BY_ID.weizen, 260],
  [GLASS_BY_ID.mass, 780],
] as const
const FILL_MAX = GLASSES.length * POINTS_PER_ROUND
const MEMO = BEER_BY_ID.augustiner ?? FAN[1]

/** Stufe E: the mini games. Quartett, „Wie viel ist drin?“, Flaschen-Memory, Bierquiz, „Wer wird Bierionär?“ and the game room are here; the rest is announced. */
export function Games() {
  const { state, go, withTabs } = useApp()
  const { played, won } = state.profile.games.quartett
  const fillRec = state.profile.games.fill
  const memo = state.profile.games.memory
  const quiz = state.profile.games.quiz
  const bier = state.profile.games.bierionaer
  const memoBest = Math.min(...Object.values(memo.best).filter((n) => n > 0))

  return (
    <div className={`${page.page} ${withTabs ? page.withTabs : ''}`}>
      <div>
        <h1 className={page.h1}>{COPY.games.title}</h1>
        <p className={styles.sub}>{COPY.games.sub}</p>
      </div>

      <button type="button" className={styles.hero} onClick={() => go('quartett')}>
        <div className={styles.fan} aria-hidden>
          {FAN.map((b, i) => (
            <span key={b.id} className={styles.fanCard} style={{ background: b.color, ['--i' as string]: i - 1 }}>
              <BeerBottle beer={b} size={84} />
            </span>
          ))}
        </div>
        <span className={styles.heroTitle}>{COPY.games.quartett.title}</span>
        <span className={styles.heroText}>{COPY.games.quartett.text}</span>
        <span className={styles.heroFoot}>
          <span className={styles.record}>
            {played
              ? fill(COPY.games.quartett.record, {
                  won: String(won),
                  played: String(played),
                })
              : COPY.games.quartett.none}
          </span>
          <span className={styles.play}>
            <PlayIcon weight="fill" /> {COPY.games.quartett.cta}
          </span>
        </span>
      </button>

      <button type="button" className={styles.hero} onClick={() => go('fill')}>
        <div className={styles.shelf} aria-hidden>
          {SHELF.map(([g, v]) => (
            <FillGlass key={g.id} glass={g} ml={v} markLabel="" height={112} />
          ))}
        </div>
        <span className={styles.heroTitle}>{COPY.games.fill.title}</span>
        <span className={styles.heroText}>{COPY.games.fill.text}</span>
        <span className={styles.heroFoot}>
          <span className={styles.record}>
            {fillRec.played
              ? fill(COPY.games.fill.record, {
                  best: String(fillRec.best),
                  max: String(FILL_MAX),
                  played: String(fillRec.played),
                })
              : COPY.games.fill.none}
          </span>
          <span className={styles.play}>
            <PlayIcon weight="fill" /> {COPY.games.fill.cta}
          </span>
        </span>
      </button>

      <button type="button" className={styles.hero} onClick={() => go('memory')}>
        <div className={styles.memo} aria-hidden>
          <span className={`${styles.memoCard} ${styles.memoBack}`}>
            <BeerBottleIcon weight="fill" />
          </span>
          {MEMO && (
            <>
              <span className={styles.memoCard}>
                <BeerBottle beer={MEMO} size={76} />
              </span>
              <span className={styles.memoCard}>
                <BeerBottle beer={MEMO} size={76} />
              </span>
            </>
          )}
          <span className={`${styles.memoCard} ${styles.memoBack}`}>
            <BeerBottleIcon weight="fill" />
          </span>
        </div>
        <span className={styles.heroTitle}>{COPY.games.memory.title}</span>
        <span className={styles.heroText}>{COPY.games.memory.text}</span>
        <span className={styles.heroFoot}>
          <span className={styles.record}>
            {memo.played
              ? fill(COPY.games.memory.record, { best: String(memoBest), played: String(memo.played) })
              : COPY.games.memory.none}
          </span>
          <span className={styles.play}>
            <PlayIcon weight="fill" /> {COPY.games.memory.cta}
          </span>
        </span>
      </button>

      <button type="button" className={styles.hero} onClick={() => go('quiz')}>
        <div className={`${styles.room} ${styles.quiz}`} aria-hidden>
          <SealQuestionIcon weight="fill" />
        </div>
        <span className={styles.heroTitle}>{COPY.games.quiz.title}</span>
        <span className={styles.heroText}>{COPY.games.quiz.text}</span>
        <span className={styles.heroFoot}>
          <span className={styles.record}>
            {quiz.played
              ? fill(COPY.games.quiz.record, { best: String(quiz.best), max: String(QUIZ_QUESTIONS), played: String(quiz.played) })
              : COPY.games.quiz.none}
          </span>
          <span className={styles.play}>
            <PlayIcon weight="fill" /> {COPY.games.quiz.cta}
          </span>
        </span>
      </button>

      <button type="button" className={`${styles.hero} ${styles.studio}`} onClick={() => go('bierionaer')}>
        <div className={styles.crown} aria-hidden>
          <CrownSimpleIcon weight="fill" />
        </div>
        <span className={styles.heroTitle}>{COPY.games.bierionaer.title}</span>
        <span className={styles.heroText}>{COPY.games.bierionaer.text}</span>
        <span className={styles.heroFoot}>
          <span className={styles.record}>
            {bier.played
              ? fill(COPY.games.bierionaer.record, { best: bier.best.toLocaleString(COPY.app.locale), played: String(bier.played) })
              : COPY.games.bierionaer.none}
          </span>
          <span className={styles.play}>
            <PlayIcon weight="fill" /> {COPY.games.bierionaer.cta}
          </span>
        </span>
      </button>

      <button type="button" className={styles.hero} onClick={() => go('room')}>
        <div className={styles.room} aria-hidden>
          <UsersThreeIcon weight="fill" />
        </div>
        <span className={styles.heroTitle}>{COPY.games.room.title}</span>
        <span className={styles.heroText}>{COPY.games.room.text}</span>
        <span className={styles.heroFoot}>
          <span className={styles.record}>{COPY.games.room.note}</span>
          <span className={styles.play}>
            <PlayIcon weight="fill" /> {COPY.games.room.cta}
          </span>
        </span>
      </button>

      {COPY.games.upcoming.length > 0 && (
        <div className={styles.soonGrid}>
          {COPY.games.upcoming.map((g) => (
            <div key={g.title} className={styles.soon}>
              <span className={styles.soonChip}>{COPY.games.soon}</span>
              <span className={styles.soonTitle}>{g.title}</span>
              <span className={styles.soonText}>{g.text}</span>
            </div>
          ))}
        </div>
      )}

      <p className={styles.note}>{COPY.games.noDrinking}</p>
    </div>
  )
}
