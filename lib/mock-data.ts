export interface Farm {
  id: string
  slug: string
  name: string
  place: string
  region: string
  type: string
  pricePaise: number
  rating: string
  reviews: number
  image: string
  tag: string
  description: string
  amenities: string[]
  sleeps: number
  maxGuests: number
  verified?: boolean
  organicPct?: number
  hostName?: string
  hostPhone?: string
}

export interface Produce {
  id: string
  name: string
  detail: string
  pricePaise: number
  image: string
}

export interface DashboardBooking {
  id: string
  guestName: string
  guestCount: number
  farmName: string
  nights: number
  day: string
  month: string
  status: 'Confirmed' | 'Pending'
}

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  unit: string
  stockPercent: number
  statusText: string
  isLowStock?: boolean
}

export interface CropData {
  id: string
  name: string
  place: string
  region: string
  harvestMonths: number[] // 0-indexed: 0=Jan ... 11=Dec
  sowingMonths: number[]  // 0-indexed: 0=Jan ... 11=Dec
  linkedFarmSlugs: string[]
}

export interface FarmActivity {
  id: string
  farmSlug: string
  name: string
  kind?: 'farming' | 'culinary' | 'relaxation'
  bestMonths: number[]
}


export const FARMS: Farm[] = [
  {
    id: 'farm-1',
    slug: 'kokan-roots-farmstay',
    name: 'Kokan Roots Farmstay',
    place: 'Ratnagiri, Maharashtra',
    region: 'Maharashtra',
    type: 'Farm stay · Hurda party',
    pricePaise: 285000,
    rating: '4.9',
    reviews: 42,
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=85',
    tag: 'Top rated',
    description: 'Wake up to birdsong, share a meal made from the morning harvest, and spend an unhurried day learning the rhythms of a real working farm in Ratnagiri.',
    amenities: ['Organic meals', 'Sleeps 4', 'Flexible check-in'],
    sleeps: 4,
    maxGuests: 4,
    verified: true,
    organicPct: 90,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
  },
  {
    id: 'farm-2',
    slug: 'aamrai-orchard-escape',
    name: 'Aamrai Orchard Escape',
    place: 'Alphonso country, Ratnagiri',
    region: 'Maharashtra',
    type: 'Fruit picking · Orchard',
    pricePaise: 190000,
    rating: '4.8',
    reviews: 31,
    image: 'https://images.unsplash.com/photo-1523742810464-7d7f6f9b7a9b?auto=format&fit=crop&w=900&q=85',
    tag: 'Seasonal',
    description: 'Set inside mature Alphonso mango orchards. Spend mornings picking fruit and evenings tasting stone-ground Konkani dinners with host families.',
    amenities: ['Orchard walks', 'Sleeps 8', 'Fresh mango tasting'],
    sleeps: 8,
    maxGuests: 8,
    verified: true,
    organicPct: 100,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
  },
  {
    id: 'farm-3',
    slug: 'sahyadri-soil-and-soul',
    name: 'Sahyadri Soil & Soul',
    place: 'Panchgani, Maharashtra',
    region: 'Maharashtra',
    type: 'Cattle tending · Village lunch',
    pricePaise: 165000,
    rating: '4.7',
    reviews: 26,
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=900&q=85',
    tag: 'New',
    description: 'A hillside working farm in the Sahyadri ranges. Learn cattle tending, churn fresh butter, and share a warm village lunch with the family.',
    amenities: ['Cattle tending', 'Sleeps 4', 'Wood-fired kitchen'],
    sleeps: 4,
    maxGuests: 4,
    verified: true,
    organicPct: 75,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
  },
  {
    id: 'farm-4',
    slug: 'gur-ghar-kolhapur',
    name: 'Gur Ghar Kolhapur',
    place: 'Kolhapur, Maharashtra',
    region: 'Maharashtra',
    type: 'Jaggery making · Sugarcane',
    pricePaise: 120000,
    rating: '4.8',
    reviews: 29,
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=900&q=85',
    tag: 'Authentic',
    description: 'Watch traditional jaggery-making from fresh sugarcane crush, learn the kolhu press, and taste warm gur straight from the pan.',
    amenities: ['Sugarcane crush', 'Sleeps 6', 'Wood-fired kitchen'],
    sleeps: 6,
    maxGuests: 6,
    verified: true,
    organicPct: 80,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
  },
  {
    id: 'farm-5',
    slug: 'draksha-valley-stay',
    name: 'Draksha Valley Stay',
    place: 'Nashik, Maharashtra',
    region: 'Maharashtra',
    type: 'Vineyard stay · Grape picking',
    pricePaise: 220000,
    rating: '4.9',
    reviews: 34,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=85',
    tag: 'Seasonal',
    description: 'Stay in the grape belt of Maharashtra. Join guided vineyard walks, press your own grapes, and enjoy farm-to-table meals in the valley.',
    amenities: ['Vineyard walks', 'Sleeps 5', 'Grape pressing'],
    sleeps: 5,
    maxGuests: 5,
    verified: true,
    organicPct: 85,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
  },
  {
    id: 'farm-6',
    slug: 'spice-hills-homestay',
    name: 'Spice Hills Homestay',
    place: 'Wayanad, Kerala',
    region: 'Kerala',
    type: 'Spice plantation · Forest stay',
    pricePaise: 175000,
    rating: '4.9',
    reviews: 48,
    image: 'https://images.unsplash.com/photo-1466096115517-bceecbfb6fde?auto=format&fit=crop&w=900&q=85',
    tag: 'Top rated',
    description: 'A working spice plantation in the Western Ghats. Walk through cardamom, pepper, and vanilla groves and cook a traditional Kerala meal with fresh pickings.',
    amenities: ['Cardamom walks', 'Sleeps 4', 'Kerala cooking'],
    sleeps: 4,
    maxGuests: 4,
    verified: true,
    organicPct: 95,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
  },
  {
    id: 'farm-7',
    slug: 'sarson-da-khet',
    name: 'Sarson da Khet',
    place: 'Amritsar, Punjab',
    region: 'Punjab',
    type: 'Mustard harvest · Tractor rides',
    pricePaise: 135000,
    rating: '4.8',
    reviews: 37,
    image: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=900&q=85',
    tag: 'Traditional',
    description: 'Golden mustard fields stretch to the horizon. Help with the Baisakhi harvest, learn traditional bhatti cooking, and ride a tractor at dawn.',
    amenities: ['Tractor rides', 'Sleeps 8', 'Bhatti meals'],
    sleeps: 8,
    maxGuests: 8,
    verified: true,
    organicPct: 80,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
  },
]

