import { DownloadPage } from '@/app/page'

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <DownloadPage token={token} />
}