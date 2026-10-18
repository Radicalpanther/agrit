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
  image?: string
  stock?: number
  unit?: string
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
    image: 'https://i.ibb.co/CsKRHJv0/images.jpg',
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
  {
    id: 'farm-8',
    slug: 'himachal-apple-highlands',
    name: 'Himachal Apple Highlands',
    place: 'Kotgarh, Shimla',
    region: 'Himachal Pradesh',
    type: 'Apple orchard · Mountain retreat',
    pricePaise: 260000,
    rating: '4.9',
    reviews: 38,
    image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=900&q=85',
    tag: 'Mountain stay',
    description: 'Perched on high Himalayan slopes amidst century-old heritage apple orchards. Walk through blossoming terraces in spring, hand-pick crisp apples in autumn, and taste warm wood-fired Pahadi rajma by the hearth.',
    amenities: ['Apple picking', 'Sleeps 6', 'Cedar forest trails'],
    sleeps: 6,
    maxGuests: 6,
    verified: true,
    organicPct: 95,
    hostName: 'Surender Stokes',
    hostPhone: '+919800000010',
  },
  {
    id: 'farm-9',
    slug: 'pampore-saffron-haven',
    name: 'Pampore Saffron Haven',
    place: 'Pampore, Kashmir',
    region: 'Kashmir',
    type: 'Saffron fields · Walnut orchard',
    pricePaise: 320000,
    rating: '4.9',
    reviews: 44,
    image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=85',
    tag: 'Top rated',
    description: 'Located in the historic saffron plateaus (karewas) of Pampore. Experience purple saffron blossoms at autumn dawn, learn the delicate art of stigma plucking, and sip steaming saffron kahwa brewed on a brass samovar.',
    amenities: ['Saffron trails', 'Sleeps 4', 'Kahwa tasting'],
    sleeps: 4,
    maxGuests: 4,
    verified: true,
    organicPct: 100,
    hostName: 'Bashir Ahmad Wani',
    hostPhone: '+919800000011',
  },
  {
    id: 'farm-10',
    slug: 'brahmaputra-tea-estate',
    name: 'Brahmaputra Heritage Tea Estate',
    place: 'Tezpur, Assam',
    region: 'Assam',
    type: 'Tea plantation · Riverfront estate',
    pricePaise: 240000,
    rating: '4.8',
    reviews: 33,
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=900&q=85',
    tag: 'Heritage',
    description: 'Sprawling across gentle hills bordered by the mighty Brahmaputra river. Join traditional tea pluckers with woven baskets at daybreak, witness leaf withering and oxidation, and sleep in a restored colonial planter home.',
    amenities: ['Tea tasting', 'Sleeps 6', 'Riverfront walks'],
    sleeps: 6,
    maxGuests: 6,
    verified: true,
    organicPct: 90,
    hostName: 'Pranab Saikia',
    hostPhone: '+919800000012',
  },
  {
    id: 'farm-11',
    slug: 'coorg-cloud-coffee-estate',
    name: 'Coorg Cloud Coffee Estate',
    place: 'Madikeri, Coorg',
    region: 'Karnataka',
    type: 'Coffee estate · Rain-forest farm',
    pricePaise: 210000,
    rating: '4.9',
    reviews: 52,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=85',
    tag: 'Top rated',
    description: 'An ancient shade-grown coffee plantation enveloped in mist and rainforest greenery. Walk along pepper vines clinging to silver oak trees, hand-pick ripe red coffee berries, and brew estate pour-overs on the veranda.',
    amenities: ['Coffee cupping', 'Sleeps 6', 'Spice walks'],
    sleeps: 6,
    maxGuests: 6,
    verified: true,
    organicPct: 95,
    hostName: 'Kaveri Bopanna',
    hostPhone: '+919800000013',
  },
  {
    id: 'farm-12',
    slug: 'gir-somnath-kesar-grove',
    name: 'Gir Somnath Kesar Grove',
    place: 'Talala Gir, Gujarat',
    region: 'Gujarat',
    type: 'Kesar mango · Gir cow sanctuary',
    pricePaise: 185000,
    rating: '4.8',
    reviews: 29,
    image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=900&q=85',
    tag: 'Seasonal',
    description: 'Located in the famous Gir Kesar mango heartland near Gir National Park. Experience organic mango orchards watered from natural step-wells, interact with native Gir cows, and taste hot Bajra rotla with fresh white butter.',
    amenities: ['Mango harvest', 'Sleeps 8', 'Gir cow gaushala'],
    sleeps: 8,
    maxGuests: 8,
    verified: true,
    organicPct: 100,
    hostName: 'Devraj Vala',
    hostPhone: '+919800000014',
  },
  {
    id: 'farm-13',
    slug: 'thar-desert-farmstead',
    name: 'Thar Desert Organic Farmstead',
    place: 'Pushkar, Rajasthan',
    region: 'Rajasthan',
    type: 'Rose cultivation · Organic millet',
    pricePaise: 195000,
    rating: '4.8',
    reviews: 36,
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=900&q=85',
    tag: 'Desert oasis',
    description: 'An oasis of organic farming where desert sands meet fragrant fields of indigenous Damask roses and pearl millet. Witness early dawn rose-water distillation, explore sandy trails on camel carts, and eat under star-lit skies.',
    amenities: ['Rose distillation', 'Sleeps 6', 'Camel rides'],
    sleeps: 6,
    maxGuests: 6,
    verified: true,
    organicPct: 90,
    hostName: 'Rameshwar Gurjar',
    hostPhone: '+919800000015',
  },
  {
    id: 'farm-14',
    slug: 'narmada-valley-heritage-farm',
    name: 'Narmada Valley Heritage Farm',
    place: 'Hoshangabad, Madhya Pradesh',
    region: 'Madhya Pradesh',
    type: 'Sharbati wheat · Organic pulses',
    pricePaise: 145000,
    rating: '4.7',
    reviews: 24,
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=85',
    tag: 'River valley',
    description: 'Located in the rich black soil floodplains of the sacred Narmada river. Known for famous Sharbati golden wheat and organic chickpeas. Experience community harvesting, riverbank walks, and comforting central Indian village meals.',
    amenities: ['Wheat gleaning', 'Sleeps 6', 'Riverfront views'],
    sleeps: 6,
    maxGuests: 6,
    verified: true,
    organicPct: 85,
    hostName: 'Shyamlal Yadav',
    hostPhone: '+919800000016',
  },
  {
    id: 'farm-15',
    slug: 'kumaon-terrace-orchard',
    name: 'Kumaon Terrace Orchard Farm',
    place: 'Mukteshwar, Uttarakhand',
    region: 'Uttarakhand',
    type: 'Terraced fruit farm · Himalayan view',
    pricePaise: 230000,
    rating: '4.9',
    reviews: 41,
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85',
    tag: 'Mountain view',
    description: 'Perched at 7,000 feet with panoramic views of snow-capped Trishul and Nanda Devi peaks. Wander through terraced orchards of apricots, wild plums, and mountain herbs, and enjoy hearty Pahadi meals cooked in brass pots.',
    amenities: ['Apricot picking', 'Sleeps 4', 'Himalayan views'],
    sleeps: 4,
    maxGuests: 4,
    verified: true,
    organicPct: 95,
    hostName: 'Bhuwan Chandra Joshi',
    hostPhone: '+919800000017',
  },
  {
    id: 'farm-16',
    slug: 'nilgiri-cloud-tea',
    name: 'Nilgiri Cloud Tea & Spices',
    place: 'Coonoor, Tamil Nadu',
    region: 'Tamil Nadu',
    type: 'High-altitude tea · Herb gardens',
    pricePaise: 225000,
    rating: '4.8',
    reviews: 35,
    image: 'https://images.unsplash.com/photo-1576085898323-218337e3e43c?auto=format&fit=crop&w=900&q=85',
    tag: 'High altitude',
    description: 'High amidst the rolling blue slopes of the Nilgiris, surrounded by cloud forests and eucalyptus aromas. Pluck fine high-grown frost tea, discover rare hillside spices, and relax with panoramic valley lookouts.',
    amenities: ['Frost tea plucking', 'Sleeps 5', 'Eucalyptus groves'],
    sleeps: 5,
    maxGuests: 5,
    verified: true,
    organicPct: 90,
    hostName: 'Selvamani Ramanathan',
    hostPhone: '+919800000018',
  },
  {
    id: 'farm-17',
    slug: 'darjeeling-mist-farmstay',
    name: 'Darjeeling Mist Tea Farmstay',
    place: 'Kurseong, West Bengal',
    region: 'West Bengal',
    type: 'Biodynamic tea · Orange grove',
    pricePaise: 250000,
    rating: '4.9',
    reviews: 47,
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=85',
    tag: 'First flush',
    description: 'Located on misty ridges where famous Darjeeling Muscatel tea grows alongside mandarin orange trees. Experience first flush plucking on dizzying slopes, stay with friendly Gorkha hosts, and enjoy authentic momos steamed on the chulha.',
    amenities: ['Darjeeling tea walks', 'Sleeps 4', 'Toy train views'],
    sleeps: 4,
    maxGuests: 4,
    verified: true,
    organicPct: 100,
    hostName: 'Pemba Tamang',
    hostPhone: '+919800000019',
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
    image: '',
  },
  {
    id: 'prod-3',
    name: 'Village masala chai',
    detail: '250 g · hand-ground',
    pricePaise: 22000,
    image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 'prod-4',
    name: 'Pure Mongra Saffron',
    detail: '2 g · Pampore, Kashmir',
    pricePaise: 95000,
    image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 'prod-5',
    name: 'Dried Royal Apples',
    detail: '250 g · Kotgarh, Shimla',
    pricePaise: 32000,
    image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 'prod-6',
    name: 'Orthodox Assam Tea',
    detail: '250 g · Tezpur Estate',
    pricePaise: 45000,
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 'prod-7',
    name: 'Medium Roast Arabica',
    detail: '250 g · Coorg Single-Origin',
    pricePaise: 38000,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 'prod-8',
    name: 'Pushkar Rose Water',
    detail: '200 ml · Copper-distilled',
    pricePaise: 34000,
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=85',
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
    linkedFarmSlugs: ['brahmaputra-tea-estate'],
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
    linkedFarmSlugs: ['coorg-cloud-coffee-estate', 'spice-hills-homestay'],
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
    linkedFarmSlugs: ['sarson-da-khet', 'narmada-valley-heritage-farm'],
  },
  {
    id: 'crop-11',
    name: 'Apple',
    place: 'Shimla',
    region: 'Himachal Pradesh',
    harvestMonths: [7, 8, 9], // Aug-Oct
    sowingMonths: [0, 1],     // Jan-Feb
    linkedFarmSlugs: ['himachal-apple-highlands'],
  },
  {
    id: 'crop-12',
    name: 'Saffron (Kesar)',
    place: 'Pampore',
    region: 'Kashmir',
    harvestMonths: [9, 10], // Oct-Nov
    sowingMonths: [6, 7],   // Jul-Aug
    linkedFarmSlugs: ['pampore-saffron-haven'],
  },
  {
    id: 'crop-13',
    name: 'Gir Kesar Mango',
    place: 'Talala Gir',
    region: 'Gujarat',
    harvestMonths: [4, 5], // May-Jun
    sowingMonths: [6, 7],   // Jul-Aug
    linkedFarmSlugs: ['gir-somnath-kesar-grove'],
  },
  {
    id: 'crop-14',
    name: 'Pushkar Damask Rose',
    place: 'Pushkar',
    region: 'Rajasthan',
    harvestMonths: [1, 2, 3], // Feb-Apr
    sowingMonths: [8, 9],     // Sep-Oct
    linkedFarmSlugs: ['thar-desert-farmstead'],
  },
  {
    id: 'crop-15',
    name: 'Kumaon Himalayan Apricot',
    place: 'Mukteshwar',
    region: 'Uttarakhand',
    harvestMonths: [4, 5, 6], // May-Jul
    sowingMonths: [11, 0],    // Dec-Jan
    linkedFarmSlugs: ['kumaon-terrace-orchard'],
  },
  {
    id: 'crop-16',
    name: 'Nilgiri Frost Tea',
    place: 'Coonoor',
    region: 'Tamil Nadu',
    harvestMonths: [11, 0, 1], // Dec-Feb
    sowingMonths: [5, 6],      // Jun-Jul
    linkedFarmSlugs: ['nilgiri-cloud-tea'],
  },
  {
    id: 'crop-17',
    name: 'Darjeeling First Flush',
    place: 'Kurseong',
    region: 'West Bengal',
    harvestMonths: [2, 3], // Mar-Apr
    sowingMonths: [9, 10],  // Oct-Nov
    linkedFarmSlugs: ['darjeeling-mist-farmstay'],
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

  // Farm 8: Himachal Apple Highlands
  { id: 'act-35', farmSlug: 'himachal-apple-highlands', name: 'Apple harvesting and sorting', kind: 'farming', bestMonths: [7, 8, 9] },
  { id: 'act-36', farmSlug: 'himachal-apple-highlands', name: 'Raw apple cider vinegar pressing', kind: 'culinary', bestMonths: [8, 9, 10] },
  { id: 'act-37', farmSlug: 'himachal-apple-highlands', name: 'Cedar forest trail and birding', kind: 'relaxation', bestMonths: [] },
  { id: 'act-38', farmSlug: 'himachal-apple-highlands', name: 'Chulha siddu making with walnut chutney', kind: 'culinary', bestMonths: [] },
  { id: 'act-39', farmSlug: 'himachal-apple-highlands', name: 'Pine deck mountain meditation', kind: 'relaxation', bestMonths: [] },

  // Farm 9: Pampore Saffron Haven
  { id: 'act-40', farmSlug: 'pampore-saffron-haven', name: 'Saffron flower harvesting at sunrise', kind: 'farming', bestMonths: [9, 10] },
  { id: 'act-41', farmSlug: 'pampore-saffron-haven', name: 'Kahwa brewing on brass samovar', kind: 'culinary', bestMonths: [] },
  { id: 'act-42', farmSlug: 'pampore-saffron-haven', name: 'Walnut de-husking and sun drying', kind: 'farming', bestMonths: [8, 9] },
  { id: 'act-43', farmSlug: 'pampore-saffron-haven', name: 'Chinar shade garden contemplation', kind: 'relaxation', bestMonths: [] },
  { id: 'act-44', farmSlug: 'pampore-saffron-haven', name: 'Wazwan haak-saag cooking class', kind: 'culinary', bestMonths: [] },

  // Farm 10: Brahmaputra Heritage Tea Estate
  { id: 'act-45', farmSlug: 'brahmaputra-tea-estate', name: 'Two leaves and a bud tea plucking', kind: 'farming', bestMonths: [2, 3, 4, 5] },
  { id: 'act-46', farmSlug: 'brahmaputra-tea-estate', name: 'Orthodox tea rolling and tasting', kind: 'culinary', bestMonths: [2, 3, 4, 5] },
  { id: 'act-47', farmSlug: 'brahmaputra-tea-estate', name: 'Riverbank bamboo weaving session', kind: 'relaxation', bestMonths: [] },
  { id: 'act-48', farmSlug: 'brahmaputra-tea-estate', name: 'Assamese pitika and fish curry hearth feast', kind: 'culinary', bestMonths: [] },
  { id: 'act-49', farmSlug: 'brahmaputra-tea-estate', name: 'Dawn wetland bird trail', kind: 'relaxation', bestMonths: [10, 11, 0, 1] },

  // Farm 11: Coorg Cloud Coffee Estate
  { id: 'act-50', farmSlug: 'coorg-cloud-coffee-estate', name: 'Arabica coffee berry harvest', kind: 'farming', bestMonths: [10, 11, 0] },
  { id: 'act-51', farmSlug: 'coorg-cloud-coffee-estate', name: 'Estate roast and cupping masterclass', kind: 'culinary', bestMonths: [] },
  { id: 'act-52', farmSlug: 'coorg-cloud-coffee-estate', name: 'Pepper and cardamom canopy trail', kind: 'farming', bestMonths: [0, 1, 2] },
  { id: 'act-53', farmSlug: 'coorg-cloud-coffee-estate', name: 'Kodava kachampuli curry cooking', kind: 'culinary', bestMonths: [] },
  { id: 'act-54', farmSlug: 'coorg-cloud-coffee-estate', name: 'Rainforest stream sit and hammock nap', kind: 'relaxation', bestMonths: [] },

  // Farm 12: Gir Somnath Kesar Grove
  { id: 'act-55', farmSlug: 'gir-somnath-kesar-grove', name: 'Kesar mango plucking and crate grading', kind: 'farming', bestMonths: [4, 5] },
  { id: 'act-56', farmSlug: 'gir-somnath-kesar-grove', name: 'Gir cow gaushala care and bilona churning', kind: 'farming', bestMonths: [] },
  { id: 'act-57', farmSlug: 'gir-somnath-kesar-grove', name: 'Kathiyawadi ringna no olo on open fire', kind: 'culinary', bestMonths: [10, 11, 0, 1] },
  { id: 'act-58', farmSlug: 'gir-somnath-kesar-grove', name: 'Organic mango pulp bottling', kind: 'culinary', bestMonths: [4, 5] },
  { id: 'act-59', farmSlug: 'gir-somnath-kesar-grove', name: 'Orchard canopy night stargazing', kind: 'relaxation', bestMonths: [] },

  // Farm 13: Thar Desert Organic Farmstead
  { id: 'act-60', farmSlug: 'thar-desert-farmstead', name: 'Dawn rose petal plucking', kind: 'farming', bestMonths: [1, 2, 3] },
  { id: 'act-61', farmSlug: 'thar-desert-farmstead', name: 'Copper-deg rose water distillation', kind: 'culinary', bestMonths: [1, 2, 3] },
  { id: 'act-62', farmSlug: 'thar-desert-farmstead', name: 'Pearl millet (Bajra) threshing and roasting', kind: 'farming', bestMonths: [9, 10] },
  { id: 'act-63', farmSlug: 'thar-desert-farmstead', name: 'Traditional Dal Baati Churma cooked on cow-dung cakes', kind: 'culinary', bestMonths: [] },
  { id: 'act-64', farmSlug: 'thar-desert-farmstead', name: 'Dune sunset camel ride', kind: 'relaxation', bestMonths: [] },

  // Farm 14: Narmada Valley Heritage Farm
  { id: 'act-65', farmSlug: 'narmada-valley-heritage-farm', name: 'Sharbati wheat harvesting and bundle making', kind: 'farming', bestMonths: [2, 3] },
  { id: 'act-66', farmSlug: 'narmada-valley-heritage-farm', name: 'Stone-chakki flour milling workshop', kind: 'culinary', bestMonths: [] },
  { id: 'act-67', farmSlug: 'narmada-valley-heritage-farm', name: 'Wood-fired bafla and dal lunch circle', kind: 'culinary', bestMonths: [] },
  { id: 'act-68', farmSlug: 'narmada-valley-heritage-farm', name: 'Narmada holy riverbank evening quiet', kind: 'relaxation', bestMonths: [] },
  { id: 'act-69', farmSlug: 'narmada-valley-heritage-farm', name: 'Earthen seed ball making for rewilding', kind: 'farming', bestMonths: [5, 6] },

  // Farm 15: Kumaon Terrace Orchard Farm
  { id: 'act-70', farmSlug: 'kumaon-terrace-orchard', name: 'Apricot and wild plum harvesting', kind: 'farming', bestMonths: [4, 5, 6] },
  { id: 'act-71', farmSlug: 'kumaon-terrace-orchard', name: 'Buransh (rhododendron) flower cordial making', kind: 'culinary', bestMonths: [2, 3] },
  { id: 'act-72', farmSlug: 'kumaon-terrace-orchard', name: 'Himalayan peak viewing and journaling', kind: 'relaxation', bestMonths: [] },
  { id: 'act-73', farmSlug: 'kumaon-terrace-orchard', name: 'Pahadi Bhatt ki Churkani and Madua roti cooking', kind: 'culinary', bestMonths: [] },
  { id: 'act-74', farmSlug: 'kumaon-terrace-orchard', name: 'Terrace herb gathering for detox tea', kind: 'farming', bestMonths: [] },

  // Farm 16: Nilgiri Cloud Tea & Spices
  { id: 'act-75', farmSlug: 'nilgiri-cloud-tea', name: 'High-grown winter frost tea plucking', kind: 'farming', bestMonths: [11, 0, 1] },
  { id: 'act-76', farmSlug: 'nilgiri-cloud-tea', name: 'Small-batch artisanal tea pan-roasting', kind: 'culinary', bestMonths: [] },
  { id: 'act-77', farmSlug: 'nilgiri-cloud-tea', name: 'Eucalyptus and clove oil extraction demo', kind: 'farming', bestMonths: [] },
  { id: 'act-78', farmSlug: 'nilgiri-cloud-tea', name: 'Chettinad vegetarian farm lunch', kind: 'culinary', bestMonths: [] },
  { id: 'act-79', farmSlug: 'nilgiri-cloud-tea', name: 'Valley ridge tea-cup meditation', kind: 'relaxation', bestMonths: [] },

  // Farm 17: Darjeeling Mist Tea Farmstay
  { id: 'act-80', farmSlug: 'darjeeling-mist-farmstay', name: 'First flush spring tea plucking', kind: 'farming', bestMonths: [2, 3] },
  { id: 'act-81', farmSlug: 'darjeeling-mist-farmstay', name: 'Darjeeling mandarin orange harvest', kind: 'farming', bestMonths: [10, 11, 0] },
  { id: 'act-82', farmSlug: 'darjeeling-mist-farmstay', name: 'Traditional steamed momo making on firewood', kind: 'culinary', bestMonths: [] },
  { id: 'act-83', farmSlug: 'darjeeling-mist-farmstay', name: 'Tea tasting of spring, summer and autumn flushes', kind: 'culinary', bestMonths: [] },
  { id: 'act-84', farmSlug: 'darjeeling-mist-farmstay', name: 'Toy train view deck silence', kind: 'relaxation', bestMonths: [] },
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
