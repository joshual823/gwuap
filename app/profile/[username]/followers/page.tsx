import FollowList from '../FollowList'

export const dynamic = 'force-dynamic'

export default async function FollowersPage(props: { params: Promise<{ username: string }> }) {
  const { username } = await props.params
  return <FollowList username={username} mode="followers" />
}