export const PRODUCE_ITEMS: Produce[] = [
  {
    id: 'prod-1',
    name: 'Organic jaggery',
    detail: '500 g · Kolhapur',
    pricePaise: 18000,
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 'prod-2',
    name: 'Ratnagiri Alphonso',
    detail: '1 dozen · seasonal',
    pricePaise: 95000,
    image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 'prod-3',
    name: 'Village masala chai',
    detail: '250 g · hand-ground',
    pricePaise: 22000,
    image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=600&q=85',
  },
]

export const CROPS: CropData[] = [
  {
    id: 'crop-1',
    name: 'Hurda (Winter Jowar)',
    place: 'Sangamner',
    region: 'Maharashtra',
    harvestMonths: [11, 0, 1], // Dec-Feb (wraps Dec to Jan)
    sowingMonths: [8, 9],      // Sep-Oct
    linkedFarmSlugs: ['kokan-roots-farmstay', 'sahyadri-soil-and-soul'],
  },
  {
    id: 'crop-2',
    name: 'Kerala Spices',
    place: 'Wayanad',
    region: 'Kerala',
    harvestMonths: [1, 2, 3],  // Feb-Apr
    sowingMonths: [5, 6],      // Jun-Jul
    linkedFarmSlugs: ['spice-hills-homestay'],
  },
  {
    id: 'crop-3',
    name: 'Kinnow Oranges',
    place: 'Abohar',
    region: 'Punjab',
    harvestMonths: [11, 0, 1, 2], // Dec-Mar (wraps Dec to Jan)
    sowingMonths: [6, 7],         // Jul-Aug
    linkedFarmSlugs: ['sarson-da-khet'],
  },
  {
    id: 'crop-4',
    name: 'Assam Tea',
    place: 'Tezpur',
    region: 'Assam',
    harvestMonths: [2, 3, 4, 5], // Mar-Jun
    sowingMonths: [9, 10],       // Oct-Nov
    linkedFarmSlugs: [],
  },
  {
    id: 'crop-5',
    name: 'Strawberry',
    place: 'Mahabaleshwar',
    region: 'Maharashtra',
    harvestMonths: [11, 0, 1, 2], // Dec-Mar (wraps Dec to Jan)
    sowingMonths: [8, 9],         // Sep-Oct
    linkedFarmSlugs: ['kokan-roots-farmstay'],
  },
  {
    id: 'crop-6',
    name: 'Mustard (Sarson)',
    place: 'Amritsar',
    region: 'Punjab',
    harvestMonths: [1, 2, 3], // Feb-Apr
    sowingMonths: [9, 10],    // Oct-Nov
    linkedFarmSlugs: ['sarson-da-khet', 'gur-ghar-kolhapur'],
  },
  {
    id: 'crop-7',
    name: 'Alphonso Mango',
    place: 'Ratnagiri',
    region: 'Maharashtra',
    harvestMonths: [3, 4, 5], // Apr-Jun
    sowingMonths: [6, 7],     // Jul-Aug
    linkedFarmSlugs: ['aamrai-orchard-escape'],
  },
  {
    id: 'crop-8',
    name: 'Coorg Coffee',
    place: 'Coorg',
    region: 'Karnataka',
    harvestMonths: [10, 11, 0], // Nov-Jan (wraps Dec to Jan)
    sowingMonths: [5, 6],       // Jun-Jul
    linkedFarmSlugs: ['spice-hills-homestay'],
  },
  {
    id: 'crop-9',
    name: 'Nashik Grapes',
    place: 'Nashik',
    region: 'Maharashtra',
    harvestMonths: [1, 2, 3], // Feb-Apr
    sowingMonths: [8, 9],     // Sep-Oct
    linkedFarmSlugs: ['draksha-valley-stay', 'sahyadri-soil-and-soul'],
  },
  {
    id: 'crop-10',
    name: 'Wheat',
    place: 'Ludhiana',
    region: 'Punjab',
    harvestMonths: [3, 4], // Apr-May
    sowingMonths: [9, 10], // Oct-Nov
    linkedFarmSlugs: ['sarson-da-khet'],
  },
  {
    id: 'crop-11',
    name: 'Apple',
    place: 'Shimla',
    region: 'Himachal Pradesh',
    harvestMonths: [7, 8, 9], // Aug-Oct
    sowingMonths: [0, 1],     // Jan-Feb
    linkedFarmSlugs: [],
  },
  {
    id: 'crop-12',
    name: 'Saffron (Kesar)',
    place: 'Pampore',
    region: 'Kashmir',
    harvestMonths: [9, 10], // Oct-Nov
    sowingMonths: [6, 7],   // Jul-Aug
    linkedFarmSlugs: [],
  },
]

