'use client'
import { useState } from 'react'

/**
 * Game and Chat, switched on the client.
 *
 * They used to be links carrying ?tab=chat, so opening the chat meant a
 * full server round trip — re-fetching the scoreboard from ESPN, the
 * viewer's positions and the message count — before anything appeared.
 * That's the second of nothing you'd feel on tapping it.
 *
 * Both panels are rendered by the server and this only decides which one
 * is on screen, so switching costs nothing. The URL is still updated so
 * a link to the chat can be shared, but with replaceState rather than a
 * navigation — the point is not to ask the server again.
 */
export default function GameTabs({ initial, base, chatCount, game, chat }: {
  initial: 'game' | 'chat'
  base: string
  chatCount: number
  game: React.ReactNode
  chat: React.ReactNode
}) {
  const [tab, setTab] = useState<'game' | 'chat'>(initial)

  function choose(next: 'game' | 'chat') {
    setTab(next)
    try {
      window.history.replaceState(null, '', next === 'chat' ? `${base}?tab=chat` : base)
    } catch {
      // Some embedded browsers refuse replaceState; the tab still works.
    }
  }

  return (
    <>
      <div className="gd-tabs">
        <button type="button" onClick={() => choose('game')}
          className={`gd-tab ${tab === 'game' ? 'active' : ''}`}>Game</button>
        <button type="button" onClick={() => choose('chat')}
          className={`gd-tab ${tab === 'chat' ? 'active' : ''}`}>
          Chat{chatCount ? <span className="gd-tab-count">{chatCount}</span> : null}
        </button>
      </div>

      {/* Both stay mounted. Hiding rather than unmounting keeps the chat's
          realtime subscription and scroll position alive across a switch,
          and means the messages are already there when you come back. */}
      <div hidden={tab !== 'game'}>{game}</div>
      <div hidden={tab !== 'chat'}>{chat}</div>
    </>
  )
}
