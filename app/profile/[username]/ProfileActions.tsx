'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function ProfileActions({ profileId, initiallyFollowing }: { profileId: string; initiallyFollowing: boolean }) {
  const supabase = createClient()
  const [following, setFollowing] = useState(initiallyFollowing)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSent, setReportSent] = useState(false)

  async function toggleFollow() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (following) {
      await supabase.from('follows').delete().match({ follower_id: user.id, following_id: profileId })
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profileId })
    }
    setFollowing(!following)
  }

  async function blockUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (!confirm('Block this user? You will no longer see their posts.')) return
    await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: profileId })
  }

  async function submitReport() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !reportReason.trim()) return
    await supabase.from('reports').insert({ reporter_id: user.id, reported_user_id: profileId, reason: reportReason })
    setReportSent(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      <button className={`btn follow ${following ? 'following' : ''}`} onClick={toggleFollow}>
        {following ? 'Following' : 'Follow'}
      </button>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="icon-btn" onClick={blockUser}>Block</button>
        <button className="icon-btn" onClick={() => setShowReport(v => !v)}>Report</button>
      </div>
      {showReport && !reportSent && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="field" style={{ margin: 0 }} placeholder="Reason"
            value={reportReason} onChange={e => setReportReason(e.target.value)} />
          <button className="btn" onClick={submitReport}>Send</button>
        </div>
      )}
      {reportSent && <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>Report sent.</span>}
    </div>
  )
}