export const DASHBOARD_BOOKINGS: DashboardBooking[] = [
  {
    id: 'bk-1',
    guestName: 'Meera & 3 guests',
    guestCount: 4,
    farmName: 'Kokan Roots',
    nights: 2,
    day: '18',
    month: 'JUN',
    status: 'Confirmed',
  },
  {
    id: 'bk-2',
    guestName: 'Rohan Mehta',
    guestCount: 1,
    farmName: 'Kokan Roots',
    nights: 1,
    day: '24',
    month: 'JUN',
    status: 'Pending',
  },
]

export const INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'inv-1',
    name: 'Mangoes',
    quantity: 42,
    unit: 'dozen',
    stockPercent: 72,
    statusText: 'Healthy stock',
  },
  {
    id: 'inv-2',
    name: 'Organic jaggery',
    quantity: 18,
    unit: 'kg',
    stockPercent: 45,
    statusText: 'Restock soon',
    isLowStock: true,
  },
  {
    id: 'inv-3',
    name: 'Village masala chai',
    quantity: 30,
    unit: 'packs',
    stockPercent: 58,
    statusText: 'Healthy stock',
  },
]

export function getAllFarms(): Farm[] {
  return FARMS
}

export function getFarmBySlug(slug: string): Farm | undefined {
  return FARMS.find((f) => f.slug === slug)
}

export function getAllProduce(): Produce[] {
  return PRODUCE_ITEMS
}

export function getAllCrops(): CropData[] {
  return CROPS
}

