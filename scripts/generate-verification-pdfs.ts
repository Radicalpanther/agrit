import fs from 'fs'
import path from 'path'
import { generateTravelSafetyCardPdf, TravelCardPdfOptions } from '../lib/travel-card-pdf'

async function run() {
  const outputDir = path.resolve(process.cwd(), 'verification-artifacts')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // (a) Day visit with a long route: Thane to Kotgarh (Himachal Apple Highlands)
  console.log('Generating (a) Thane to Kotgarh (long route)...')
  const optionsA: TravelCardPdfOptions = {
    farm: {
      id: 'farm-apple',
      name: 'Himachal Apple Highlands',
      slug: 'himachal-apple-highlands',
      place: 'Kotgarh, Shimla',
      region: 'Himachal Pradesh',
      lat: 31.3125,
      lng: 77.4812,
      host_name: 'Suresh Chauhan',
      host_phone: '+919800000005',
      allows_day_visit: true,
      day_visit_start: '09:30',
      day_visit_end: '17:00',
      last_safe_arrival: '16:00', // earlier than 17:00 -> should appear
      host_contact_hours: '07:00 AM - 09:00 PM',
      directions_steps: [
        'Take NH48 north towards Ahmedabad and Jaipur',
        'Continue on Western Peripheral Expressway around Delhi NCR',
        'Take NH44 north to Ambala, then NH5 to Shimla bypass',
        'Drive 68 km beyond Shimla on NH5 towards Narkanda',
        'Take Kotgarh orchard ridge road at the apple market junction (3.5 km)',
        'Arrive at the wooden gate of Himachal Apple Highlands',
      ],
      landmark_note: 'Large green wooden apple archway right after Kotgarh Post Office',
      landmarks: [
        { name: 'Narkanda Ridge (NH5)', distance_km_to_farm: 16.5 },
        { name: 'Kotgarh Apple Cooperative', distance_km_to_farm: 2.1 },
        { name: 'Highlands Timber Arch', distance_km_to_farm: 0.2 },
      ],
      nearby_services: {
        fuel: { name: 'Indian Oil Kotgarh Pump', distance_km: 4.2 },
        atm: { name: 'HDFC Bank ATM Narkanda', distance_km: 15.0 },
        pharmacy: { name: 'Kotgarh Community Chemist', distance_km: 2.5 },
        grocery: { name: 'Prakriti Himalayan Goods', distance_km: 1.8 },
        hospital: { name: 'Civil Hospital Kumarsain', distance_km: 18.0, phone: '+911782240108' },
        police: { name: 'Narkanda Police Post', distance_km: 15.5, phone: '+911782242100' },
      },
      activities: [
        { name: 'Heritage Apple Orchard Walk', duration_min: 60, sort_hint: 'morning', is_paid: false },
        { name: 'Cider Making Workshop', duration_min: 45, sort_hint: 'midday', is_paid: true },
        { name: 'Pahari Chulha Cooking', duration_min: 75, sort_hint: 'evening', is_paid: false },
      ],
      rules: ['No smoking in orchard timber premises', 'Do not pluck unripe fruit', 'Quiet hours after 9 PM'],
    },
    bookingId: 'bk-thane-kotgarh-2026',
    guestName: 'Rohit Sharma',
    checkInDate: '2026-10-25',
    visitType: 'day',
    guests: 3,
    bookingStatus: 'confirmed',
    source: {
      name: 'Thane',
      lat: 19.2183,
      lng: 72.9781,
    },
    routeInfo: {
      distanceKm: '1742.8',
      durationText: '31 hr 20 min',
      durationSeconds: 112800, // > 10 hrs -> triggers "Long journey" note
      geometry: {
        type: 'LineString',
        coordinates: [
          [72.9781, 19.2183], // Thane
          [72.98, 19.3],
          [73.1, 20.0],
          [73.2, 21.2],
          [74.5, 23.0],
          [75.8, 26.0], // Jaipur
          [77.1, 28.6], // Delhi NCR
          [76.8, 30.3], // Ambala
          [77.17, 31.1], // Shimla
          [77.4812, 31.3125], // Kotgarh
        ],
      },
      steps: [
        { name: 'NH 48 Expressway', ref: 'NH 48', distance: 180000, maneuver: { location: [73.1, 20.0] } },
        { name: 'Western Peripheral Expressway', ref: 'NE 2', distance: 85000, maneuver: { location: [77.1, 28.6] } },
        { name: 'NH 44 North Corridor', ref: 'NH 44', distance: 210000, maneuver: { location: [76.8, 30.3] } },
        { name: 'Himalayan Expressway NH 5', ref: 'NH 5', distance: 145000, maneuver: { location: [77.17, 31.1] } },
      ],
    },
  }

  const docA = await generateTravelSafetyCardPdf(optionsA)
  const pathA = path.join(outputDir, 'pdf-a-thane-to-kotgarh.pdf')
  fs.writeFileSync(pathA, Buffer.from(docA.output('arraybuffer')))
  console.log(`Saved ${pathA} (${docA.getNumberOfPages()} pages)`)

  // (b) Overnight booking with no origin
  console.log('Generating (b) Kokan Roots (no origin)...')
  const optionsB: TravelCardPdfOptions = {
    farm: {
      id: 'farm-kokan',
      name: 'Kokan Roots Farmstay',
      slug: 'kokan-roots-farmstay',
      place: 'Ratnagiri, Maharashtra',
      region: 'Maharashtra',
      lat: 17.0016,
      lng: 73.312,
      host_name: 'Rajesh Patil',
      host_phone: '+919800000002',
      allows_day_visit: false,
      check_in_time: '13:00',
      check_out_time: '11:00',
      host_contact_hours: '08:00 AM - 08:00 PM',
      directions_steps: [
        'Take Mumbai-Goa Highway (NH66) towards Ratnagiri',
        'Turn right at Mirya phata junction',
        'Drive 4 km along coastal road towards coconut grove',
        'Look for the carved wooden Kokan Roots signboard on the left',
      ],
      landmark_note: 'Hand-carved teakwood farm gate adjacent to old stone temple well',
      landmarks: [
        { name: 'Mirya Phata NH66 Junction', distance_km_to_farm: 6.8 },
        { name: 'Coastal Coconut Checkpost', distance_km_to_farm: 1.5 },
      ],
      nearby_services: {
        fuel: { name: 'HP Petrol Pump Mirya', distance_km: 5.0 },
        atm: { name: 'State Bank ATM Ratnagiri', distance_km: 7.2 },
        pharmacy: { name: 'Kokan Medical Store', distance_km: 4.8 },
        grocery: { name: 'Village Provision Center', distance_km: 1.2 },
        hospital: { name: 'Ratnagiri Civil Hospital', distance_km: 9.5, phone: '+912352222108' },
        police: { name: 'Mirya Coastal Police Station', distance_km: 6.0, phone: '+912352223100' },
      },
      activities: [
        { name: 'Alphonso Mango Orchard Walk', duration_min: 60, sort_hint: 'morning' },
        { name: 'Organic Jaggery Making Demo', duration_min: 45, sort_hint: 'afternoon' },
      ],
      rules: ['Respect quiet hours after 10 PM', 'No outdoor music after sunset'],
    },
    bookingId: 'bk-kokan-no-origin-889',
    guestName: 'Ananya Deshmukh',
    checkInDate: '2026-10-28',
    visitType: 'overnight',
    guests: 4,
    bookingStatus: 'pending',
    source: null, // No origin!
    routeInfo: null,
  }

  const docB = await generateTravelSafetyCardPdf(optionsB)
  const pathB = path.join(outputDir, 'pdf-b-no-origin.pdf')
  fs.writeFileSync(pathB, Buffer.from(docB.output('arraybuffer')))
  console.log(`Saved ${pathB} (${docB.getNumberOfPages()} pages)`)

  // (c) Booking with 12+ activities (stress testing two-column activity layout and continuous flow)
  console.log('Generating (c) Sahyadri Soil (14 activities)...')
  const optionsC: TravelCardPdfOptions = {
    farm: {
      id: 'farm-sahyadri',
      name: 'Sahyadri Soil and Soul Agro Farm',
      slug: 'sahyadri-soil-and-soul',
      place: 'Wai, Satara',
      region: 'Maharashtra',
      lat: 17.9482,
      lng: 73.8921,
      host_name: 'Sunil Jagtap',
      host_phone: '+919800000003',
      allows_day_visit: true,
      day_visit_start: '09:00',
      day_visit_end: '18:00',
      check_in_time: '12:00 PM',
      check_out_time: '11:00 AM',
      host_contact_hours: '06:00 AM - 10:00 PM',
      directions_steps: [
        'Drive on NH48 Pune-Satara expressway',
        'Take Wai exit towards Dhom dam',
        'Follow river road for 8 km',
        'Turn into Sahyadri farm avenue at strawberry arch',
      ],
      landmark_note: 'Dhom Dam canal bridge with white milestone 8 km',
      landmarks: [
        { name: 'Wai Bus Depot Junction', distance_km_to_farm: 8.5 },
        { name: 'Dhom Reservoir Canal Bridge', distance_km_to_farm: 1.2 },
      ],
      nearby_services: {
        fuel: { name: 'Bharat Petroleum Wai Highway', distance_km: 7.0 },
        atm: { name: 'Bank of Maharashtra ATM Wai', distance_km: 6.5 },
        pharmacy: { name: 'Sanjivani Pharmacy', distance_km: 6.0 },
        grocery: { name: 'Krishna Agro Provision', distance_km: 2.0 },
        hospital: { name: 'Wai Mission Hospital', distance_km: 8.0, phone: '+912167220108' },
        police: { name: 'Wai Police Station', distance_km: 7.5, phone: '+912167221100' },
      },
      activities: [
        { name: 'Strawberry Harvesting at Dawn', duration_min: 50, sort_hint: 'morning' },
        { name: 'Organic Compost & Wormery Tour', duration_min: 40, sort_hint: 'morning' },
        { name: 'Cow Milking & Dairy Churning', duration_min: 45, sort_hint: 'morning' },
        { name: 'Bullock Cart River Ride', duration_min: 30, sort_hint: 'midday' },
        { name: 'Traditional Hurda Roasting Party', duration_min: 60, sort_hint: 'midday', is_paid: true },
        { name: 'Drip Irrigation Workshop', duration_min: 45, sort_hint: 'afternoon' },
        { name: 'Medicinal Herb Garden Walk', duration_min: 40, sort_hint: 'afternoon' },
        { name: 'Pottery Wheel Session on Clay', duration_min: 50, sort_hint: 'afternoon', is_paid: true },
        { name: 'Bhakri Making on Wood Fire', duration_min: 60, sort_hint: 'evening' },
        { name: 'Sunset Hilltop Lookout Trek', duration_min: 60, sort_hint: 'evening' },
        { name: 'Campfire Star Gazing Session', duration_min: 45, sort_hint: 'evening' },
        { name: 'Bee Keeping & Raw Honey Extraction', duration_min: 40, sort_hint: 'morning' },
        { name: 'Bamboo Crafts Masterclass', duration_min: 60, sort_hint: 'afternoon', is_paid: true },
        { name: 'Bird Watching along River Bank', duration_min: 50, sort_hint: 'morning' },
      ],
      rules: ['No loud music after 9 PM', 'Preserve riverbank cleanliness', 'No non-veg on sacred grove premises'],
    },
    bookingId: 'bk-sahyadri-14-activities',
    guestName: 'Priya & Rahul Kulkarni',
    checkInDate: '2026-11-04',
    visitType: 'day',
    guests: 6,
    bookingStatus: 'confirmed',
    source: {
      name: 'Pune',
      lat: 18.5204,
      lng: 73.8567,
    },
    routeInfo: {
      distanceKm: '88.5',
      durationText: '2 hr 10 min',
      durationSeconds: 7800,
      geometry: {
        type: 'LineString',
        coordinates: [
          [73.8567, 18.5204],
          [73.88, 18.35],
          [73.95, 18.15],
          [73.8921, 17.9482],
        ],
      },
      steps: [
        { name: 'NH 48 Pune-Satara Expressway', ref: 'NH 48', distance: 68000, maneuver: { location: [73.95, 18.15] } },
        { name: 'Wai-Surur State Highway', ref: 'SH 72', distance: 15000, maneuver: { location: [73.9, 18.0] } },
      ],
    },
  }

  const docC = await generateTravelSafetyCardPdf(optionsC)
  const pathC = path.join(outputDir, 'pdf-c-14-activities.pdf')
  fs.writeFileSync(pathC, Buffer.from(docC.output('arraybuffer')))
  console.log(`Saved ${pathC} (${docC.getNumberOfPages()} pages)`)

  console.log('All 3 test PDFs generated successfully!')
}

run().catch((err) => {
  console.error('Error generating test PDFs:', err)
  process.exit(1)
})
