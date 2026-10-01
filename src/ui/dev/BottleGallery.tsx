import { BEERS } from '../../data/beers'
import { BeerBottle } from '../components/BeerBottle'

/** Dev only (`?gallery=bottles`): every beer's bottle on its beer colour – hand-tuned design if present,
 * otherwise derived from the beer's data (caption marked „abgeleitet“). */
export default function BottleGallery() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 16, background: 'var(--page)', minHeight: '100vh' }}>
      {BEERS.map((b) => (
        <figure key={b.id} style={{ margin: 0, width: 120, textAlign: 'center', font: '600 11px var(--font-mono)' }}>
          <div style={{ background: b.color, borderRadius: 14, border: '2px solid var(--edge)', padding: '10px 0 4px' }}>
            <BeerBottle beer={b} size={180} />
          </div>
          <figcaption style={{ marginTop: 4 }}>
            {b.id}
            {!b.bottle && <span style={{ color: 'var(--nope)' }}> · abgeleitet</span>}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
