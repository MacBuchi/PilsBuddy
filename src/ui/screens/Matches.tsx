import { HourglassMediumIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { getBeer } from '../../data/beers'
import { COPY, fill, pick } from '../../data/copy'
import { compareWithBuddy } from '../../domain/buddyLink'
import { hashId } from '../../domain/quips'
import type { Beer, Rating } from '../../domain/types'
import type { MatchTab } from '../../state/reducer'
import { useApp } from '../../state/AppContext'
import { useDerived } from '../../state/useDerived'
import { BuddyAvatar } from '../components/BuddyAvatar'
import { Button } from '../components/Button'
import page from './page.module.css'
import { BottleArt } from '../components/BottleArt'
import { RateSheet } from '../components/RateSheet'
import { useBuddyInvite } from '../useBuddyInvite'
import { RATING_COLOR } from '../ratingStyle'
import styles from './Matches.module.css'

const SEGMENTS: { k: MatchTab; label: string; beta: boolean }[] = [
  { k: 'biere', label: COPY.matches.tabBeers, beta: false },
  { k: 'probieren', label: COPY.matches.tabTry, beta: false },
  { k: 'menschen', label: COPY.matches.tabPeople, beta: true },
]

export function Matches() {
  const { state, dispatch, openDetail, toast, withTabs, rate } = useApp()
  const [tried, setTried] = useState<Beer | null>(null)
  const invite = useBuddyInvite()
  const buddy = state.profile.buddy
  const compare = useMemo(() => (buddy ? compareWithBuddy(state.profile.ratings, buddy) : null), [buddy, state.profile.ratings])
  const buddyLabel = buddy ? String(buddy.no).padStart(4, '0') : ''
  const { candidates, archetype, avatar } = useDerived()
  const tab = state.matchTab
  const recos = candidates.slice(0, 4)
  const ratings = state.profile.ratings
  const tryList = Object.entries(ratings)
    .filter(([, e]) => e.rating === 'WANT_TO_TRY')
    .sort((a, b) => b[1].at - a[1].at)
    .map(([id]) => getBeer(id))

  const verdict = (beer: Beer, r: Rating) => {
    setTried(null)
    if (rate(beer.id, r).length) return
    toast(fill(pick(COPY.quips[r], hashId(beer.id)), { name: beer.name }), RATING_COLOR[r])
  }

  return (
    <div className={`${page.page} ${withTabs ? page.withTabs : ''}`} style={{ paddingLeft: 20, paddingRight: 20 }}>
      <h1 className={page.h1}>{COPY.matches.title}</h1>

      <div className={styles.segments} role="tablist">
        {SEGMENTS.map((s) => {
          const active = tab === s.k
          return (
            <button
              key={s.k}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.segment} ${active ? styles.segmentActive : ''}`}
              onClick={() => dispatch({ type: 'SET_MATCH_TAB', tab: s.k })}
            >
              {s.label}
              {s.beta && <span className={styles.beta}>{COPY.matches.beta}</span>}
            </button>
          )
        })}
      </div>

      {tab === 'biere' && (
        <>
          <div className="t-label">{fill(COPY.matches.freshFor, { who: COPY.personas[archetype].short })}</div>
          {recos.map(({ beer, pct }) => (
            <button key={beer.id} type="button" className={styles.reco} onClick={() => openDetail(beer.id)}>
              <span className={styles.bottle} style={{ background: beer.color }}>
                <BottleArt beer={beer} size={50} />
              </span>
              <span className={styles.recoText}>
                <span className={styles.recoName}>{beer.name}</span>
                <span className={styles.recoMeta}>
                  {beer.style} · {beer.region}
                </span>
              </span>
              <span className={styles.recoRight}>
                <span className={styles.recoPct}>{pct} %</span>
                <span className={styles.recoTag}>
                  {ratings[beer.id] ? COPY.rating[ratings[beer.id].rating].label : COPY.matches.newForYou}
                </span>
              </span>
            </button>
          ))}
          {recos.length === 0 && <div className={page.dashed}>{COPY.matches.none}</div>}
        </>
      )}

      {tab === 'probieren' && (
        <>
          <div className="t-label">{fill(COPY.tryList.label, { n: tryList.length })}</div>
          {tryList.map((beer) => (
            <div key={beer.id} className={styles.reco}>
              <button type="button" className={styles.tryOpen} onClick={() => openDetail(beer.id)}>
                <span className={styles.bottle} style={{ background: beer.color }}>
                  <BottleArt beer={beer} size={50} />
                </span>
                <span className={styles.recoText}>
                  <span className={styles.recoName}>{beer.name}</span>
                  <span className={styles.recoMeta}>
                    {beer.style} · {beer.region}
                  </span>
                </span>
              </button>
              <button type="button" className={styles.tryBtn} onClick={() => setTried(beer)}>
                {COPY.tryList.cta}
              </button>
            </div>
          ))}
          {tryList.length === 0 && <div className={page.dashed}>{COPY.tryList.empty}</div>}
        </>
      )}

      {tried && <RateSheet beer={tried} onRate={(r) => verdict(tried, r)} onClose={() => setTried(null)} />}

      {tab === 'menschen' && buddy && compare && (
        <>
          <div className={styles.preview}>
            <div className={styles.previewHead}>
              <span className={styles.previewAvatar}>
                <BuddyAvatar spec={avatar} size={78} />
              </span>
              <span className={styles.plus}>+</span>
              <span className={styles.previewAvatar}>
                <BuddyAvatar archetype={compare.buddyArchetype} decoded={compare.buddyDna.decoded} size={78} />
              </span>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewRow}>
                <span className={styles.previewNames}>{fill(COPY.buddy.title, { no: buddyLabel })}</span>
                <span className={styles.previewPct}>{compare.pct} %</span>
              </div>
              <div className="t-label" style={{ fontSize: 10.5 }}>
                {fill(COPY.buddy.sub, { persona: COPY.personas[compare.buddyArchetype].name })}
              </div>
              {compare.shared.length > 0 && (
                <div className={styles.group}>
                  <span className={styles.groupLabel}>{COPY.buddy.both}</span>
                  <div className={styles.pills}>
                    {compare.shared.map((id) => (
                      <button key={id} type="button" className={styles.pillLike} onClick={() => openDetail(id)}>
                        {getBeer(id).name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {compare.disagree.length > 0 && (
                <div className={styles.group}>
                  <span className={styles.groupLabel}>{COPY.buddy.disagree}</span>
                  <div className={styles.pills}>
                    {compare.disagree.map((id) => (
                      <button key={id} type="button" className={styles.pillNope} onClick={() => openDetail(id)}>
                        {getBeer(id).name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {compare.shared.length + compare.disagree.length === 0 && <div className={styles.note}>{COPY.buddy.none}</div>}
              {compare.tips.length > 0 && (
                <div className={styles.group}>
                  <span className={styles.groupLabel}>{fill(COPY.buddy.tips, { no: buddyLabel })}</span>
                  <div className={styles.pills}>
                    {compare.tips.slice(0, 6).map((id) => (
                      <button key={id} type="button" className={styles.pillTip} onClick={() => openDetail(id)}>
                        {getBeer(id).name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Button size="md" block onClick={invite} style={{ height: 52 }}>
                {COPY.buddy.inviteAgain}
              </Button>
              <button type="button" className={styles.removeBuddy} onClick={() => dispatch({ type: 'SET_BUDDY', buddy: null })}>
                {COPY.buddy.remove}
              </button>
            </div>
          </div>
          <p className={styles.privacy}>{COPY.buddy.privacy}</p>
        </>
      )}

      {tab === 'menschen' && !buddy && (
        <>
          <div className={styles.soon}>
            <HourglassMediumIcon weight="bold" size={22} style={{ marginTop: 2, flex: 'none' }} />
            <div className={styles.soonText}>
              <span className={styles.soonTitle}>{COPY.matches.soonTitle}</span>
              <span className={styles.soonSub}>{COPY.matches.soonText}</span>
            </div>
          </div>
          <div className={styles.inviteBox}>
            <span className={styles.soonTitle}>{COPY.buddy.inviteLabel}</span>
            <span className={styles.soonSub}>{COPY.buddy.privacy}</span>
            <Button size="md" block onClick={invite} style={{ height: 52 }}>
              {COPY.buddy.invite}
            </Button>
          </div>
          <div className="t-label">{COPY.matches.previewLabel}</div>
          <div className={styles.preview} aria-hidden="true" style={{ opacity: 0.75 }}>
            <div className={styles.previewHead}>
              <span className={styles.previewAvatar}>
                <BuddyAvatar spec={avatar} size={78} />
              </span>
              <span className={styles.plus}>+</span>
              <span className={styles.previewAvatar}>
                <BuddyAvatar archetype="herb" size={78} />
              </span>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewRow}>
                <span className={styles.previewNames}>{COPY.matches.previewYou}</span>
                <span className={styles.previewPct}>94 %</span>
              </div>
              <div className="t-label" style={{ fontSize: 10.5 }}>
                {COPY.matches.previewSub}
              </div>
              <div className={styles.group}>
                <span className={styles.groupLabel}>{COPY.matches.previewBoth}</span>
                <div className={styles.pills}>
                  {['Jever', 'Rothaus', 'Flensburger'].map((n) => (
                    <span key={n} className={styles.pillLike}>
                      {n}
                    </span>
                  ))}
                </div>
              </div>
              <div className={styles.group}>
                <span className={styles.groupLabel}>{COPY.matches.previewDisagree}</span>
                <div className={styles.pills}>
                  <span className={styles.pillNope}>Beck's</span>
                </div>
              </div>
              <div className={styles.note} dangerouslySetInnerHTML={{ __html: COPY.matches.previewNote }} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
