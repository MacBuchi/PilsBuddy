import { BEERS } from '../../data/beers'
import { BottleArt } from '../components/BottleArt'

/** Dev only (`?gallery=bottles`): every beer's bottle on its beer colour – designed PNG if present. */
export default function BottleGallery() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 16, background: 'var(--page)', minHeight: '100vh' }}>
      {BEERS.map((b) => (
        <figure key={b.id} style={{ margin: 0, width: 120, textAlign: 'center', font: '600 11px var(--font-mono)' }}>
          <div style={{ background: b.color, borderRadius: 14, border: '2px solid var(--edge)', padding: '10px 0 4px' }}>
            {b.image ? <img src={b.image} alt="" style={{ height: 180 }} /> : <BottleArt beer={b} size={180} />}
          </div>
          <figcaption style={{ marginTop: 4 }}>{b.id}</figcaption>
        </figure>
      ))}
    </div>
  )
}
