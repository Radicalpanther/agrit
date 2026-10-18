export interface FarmLandmark {
  name: string
  type: string
  note?: string
  distance_km_to_farm?: number
}

export interface ServiceLocation {
  name?: string
  distance_km?: number
  phone?: string
}

export interface FarmNearbyServices {
  fuel?: ServiceLocation
  atm?: ServiceLocation
  pharmacy?: ServiceLocation
  grocery?: ServiceLocation
  hospital?: ServiceLocation
  police?: ServiceLocation
  [key: string]: any
}

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
  images?: string[]
  tag: string
  description: string
  amenities: string[]
  sleeps: number
  maxGuests: number
  verified?: boolean
  organicPct?: number
  hostName?: string
  hostPhone?: string
  lat?: number
  lng?: number
  directions_steps?: string[]
  directionsSteps?: string[]
  landmark_note?: string | null
  landmarkNote?: string | null
  landmarks?: FarmLandmark[]
  nearby_services?: FarmNearbyServices
  nearbyServices?: FarmNearbyServices
  allows_day_visit?: boolean
  allowsDayVisit?: boolean
  day_visit_price_paise?: number | null
  dayVisitPricePaise?: number | null
  day_visit_start?: string | null
  dayVisitStart?: string | null
  day_visit_end?: string | null
  dayVisitEnd?: string | null
  check_in_time?: string | null
  check_out_time?: string | null
  last_safe_arrival?: string | null
  host_contact_hours?: string | null
  rules?: string[]
  activities?: FarmActivity[]
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
    image: 'https://thumbs.dreamstime.com/b/konkan-maharashtra-india-june-farmers-work-farm-monsoon-season-konkan-maharashtra-india-june-farmers-working-farm-124031146.jpg',
    tag: 'Top rated',
    description: 'Wake up to birdsong, share a meal made from the morning harvest, and spend an unhurried day learning the rhythms of a real working farm in Ratnagiri.',
    amenities: ['Organic meals', 'Sleeps 4', 'Flexible check-in'],
    sleeps: 4,
    maxGuests: 4,
    verified: true,
    organicPct: 90,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
    lat: 17.0016,
    lng: 73.3120,
    directionsSteps: ['Take NH66 towards Ratnagiri', 'Turn at Mirya phata', 'Follow the board at the mango grove'],
    landmarkNote: 'Near the old banyan tree at Mirya village',
    landmarks: [
      { name: 'Hathkhamba Junction (NH66)', type: 'highway_junction', note: 'Exit NH66 onto Ratnagiri bypass road', distance_km_to_farm: 18.5 },
      { name: 'Kajali River Bridge', type: 'bridge', note: 'Scenic river crossing along SH4', distance_km_to_farm: 12.0 },
      { name: 'Ratnagiri Central ST Bus Stand', type: 'town', note: 'Main transit hub with local rickshaws and market', distance_km_to_farm: 8.5 },
      { name: 'Mirya Phata Ganesh Temple', type: 'temple', note: 'Turn right at the white temple arch', distance_km_to_farm: 2.2 },
      { name: 'Mirya Village Banyan Tree', type: 'landmark', note: 'Old banyan tree with wooden AgriTrails arrow', distance_km_to_farm: 0.6 },
    ],
    nearbyServices: {
      fuel: { name: 'Bharat Petroleum Mirya Bypass', distance_km: 3.5, phone: '+919822101112' },
      atm: { name: 'State Bank of India ATM Mirya', distance_km: 2.8 },
      pharmacy: { name: 'Sanjivani Medical & General Store', distance_km: 3.1, phone: '+919822101113' },
      grocery: { name: 'Patil Village Provision Store', distance_km: 1.2 },
      hospital: { name: 'Ratnagiri District Civil Hospital', distance_km: 8.2, phone: '02352-222365' },
      police: { name: 'Ratnagiri City Police Station', distance_km: 7.8, phone: '02352-222222' },
    },
    allowsDayVisit: true,
    dayVisitStart: '09:00',
    dayVisitEnd: '17:00',
    check_in_time: '12:00 PM',
    check_out_time: '10:00 AM',
    last_safe_arrival: '06:00 PM (before dark)',
    host_contact_hours: '07:00 AM - 09:00 PM',
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
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsCXvWx7lOLD_pOAKniK8YKiwSECNG7TbB8YW8x_CM4w&s=10',
    tag: 'Seasonal',
    description: 'Set inside mature Alphonso mango orchards. Spend mornings picking fruit and evenings tasting stone-ground Konkani dinners with host families.',
    amenities: ['Orchard walks', 'Sleeps 8', 'Fresh mango tasting'],
    sleeps: 8,
    maxGuests: 8,
    verified: true,
    organicPct: 100,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
    lat: 16.9900,
    lng: 73.3000,
    directionsSteps: ['From Ratnagiri city, head south on SH4', 'Turn right after Pawas village', 'Enter the orchard gate after 2 km'],
    landmarkNote: 'Orchard gate has a hand-painted Aamrai signboard',
    landmarks: [
      { name: 'Ratnagiri Railway Station (KRCL)', type: 'town', note: 'Major Konkan Railway hub', distance_km_to_farm: 11.0 },
      { name: 'Kuwarbav Highway Crossing', type: 'highway_junction', note: 'Connects NH66 and coastal road', distance_km_to_farm: 8.0 },
      { name: 'Pawas Coastal Estuary Bridge', type: 'bridge', note: 'Cross the backwaters heading south', distance_km_to_farm: 3.5 },
      { name: 'Swami Swaroopanand Ashram Turn', type: 'temple', note: 'Follow signage for Pawas south gate', distance_km_to_farm: 2.0 },
      { name: 'Aamrai Orchard Wooden Gate', type: 'gate', note: 'Green wooden gate with painted Alphonso mango emblem', distance_km_to_farm: 0.1 },
    ],
    nearbyServices: {
      fuel: { name: 'Indian Oil Pawas Rural Pump', distance_km: 2.5, phone: '+919822102221' },
      atm: { name: 'Bank of Maharashtra ATM Pawas', distance_km: 2.1 },
      pharmacy: { name: 'Pawas Community Pharmacy', distance_km: 2.3, phone: '+919822102222' },
      grocery: { name: 'Shree Samarth Provisions', distance_km: 1.8 },
      hospital: { name: 'Pawas Primary Health Centre (PHC)', distance_km: 3.0, phone: '02352-234200' },
      police: { name: 'Purnagad Coastal Police Station', distance_km: 6.5, phone: '02352-234100' },
    },
    allowsDayVisit: true,
    dayVisitStart: '08:30',
    dayVisitEnd: '16:30',
    check_in_time: '12:00 PM',
    check_out_time: '10:00 AM',
    last_safe_arrival: '06:00 PM (before dark)',
    host_contact_hours: '07:00 AM - 09:00 PM',
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
    image: 'https://content.jdmagicbox.com/comp/def_content/organic-farms/organic-farms-4-organic-farms-4-9hl2y.jpg',
    tag: 'New',
    description: 'A hillside working farm in the Sahyadri ranges. Learn cattle tending, churn fresh butter, and share a warm village lunch with the family.',
    amenities: ['Cattle tending', 'Sleeps 4', 'Wood-fired kitchen'],
    sleeps: 4,
    maxGuests: 4,
    verified: true,
    organicPct: 75,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
    lat: 17.9238,
    lng: 73.8077,
    directionsSteps: ['Take Mahabaleshwar road from Wai', 'Turn left at Dandeghar phata', 'Climb 3 km on mud track'],
    landmarkNote: 'Stone wall with hand-painted farm name at the entrance',
    landmarks: [
      { name: 'Surur Toll Plaza (NH48)', type: 'toll_plaza', note: 'Turn off NH48 towards Wai and Panchgani', distance_km_to_farm: 26.0 },
      { name: 'Krishna River Wai Bridge', type: 'river', note: 'Ancient stone ghats visible upstream', distance_km_to_farm: 14.5 },
      { name: 'Pasarni Ghat Hairpin 4', type: 'highway_junction', note: 'Scenic viewpoint overlooking Dhom dam', distance_km_to_farm: 6.2 },
      { name: 'Dandeghar Phata ST Stop', type: 'town', note: 'Turn left onto the packed hillside mud road', distance_km_to_farm: 3.0 },
      { name: 'Sahyadri Stone Farm Gate', type: 'gate', note: 'Hand-laid laterite stone wall with carved cedar gate', distance_km_to_farm: 0.2 },
    ],
    nearbyServices: {
      fuel: { name: 'HP Fuel Station Panchgani Market', distance_km: 4.2, phone: '+919822103331' },
      atm: { name: 'HDFC Bank ATM Panchgani', distance_km: 3.8 },
      pharmacy: { name: 'Tableland Medical Store', distance_km: 4.0, phone: '+919822103332' },
      grocery: { name: 'Dandeghar Fresh Produce & Provisions', distance_km: 2.5 },
      hospital: { name: 'Bel-Air Hospital Panchgani', distance_km: 5.5, phone: '02168-240211' },
      police: { name: 'Panchgani Police Station', distance_km: 4.5, phone: '02168-240333' },
    },
    allowsDayVisit: true,
    dayVisitStart: '09:00',
    dayVisitEnd: '17:00',
    check_in_time: '12:00 PM',
    check_out_time: '10:00 AM',
    last_safe_arrival: '06:00 PM (before dark)',
    host_contact_hours: '07:00 AM - 09:00 PM',
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
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGqAHC8cA9uNU_oPIMJQ_0JGy6UxZ7bA-l-h8FpjAS4g&s=10',
    tag: 'Authentic',
    description: 'Watch traditional jaggery-making from fresh sugarcane crush, learn the kolhu press, and taste warm gur straight from the pan.',
    amenities: ['Sugarcane crush', 'Sleeps 6', 'Wood-fired kitchen'],
    sleeps: 6,
    maxGuests: 6,
    verified: true,
    organicPct: 80,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
    lat: 16.7050,
    lng: 74.2433,
    directionsSteps: ['Take NH48 towards Kolhapur', 'Exit at Jaysingpur', 'Follow sugarcane field road for 5 km'],
    landmarkNote: 'Large kolhu (bullock press) visible from the road',
    landmarks: [
      { name: 'Kinaye Toll Plaza (NH48)', type: 'toll_plaza', note: 'Take exit towards Jaysingpur sugar belt', distance_km_to_farm: 15.0 },
      { name: 'Panchganga River Overbridge', type: 'bridge', note: 'Crossing into sugarcane country', distance_km_to_farm: 9.5 },
      { name: 'Jaysingpur Sugar Mill Cross', type: 'highway_junction', note: 'Turn east onto the canal link road', distance_km_to_farm: 5.0 },
      { name: 'Datta Mandir Weighbridge', type: 'temple', note: 'Sugarcane weighing station on the right', distance_km_to_farm: 2.1 },
      { name: 'Gur Ghar Traditional Bhatti Chimney', type: 'landmark', note: 'Tall brick chimney of organic jaggery press visible', distance_km_to_farm: 0.4 },
    ],
    nearbyServices: {
      fuel: { name: 'Bharat Petroleum Jaysingpur Bypass', distance_km: 3.2, phone: '+919822104441' },
      atm: { name: 'Kolhapur District Central Bank ATM', distance_km: 2.8 },
      pharmacy: { name: 'Kisan Medical & Surgical', distance_km: 3.0, phone: '+919822104442' },
      grocery: { name: 'Mahalaxmi Kirana Store', distance_km: 1.5 },
      hospital: { name: 'Chhatrapati Pramila Raje Hospital (CPR Kolhapur)', distance_km: 9.8, phone: '0231-2641555' },
      police: { name: 'Shirol Rural Police Station', distance_km: 4.2, phone: '0231-265100' },
    },
    allowsDayVisit: true,
    dayVisitStart: '10:00',
    dayVisitEnd: '16:00',
    check_in_time: '12:00 PM',
    check_out_time: '10:00 AM',
    last_safe_arrival: '06:00 PM (before dark)',
    host_contact_hours: '07:00 AM - 09:00 PM',
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
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbRvxgbKSU5CQUdqehH05AMuIg6LQktaAyuSAkTMJzwQ&s=10',
    tag: 'Seasonal',
    description: 'Stay in the grape belt of Maharashtra. Join guided vineyard walks, press your own grapes, and enjoy farm-to-table meals in the valley.',
    amenities: ['Vineyard walks', 'Sleeps 5', 'Grape pressing'],
    sleeps: 5,
    maxGuests: 5,
    verified: true,
    organicPct: 85,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
    lat: 20.0059,
    lng: 73.7798,
    directionsSteps: ['From Nashik city, take the Gangapur road', 'Continue past Gangapur dam', 'Turn at the Draksha Valley signboard'],
    landmarkNote: 'Stone arch entrance with grape motif on NH60',
    landmarks: [
      { name: 'Dwarka Circle Flyover Nashik', type: 'highway_junction', note: 'Exit Mumbai-Agra highway towards Gangapur Road', distance_km_to_farm: 12.5 },
      { name: 'Godavari River Causeway', type: 'river', note: 'Cross upstream Godavari tributary', distance_km_to_farm: 7.2 },
      { name: 'Gangapur Dam Spillway View', type: 'landmark', note: 'Dam backwaters and vineyards on right', distance_km_to_farm: 3.5 },
      { name: 'Someshwar Temple Arch', type: 'temple', note: 'Follow wine & grape valley signs', distance_km_to_farm: 1.8 },
      { name: 'Draksha Valley Stone Gate', type: 'gate', note: 'Carved stone gate with brass grape vine motif', distance_km_to_farm: 0.2 },
    ],
    nearbyServices: {
      fuel: { name: 'Indian Oil Gangapur Road Station', distance_km: 2.8, phone: '+919822105551' },
      atm: { name: 'ICICI Bank ATM Gangapur', distance_km: 2.5 },
      pharmacy: { name: 'Apollo Pharmacy Gangapur Branch', distance_km: 3.0, phone: '+919822105552' },
      grocery: { name: 'Valley Mart Organic Groceries', distance_km: 1.7 },
      hospital: { name: 'Nashik Civil Hospital & Trauma Centre', distance_km: 7.5, phone: '0253-2576106' },
      police: { name: 'Gangapur Police Station', distance_km: 3.8, phone: '0253-2311200' },
    },
    allowsDayVisit: true,
    dayVisitStart: '09:30',
    dayVisitEnd: '17:30',
    check_in_time: '12:00 PM',
    check_out_time: '10:00 AM',
    last_safe_arrival: '06:00 PM (before dark)',
    host_contact_hours: '07:00 AM - 09:00 PM',
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
    image: 'https://imgstaticcontent.lbb.in/lbbnew/wp-content/uploads/sites/9/2016/11/13143932/Spice.jpg',
    tag: 'Top rated',
    description: 'A working spice plantation in the Western Ghats. Walk through cardamom, pepper, and vanilla groves and cook a traditional Kerala meal with fresh pickings.',
    amenities: ['Cardamom walks', 'Sleeps 4', 'Kerala cooking'],
    sleeps: 4,
    maxGuests: 4,
    verified: true,
    organicPct: 95,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
    lat: 11.6010,
    lng: 76.0820,
    directionsSteps: ['Fly into Kozhikode', 'Drive NH766 to Kalpetta (90 km)', 'Follow Spice Hills board at Sulthan Bathery junction'],
    landmarkNote: 'Green gate next to the pepper vine arch at Ambalavayal',
    landmarks: [
      { name: 'Thamarassery Churam Hairpin 9', type: 'highway_junction', note: 'Top of mountain pass overlooking Malabar plains', distance_km_to_farm: 32.0 },
      { name: 'Kabini River Tributary Bridge', type: 'bridge', note: 'Stream beside bamboo forest reserve', distance_km_to_farm: 8.5 },
      { name: 'Sulthan Bathery Junction (NH766)', type: 'town', note: 'Take Ambalavayal heritage spice road', distance_km_to_farm: 5.2 },
      { name: 'Edakkal Caves Foothill Turn', type: 'landmark', note: 'Turn left at coffee growers cooperative board', distance_km_to_farm: 2.0 },
      { name: 'Spice Hills Pepper Vine Arch', type: 'gate', note: 'Living green bamboo & black pepper vine gate', distance_km_to_farm: 0.1 },
    ],
    nearbyServices: {
      fuel: { name: 'HP Auto Fuels Ambalavayal', distance_km: 2.4, phone: '+919847106661' },
      atm: { name: 'Federal Bank ATM Ambalavayal', distance_km: 2.0 },
      pharmacy: { name: 'Kerala Medical & Ayurvedic Pharmacy', distance_km: 2.1, phone: '+919847106662' },
      grocery: { name: 'Malabar Fresh Village Store', distance_km: 1.9 },
      hospital: { name: 'Sulthan Bathery Taluk Government Hospital', distance_km: 6.8, phone: '04936-220224' },
      police: { name: 'Ambalavayal Police Station', distance_km: 2.6, phone: '04936-260233' },
    },
    allowsDayVisit: true,
    dayVisitStart: '09:00',
    dayVisitEnd: '16:00',
    check_in_time: '12:00 PM',
    check_out_time: '10:00 AM',
    last_safe_arrival: '06:00 PM (before dark)',
    host_contact_hours: '07:00 AM - 09:00 PM',
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
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTujswPcaxG0Mz8HIKZw33y_BPuRbvyfBm4uq1w6_3cYl4PZaqs69keq_hH&s=10',
    tag: 'Traditional',
    description: 'Golden mustard fields stretch to the horizon. Help with the Baisakhi harvest, learn traditional bhatti cooking, and ride a tractor at dawn.',
    amenities: ['Tractor rides', 'Sleeps 8', 'Bhatti meals'],
    sleeps: 8,
    maxGuests: 8,
    verified: true,
    organicPct: 80,
    hostName: 'Rajesh Patil',
    hostPhone: '+919800000002',
    lat: 31.6340,
    lng: 74.8723,
    directionsSteps: ['From Amritsar, take GT road east', 'Turn north at Attari crossroads', 'Farm is 8 km on the village track'],
    landmarkNote: 'Large Punjabi mural on the outer wall of the farmhouse',
    landmarks: [
      { name: 'Golden Gate GT Road Interchange (NH3)', type: 'highway_junction', note: 'Grand entry arch to Amritsar bypass', distance_km_to_farm: 14.0 },
      { name: 'Upper Bari Doab Canal Bridge', type: 'bridge', note: 'Cross traditional brick-lined irrigation canal', distance_km_to_farm: 7.5 },
      { name: 'Attari Border Road Junction', type: 'town', note: 'Turn north towards village link road', distance_km_to_farm: 4.8 },
      { name: 'Gurdwara Sahib Village Square', type: 'temple', note: 'High Nishan Sahib visible across mustard fields', distance_km_to_farm: 1.5 },
      { name: 'Sarson da Khet Brick Gateway', type: 'gate', note: 'Traditional Punjabi painted brick portal and tractor track', distance_km_to_farm: 0.3 },
    ],
    nearbyServices: {
      fuel: { name: 'Indian Oil Kisan Seva Kendra Attari', distance_km: 3.5, phone: '+919814107771' },
      atm: { name: 'Punjab National Bank ATM Attari', distance_km: 3.0 },
      pharmacy: { name: 'Singh Medical Hall Attari', distance_km: 2.8, phone: '+919814107772' },
      grocery: { name: 'Kisan Karyana Provision Store', distance_km: 1.4 },
      hospital: { name: 'Guru Nanak Dev Hospital Amritsar', distance_km: 11.2, phone: '0183-2573200' },
      police: { name: 'Attari Police Station', distance_km: 3.9, phone: '0183-2382100' },
    },
    allowsDayVisit: false,
    dayVisitStart: null,
    dayVisitEnd: null,
    check_in_time: '12:00 PM',
    check_out_time: '10:00 AM',
    last_safe_arrival: '06:00 PM (before dark)',
    host_contact_hours: '07:00 AM - 09:00 PM',
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
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQKgPFkSvTXG79H2Or0tXXTgj7G0-2jTLkFp_FaVza9E28aXgD0ol10pxMo&s=10',
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
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXqosRszZ5gryOnavhSD99gdJBC_Fg-5-nzwyFSicoyocLzkKt-ypcCB4&s=10',
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
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRzwpyApGQ01xNFz7shemS-SR3By6-mXHIBnRY_2U28Qw&s=10',
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
    image: 'https://img.magnific.com/free-photo/strawberry-farm-field-mountain_1150-6748.jpg?semt=ais_hybrid&w=740&q=80',
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
    image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhln_qHlPNS7AYMulxPdxm4wDMH2jX9ijqRHjGnvSeQqmJPibOS-r2vIuX-_JxXZ_awbb4uV8e8aq62PxOmPoTY4iZzBLtzCa9FKNCWJQtrq8WxRH-UOdNZBfiL-MBg8MLWsR1sIE-ZNCiEHmxx3WJKwmtR4Jc30HqvaNRZxXFrPe5_kSEto3gio5WdsT0/s1536/ChatGPT%20Image%20Jan%2016,%202026,%2011_30_01%20AM.png',
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
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQWSRDD3RYgjV3JwrOZdT55iUlUNxVv_qTO-klqCcFNTA&s=10',
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
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdvef_YKDrjlCNB8wbuLYonluXgoOlqNcK95grLWaMEaPnGY7ylsGZ3bk&s=10',
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
    image: 'https://static2.tripoto.com/media/filter/tst/img/522191/TripDocument/1551211524_main_qimg_2bbc151d30035d940ca13616813a2b93.png',
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
    image: 'https://thumbs.dreamstime.com/b/jungle-tropical-spice-plantation-goa-india-92852645.jpg',
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
    image: 'https://voyagescribe.com/wp-content/uploads/2020/05/paul-vincent-roll-c61jL_NpAn8-unsplash.jpg',
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
  {
    id: 'farm-18',
    slug: 'adai-farm-house',
    name: 'Adai Farm House',
    place: 'Panvel, Maharashtra',
    region: 'Maharashtra',
    type: 'Farm villa · Nature retreat',
    pricePaise: 250000,
    rating: '4.9',
    reviews: 36,
    image: 'https://assets.architecturaldigest.in/photos/69ce2ea0afece37e90178e10/master/w_1600%2Cc_limit/Prakriti%252023.jpg',
    tag: 'Architectural',
    description: 'An award-winning sustainable rural architecture estate nestled at the foothills of the Western Ghats in Adai. Enjoy quiet verandah living, farm-fresh seasonal dining, and shaded botanical walks.',
    amenities: ['Organic meals', 'Sleeps 6', 'Architecture tour', 'Verandah quiet'],
    sleeps: 6,
    maxGuests: 6,
    verified: true,
    organicPct: 90,
    hostName: 'Nikhil Sharma',
    hostPhone: '+919800000020',
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
    name: 'Pure Mongra Saffron GI-tagged',
    detail: '2 g · Pampore, Kashmir',
    pricePaise: 95000,
    image: 'https://m.media-amazon.com/images/I/71ApPoHWHBL.jpg',
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
