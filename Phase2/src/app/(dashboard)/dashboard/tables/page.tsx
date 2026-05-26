import { createAdminClient } from '@/lib/supabase/server'
import type { Table } from '@/lib/types'
import TablesClient from './TablesClient'

const DEMO_CAFE_ID   = '11111111-1111-1111-1111-111111111111'
const DEMO_CAFE_SLUG = 'sunrise-cafe'

export default async function TablesPage() {
  const supabase = createAdminClient()

  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .eq('cafe_id', DEMO_CAFE_ID)
    .order('number')

  return (
    <TablesClient
      initialTables={(tables ?? []) as Table[]}
      cafeId={DEMO_CAFE_ID}
      cafeSlug={DEMO_CAFE_SLUG}
    />
  )
}
