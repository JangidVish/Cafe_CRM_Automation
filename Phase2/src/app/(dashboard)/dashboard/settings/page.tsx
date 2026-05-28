import { createAdminClient, getOwnerCafe } from '@/lib/supabase/server'
import NoCafeSetup from '@/components/dashboard/NoCafeSetup'
import SettingsClient from './SettingsClient'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const cafe = await getOwnerCafe()
  if (!cafe) return <NoCafeSetup />

  const supabase = createAdminClient()
  const { data: row } = await supabase
    .from('cafes')
    .select('settings')
    .eq('id', cafe.id)
    .single()

  const settings = (row?.settings ?? {}) as Record<string, any>

  return (
    <SettingsClient
      cafeId={cafe.id}
      serviceChargePercent={typeof settings.service_charge_percent === 'number' ? settings.service_charge_percent : 0}
      taxPercent={typeof settings.tax_percent === 'number' ? settings.tax_percent : 5}
      promoCodes={Array.isArray(settings.promo_codes) ? settings.promo_codes : []}
    />
  )
}