export const ACTIVITIES: FarmActivity[] = [
  // Farm 1: Kokan Roots
  { id: 'act-1', farmSlug: 'kokan-roots-farmstay', name: 'Hurda roasting on open hearth', kind: 'culinary', bestMonths: [11, 0, 1] },
  { id: 'act-2', farmSlug: 'kokan-roots-farmstay', name: 'Morning rice paddy walk', kind: 'farming', bestMonths: [6, 7, 8, 9] },
  { id: 'act-3', farmSlug: 'kokan-roots-farmstay', name: 'Cow milking and shed tending', kind: 'farming', bestMonths: [] },
  { id: 'act-4', farmSlug: 'kokan-roots-farmstay', name: 'Chutney grinding on sil-batta', kind: 'culinary', bestMonths: [] },
  { id: 'act-5', farmSlug: 'kokan-roots-farmstay', name: 'Hammock reading under teakwood', kind: 'relaxation', bestMonths: [] },

  // Farm 2: Aamrai Orchard Escape
  { id: 'act-6', farmSlug: 'aamrai-orchard-escape', name: 'Alphonso harvest and plucking', kind: 'farming', bestMonths: [3, 4, 5] },
  { id: 'act-7', farmSlug: 'aamrai-orchard-escape', name: 'Raw mango pickle workshop', kind: 'culinary', bestMonths: [2, 3, 4] },
  { id: 'act-8', farmSlug: 'aamrai-orchard-escape', name: 'Orchard trail and birdwatching', kind: 'relaxation', bestMonths: [] },
  { id: 'act-9', farmSlug: 'aamrai-orchard-escape', name: 'Konkani wood-fired fish curry', kind: 'culinary', bestMonths: [] },
  { id: 'act-10', farmSlug: 'aamrai-orchard-escape', name: 'Sunset tea atop the laterite ridge', kind: 'relaxation', bestMonths: [] },

  // Farm 3: Sahyadri Soil and Soul
  { id: 'act-11', farmSlug: 'sahyadri-soil-and-soul', name: 'Desi cow butter churning', kind: 'culinary', bestMonths: [] },
  { id: 'act-12', farmSlug: 'sahyadri-soil-and-soul', name: 'Terraced vegetable weeding', kind: 'farming', bestMonths: [5, 6, 7, 8] },
  { id: 'act-13', farmSlug: 'sahyadri-soil-and-soul', name: 'Compost making and soil prep', kind: 'farming', bestMonths: [] },
  { id: 'act-14', farmSlug: 'sahyadri-soil-and-soul', name: 'Valley breeze meditation sit', kind: 'relaxation', bestMonths: [] },
  { id: 'act-15', farmSlug: 'sahyadri-soil-and-soul', name: 'Chulha flatbread dinner circle', kind: 'culinary', bestMonths: [] },

  // Farm 4: Gur Ghar Kolhapur
  { id: 'act-16', farmSlug: 'gur-ghar-kolhapur', name: 'Sugarcane harvesting and cutting', kind: 'farming', bestMonths: [10, 11, 0, 1] },
  { id: 'act-17', farmSlug: 'gur-ghar-kolhapur', name: 'Kolhu bullock press demonstration', kind: 'farming', bestMonths: [10, 11, 0, 1] },
  { id: 'act-18', farmSlug: 'gur-ghar-kolhapur', name: 'Warm gur tasting and ladle work', kind: 'culinary', bestMonths: [10, 11, 0, 1] },
  { id: 'act-19', farmSlug: 'gur-ghar-kolhapur', name: 'Village tree shade resting', kind: 'relaxation', bestMonths: [] },

  // Farm 5: Draksha Valley Stay
  { id: 'act-20', farmSlug: 'draksha-valley-stay', name: 'Table grape plucking and packing', kind: 'farming', bestMonths: [1, 2, 3] },
  { id: 'act-21', farmSlug: 'draksha-valley-stay', name: 'Vineyard canopy pruning session', kind: 'farming', bestMonths: [8, 9, 10] },
  { id: 'act-22', farmSlug: 'draksha-valley-stay', name: 'Sun-dried raisin sorting', kind: 'culinary', bestMonths: [2, 3, 4] },
  { id: 'act-23', farmSlug: 'draksha-valley-stay', name: 'Fresh juice pressing workshop', kind: 'culinary', bestMonths: [1, 2, 3] },
  { id: 'act-24', farmSlug: 'draksha-valley-stay', name: 'Vine row twilight stroll', kind: 'relaxation', bestMonths: [] },

  // Farm 6: Spice Hills Homestay
  { id: 'act-25', farmSlug: 'spice-hills-homestay', name: 'Cardamom pod harvest at dawn', kind: 'farming', bestMonths: [1, 2, 3] },
  { id: 'act-26', farmSlug: 'spice-hills-homestay', name: 'Black pepper vine hand-picking', kind: 'farming', bestMonths: [0, 1, 2] },
  { id: 'act-27', farmSlug: 'spice-hills-homestay', name: 'Kerala spice blend roasting', kind: 'culinary', bestMonths: [] },
  { id: 'act-28', farmSlug: 'spice-hills-homestay', name: 'Bamboo grove sound walk', kind: 'relaxation', bestMonths: [] },
  { id: 'act-29', farmSlug: 'spice-hills-homestay', name: 'Ayurvedic herbal foot soak', kind: 'relaxation', bestMonths: [] },

  // Farm 7: Sarson da Khet
  { id: 'act-30', farmSlug: 'sarson-da-khet', name: 'Dawn tractor ride across fields', kind: 'farming', bestMonths: [] },
  { id: 'act-31', farmSlug: 'sarson-da-khet', name: 'Mustard cutting and bundling', kind: 'farming', bestMonths: [1, 2, 3] },
  { id: 'act-32', farmSlug: 'sarson-da-khet', name: 'Saag making in earthenware handi', kind: 'culinary', bestMonths: [11, 0, 1, 2] },
  { id: 'act-33', farmSlug: 'sarson-da-khet', name: 'Bhatti tandoor baking', kind: 'culinary', bestMonths: [] },
  { id: 'act-34', farmSlug: 'sarson-da-khet', name: 'Charpai resting under neem tree', kind: 'relaxation', bestMonths: [] },
]

