import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CAFE_ID    = '11111111-1111-1111-1111-111111111111'
const TABLE_1_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TABLE_2_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const TABLE_3_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const TABLE_4_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const CAT_HOT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
const CAT_CLD_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
const CAT_EAT_ID = '00000000-0000-0000-0000-000000000001'

async function main() {
  // ── Cafe ───────────────────────────────────────────────────
  await prisma.cafe.upsert({
    where: { id: CAFE_ID },
    update: {},
    create: {
      id:       CAFE_ID,
      name:     'Sunrise Cafe',
      slug:     'sunrise-cafe',
      phone:    '9876543210',
      whatsapp: '9876543210',
      address:  '12, MG Road, Bengaluru, Karnataka 560001',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      settings: {
        accept_cash: true,
        accept_upi: true,
        accept_card: false,
        tax_percent: 5,
        service_charge_percent: 0,
        show_social_proof: true,
        languages: ['en', 'hi'],
      },
    },
  })

  // ── Tables ─────────────────────────────────────────────────
  const tables = [
    { id: TABLE_1_ID, number: 1, label: 'Window seat',  capacity: 2 },
    { id: TABLE_2_ID, number: 2, label: 'Main floor',   capacity: 4 },
    { id: TABLE_3_ID, number: 3, label: 'Rooftop',      capacity: 6 },
    { id: TABLE_4_ID, number: 4, label: 'Counter seat', capacity: 2 },
  ]
  for (const t of tables) {
    await prisma.cafeTable.upsert({
      where: { cafeId_number: { cafeId: CAFE_ID, number: t.number } },
      update: {},
      create: { ...t, cafeId: CAFE_ID },
    })
  }

  // ── Menu categories ────────────────────────────────────────
  const categories = [
    { id: CAT_HOT_ID, name: 'Hot Beverages',  nameHi: 'गर्म पेय',     sortOrder: 1 },
    { id: CAT_CLD_ID, name: 'Cold Beverages', nameHi: 'ठंडे पेय',     sortOrder: 2 },
    { id: CAT_EAT_ID, name: 'Snacks & Bites', nameHi: 'स्नैक्स',       sortOrder: 3 },
  ]
  for (const c of categories) {
    await prisma.menuCategory.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, cafeId: CAFE_ID },
    })
  }

  // ── Menu items ─────────────────────────────────────────────
  const items = [
    // Hot
    { categoryId: CAT_HOT_ID, name: 'Masala Chai',        nameHi: 'मसाला चाय',    price: 40,  isFeatured: true,  spiceLevel: 1, prepTimeMins: 5  },
    { categoryId: CAT_HOT_ID, name: 'Filter Coffee',       nameHi: 'फिल्टर कॉफी', price: 60,  isFeatured: true,  spiceLevel: 0, prepTimeMins: 7  },
    { categoryId: CAT_HOT_ID, name: 'Cappuccino',          nameHi: null,           price: 120, isFeatured: false, spiceLevel: 0, prepTimeMins: 8  },
    { categoryId: CAT_HOT_ID, name: 'Hot Chocolate',       nameHi: null,           price: 110, isFeatured: false, spiceLevel: 0, prepTimeMins: 6  },
    // Cold
    { categoryId: CAT_CLD_ID, name: 'Cold Coffee',         nameHi: 'कोल्ड कॉफी',  price: 130, isFeatured: true,  spiceLevel: 0, prepTimeMins: 8  },
    { categoryId: CAT_CLD_ID, name: 'Mango Lassi',         nameHi: 'आम लस्सी',    price: 90,  isFeatured: true,  spiceLevel: 0, prepTimeMins: 5  },
    { categoryId: CAT_CLD_ID, name: 'Lemon Mint Cooler',   nameHi: null,           price: 80,  isFeatured: false, spiceLevel: 0, prepTimeMins: 5  },
    // Snacks
    { categoryId: CAT_EAT_ID, name: 'Veg Sandwich',        nameHi: 'वेज सैंडविच', price: 120, isFeatured: true,  spiceLevel: 1, prepTimeMins: 12 },
    { categoryId: CAT_EAT_ID, name: 'Samosa (2 pcs)',      nameHi: 'समोसा',        price: 50,  isFeatured: false, spiceLevel: 2, prepTimeMins: 8  },
    { categoryId: CAT_EAT_ID, name: 'Banana Walnut Cake',  nameHi: null,           price: 95,  isFeatured: false, spiceLevel: 0, prepTimeMins: 5, isVeg: true, containsGluten: true, containsNuts: true },
  ]
  for (const item of items) {
    const existing = await prisma.menuItem.findFirst({
      where: { cafeId: CAFE_ID, name: item.name },
    })
    if (!existing) {
      await prisma.menuItem.create({
        data: { ...item, cafeId: CAFE_ID },
      })
    }
  }

  // ── Sample customers ───────────────────────────────────────
  const customers = [
    { phone: '9000000001', name: 'Priya Sharma',  totalOrders: 22, totalSpent: 6200, tags: ['vip'],     pointsBalance: 620 },
    { phone: '9000000002', name: 'Rohan Gupta',   totalOrders: 5,  totalSpent: 900,  tags: ['regular'], pointsBalance: 90  },
    { phone: '9000000003', name: 'Anjali Verma',  totalOrders: 1,  totalSpent: 180,  tags: [],          pointsBalance: 18  },
  ]
  for (const c of customers) {
    await prisma.customer.upsert({
      where: { cafeId_phone: { cafeId: CAFE_ID, phone: c.phone } },
      update: {},
      create: { ...c, cafeId: CAFE_ID, lastVisitAt: new Date() },
    })
  }

  // ── Loyalty config ─────────────────────────────────────────
  await prisma.loyaltyConfig.upsert({
    where: { cafeId: CAFE_ID },
    update: {},
    create: {
      cafeId: CAFE_ID,
      pointsPerRupee:    0.1,
      rupeesPerPoint:    0.5,
      minPointsToRedeem: 50,
      isEnabled:         true,
    },
  })

  console.log('✅  Sunrise Cafe seeded successfully')
  console.log('   3 categories, 10 items, 3 customers, loyalty config')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
