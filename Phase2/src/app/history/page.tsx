import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import HistoryClient from './HistoryClient'

interface Props {
  searchParams: { cafeId?: string }
}

export const metadata = { title: 'Order History' }

export default async function HistoryPage({ searchParams }: Props) {
  const cafeId = searchParams.cafeId
  if (!cafeId) notFound()

  // Verify the cafe exists
  const supabase = createAdminClient()
  const { data: cafe } = await supabase
    .from('cafes')
    .select('id, name')
    .eq('id', cafeId)
    .eq('is_active', true)
    .single()

  if (!cafe) notFound()

  return <HistoryClient cafeId={cafe.id} />
}
