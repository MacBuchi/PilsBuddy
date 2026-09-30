import { act, cleanup, fireEvent, render, within } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getBeer } from '../../data/beers'
import { SwipeDeck } from './SwipeDeck'
import type { SwipeDeckHandle } from './SwipeDeck'

const queue = ['jever', 'augustiner', 'becks'].map(getBeer)
let clock = 0

beforeEach(() => {
  vi.useFakeTimers()
  clock = 0
  // every pointer event is 50 ms after the previous one → slow, deliberate drags
  vi.spyOn(performance, 'now').mockImplementation(() => (clock += 50))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function setup(extra: Partial<Parameters<typeof SwipeDeck>[0]> = {}) {
  const onCommit = vi.fn()
  const onTap = vi.fn()
  const ref = createRef<SwipeDeckHandle>()
  const utils = render(<SwipeDeck ref={ref} queue={queue} onCommit={onCommit} onTap={onTap} {...extra} />)
  const top = () => utils.container.querySelector<HTMLElement>('[aria-hidden="false"]')!
  return { onCommit, onTap, ref, top, ...utils }
}

function drag(el: HTMLElement, dx: number, dy: number) {
  fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1, button: 0 })
  const steps = 5
  for (let i = 1; i <= steps; i++) {
    fireEvent.pointerMove(el, { clientX: 100 + (dx * i) / steps, clientY: 100 + (dy * i) / steps, pointerId: 1 })
  }
  fireEvent.pointerUp(el, { clientX: 100 + dx, clientY: 100 + dy, pointerId: 1 })
}

describe('SwipeDeck', () => {
  it('shows at most three cards, the first one on top', () => {
    const { container, top } = setup()
    expect(container.querySelectorAll('[aria-hidden]')).toHaveLength(3)
    expect(top().textContent).toContain('Jever')
  })

  it('commits LIKE when dragged past the threshold to the right', () => {
    const { onCommit, top } = setup()
    drag(top(), 160, 0)
    expect(onCommit).not.toHaveBeenCalled() // still flying out
    act(() => vi.advanceTimersByTime(400))
    expect(onCommit).toHaveBeenCalledWith(queue[0], 'LIKE')
  })

  it('maps the four directions to their ratings', () => {
    const cases: [number, number, string][] = [
      [-160, 0, 'DISLIKE'],
      [0, -160, 'WANT_TO_TRY'],
      [0, 170, 'UNKNOWN'],
    ]
    for (const [dx, dy, rating] of cases) {
      const { onCommit, top } = setup()
      drag(top(), dx, dy)
      act(() => vi.advanceTimersByTime(400))
      expect(onCommit).toHaveBeenCalledWith(queue[0], rating)
      cleanup()
    }
  })

  it('snaps back on a short, slow drag', () => {
    const { onCommit, onTap, top } = setup()
    drag(top(), 60, 10)
    act(() => vi.advanceTimersByTime(600))
    expect(onCommit).not.toHaveBeenCalled()
    expect(onTap).not.toHaveBeenCalled()
    expect(top().style.transform).toBe('translate(0px, 0px) rotate(0deg)')
  })

  it('treats a tiny movement as a tap', () => {
    const { onCommit, onTap, top } = setup()
    drag(top(), 3, 2)
    expect(onTap).toHaveBeenCalledWith(queue[0])
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('opens the detail with Enter on the focused top card', () => {
    const { onTap, top } = setup()
    fireEvent.keyDown(top(), { key: 'Enter' })
    expect(onTap).toHaveBeenCalledWith(queue[0])
  })

  it('commits via the imperative handle (buttons, keyboard)', () => {
    const { onCommit, ref } = setup()
    act(() => ref.current!.commit('KNOW'))
    act(() => vi.advanceTimersByTime(400))
    expect(onCommit).toHaveBeenCalledWith(queue[0], 'KNOW')
  })

  it('ignores a second commit while the card is still flying', () => {
    const { onCommit, ref } = setup()
    act(() => ref.current!.commit('LIKE'))
    act(() => ref.current!.commit('DISLIKE'))
    act(() => vi.advanceTimersByTime(400))
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(queue[0], 'LIKE')
  })

  it('tilts the top card and shows the stamp for the coach offset', () => {
    const { top } = setup({ coachOffset: { x: 92, y: 0 } })
    expect(top().style.transform).toContain('translate(92px, 0px)')
    expect(Number(within(top()).getByText('MAG ICH').style.opacity)).toBeGreaterThan(0.8)
  })

  it('rewind starts the returning card at its exit position', () => {
    const { ref, top } = setup()
    act(() => ref.current!.rewind('jever', 'DISLIKE'))
    expect(top().style.transform).toContain('translate(-560px, 60px)')
    expect(top().style.transition).toBe('none')
  })
})