export function getAllActivities(): FarmActivity[] {
  return ACTIVITIES
}


export interface ReviewPhoto {
  id: string
  url: string
}

export interface FarmReview {
  id: string
  farm_id: string
  user_id?: string
  booking_id?: string
  rating_food: number
  rating_cleanliness: number
  rating_hospitality: number
  rating_location: number
  comment: string
  created_at: string
  profiles?: {
    full_name?: string
  } | null
  review_photos?: ReviewPhoto[]
}

export function getFallbackReviews(slug: string): FarmReview[] {
  const farm = FARMS.find((f) => f.slug === slug)
  const farmId = farm ? farm.id : 'farm-1'

  const photosPool = [
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=600&q=80',
  ]

  return [
    {
      id: `${farmId}-rev-1`,
      farm_id: farmId,
      rating_food: 5,
      rating_cleanliness: 5,
      rating_hospitality: 5,
      rating_location: 5,
      comment: 'The open hearth roasting and fresh morning harvests were unforgettable. Authentic rural hospitality with peaceful silence.',
      created_at: '2025-02-12T10:00:00Z',
      profiles: { full_name: 'Meera Kulkarni' },
      review_photos: [
        { id: 'p1', url: photosPool[0] },
        { id: 'p2', url: photosPool[1] },
      ],
    },
    {
      id: `${farmId}-rev-2`,
      farm_id: farmId,
      rating_food: 5,
      rating_cleanliness: 4,
      rating_hospitality: 5,
      rating_location: 5,
      comment: 'Birdsong at dawn, thick green groves, and fresh meals cooked over wood fire. Total calm and genuine care.',
      created_at: '2025-02-18T14:30:00Z',
      profiles: { full_name: 'Arjun Deshmukh' },
      review_photos: [
        { id: 'p3', url: photosPool[2] },
      ],
    },
    {
      id: `${farmId}-rev-3`,
      farm_id: farmId,
      rating_food: 4,
      rating_cleanliness: 5,
      rating_hospitality: 5,
      rating_location: 4,
      comment: 'Wonderful host family. The children loved the farm walkthrough and learning how crops are tended. We will return next season.',
      created_at: '2025-03-02T11:15:00Z',
      profiles: { full_name: 'Pooja Sharma' },
      review_photos: [
        { id: 'p4', url: photosPool[3] },
        { id: 'p5', url: photosPool[4] },
      ],
    },
  ]
}
