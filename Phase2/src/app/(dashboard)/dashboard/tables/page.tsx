import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'
import type { Table } from '@/lib/types'
import NoCafeSetup from '@/components/dashboard/NoCafeSetup'
import TablesClient from './TablesClient'

export default async function TablesPage() {
  const cafe = await getOwnerCafe()
  if (!cafe) return <NoCafeSetup />

  const supabase = createAdminClient()

  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .eq('cafe_id', cafe.id)
    .order('number')

  return (
    <TablesClient
      initialTables={(tables ?? []) as Table[]}
      cafeId={cafe.id}
      cafeSlug={cafe.slug}
    />
  )
}
