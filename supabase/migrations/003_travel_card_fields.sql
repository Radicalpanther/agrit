-- ==============================================================================
-- AgriTrails Migration 003: Travel Safety Card Fields (Landmarks & Services)
-- Safe to run multiple times (idempotent)
-- ==============================================================================

-- 1. Add landmarks and nearby_services jsonb columns to farms
alter table farms
  add column if not exists landmarks jsonb not null default '[]'::jsonb,
  add column if not exists nearby_services jsonb not null default '{}'::jsonb;

-- 2. Populate realistic curated landmarks and nearby services for all 7 seeded farms
update farms
set
  landmarks = '[
    {"name": "Hathkhamba Junction (NH66)", "type": "highway_junction", "note": "Exit NH66 onto Ratnagiri bypass road", "distance_km_to_farm": 18.5},
    {"name": "Kajali River Bridge", "type": "bridge", "note": "Scenic river crossing along SH4", "distance_km_to_farm": 12.0},
    {"name": "Ratnagiri Central ST Bus Stand", "type": "town", "note": "Main transit hub with local rickshaws and market", "distance_km_to_farm": 8.5},
    {"name": "Mirya Phata Ganesh Temple", "type": "temple", "note": "Turn right at the white temple arch", "distance_km_to_farm": 2.2},
    {"name": "Mirya Village Banyan Tree", "type": "landmark", "note": "Old banyan tree with wooden AgriTrails arrow", "distance_km_to_farm": 0.6}
  ]'::jsonb,
  nearby_services = '{
    "fuel": {"name": "Bharat Petroleum Mirya Bypass", "distance_km": 3.5, "phone": "+919822101112"},
    "atm": {"name": "State Bank of India ATM Mirya", "distance_km": 2.8},
    "pharmacy": {"name": "Sanjivani Medical & General Store", "distance_km": 3.1, "phone": "+919822101113"},
    "grocery": {"name": "Patil Village Provision Store", "distance_km": 1.2},
    "hospital": {"name": "Ratnagiri District Civil Hospital", "distance_km": 8.2, "phone": "02352-222365"},
    "police": {"name": "Ratnagiri City Police Station", "distance_km": 7.8, "phone": "02352-222222"}
  }'::jsonb
where slug = 'kokan-roots-farmstay';

update farms
set
  landmarks = '[
    {"name": "Ratnagiri Railway Station (KRCL)", "type": "town", "note": "Major Konkan Railway hub", "distance_km_to_farm": 11.0},
    {"name": "Kuwarbav Highway Crossing", "type": "highway_junction", "note": "Connects NH66 and coastal road", "distance_km_to_farm": 8.0},
    {"name": "Pawas Coastal Estuary Bridge", "type": "bridge", "note": "Cross the backwaters heading south", "distance_km_to_farm": 3.5},
    {"name": "Swami Swaroopanand Ashram Turn", "type": "temple", "note": "Follow signage for Pawas south gate", "distance_km_to_farm": 2.0},
    {"name": "Aamrai Orchard Wooden Gate", "type": "gate", "note": "Green wooden gate with painted Alphonso mango emblem", "distance_km_to_farm": 0.1}
  ]'::jsonb,
  nearby_services = '{
    "fuel": {"name": "Indian Oil Pawas Rural Pump", "distance_km": 2.5, "phone": "+919822102221"},
    "atm": {"name": "Bank of Maharashtra ATM Pawas", "distance_km": 2.1},
    "pharmacy": {"name": "Pawas Community Pharmacy", "distance_km": 2.3, "phone": "+919822102222"},
    "grocery": {"name": "Shree Samarth Provisions", "distance_km": 1.8},
    "hospital": {"name": "Pawas Primary Health Centre (PHC)", "distance_km": 3.0, "phone": "02352-234200"},
    "police": {"name": "Purnagad Coastal Police Station", "distance_km": 6.5, "phone": "02352-234100"}
  }'::jsonb
where slug = 'aamrai-orchard-escape';

update farms
set
  landmarks = '[
    {"name": "Surur Toll Plaza (NH48)", "type": "toll_plaza", "note": "Turn off NH48 towards Wai and Panchgani", "distance_km_to_farm": 26.0},
    {"name": "Krishna River Wai Bridge", "type": "river", "note": "Ancient stone ghats visible upstream", "distance_km_to_farm": 14.5},
    {"name": "Pasarni Ghat Hairpin 4", "type": "highway_junction", "note": "Scenic viewpoint overlooking Dhom dam", "distance_km_to_farm": 6.2},
    {"name": "Dandeghar Phata ST Stop", "type": "town", "note": "Turn left onto the packed hillside mud road", "distance_km_to_farm": 3.0},
    {"name": "Sahyadri Stone Farm Gate", "type": "gate", "note": "Hand-laid laterite stone wall with carved cedar gate", "distance_km_to_farm": 0.2}
  ]'::jsonb,
  nearby_services = '{
    "fuel": {"name": "HP Fuel Station Panchgani Market", "distance_km": 4.2, "phone": "+919822103331"},
    "atm": {"name": "HDFC Bank ATM Panchgani", "distance_km": 3.8},
    "pharmacy": {"name": "Tableland Medical Store", "distance_km": 4.0, "phone": "+919822103332"},
    "grocery": {"name": "Dandeghar Fresh Produce & Provisions", "distance_km": 2.5},
    "hospital": {"name": "Bel-Air Hospital Panchgani", "distance_km": 5.5, "phone": "02168-240211"},
    "police": {"name": "Panchgani Police Station", "distance_km": 4.5, "phone": "02168-240333"}
  }'::jsonb
where slug = 'sahyadri-soil-and-soul';

update farms
set
  landmarks = '[
    {"name": "Kinaye Toll Plaza (NH48)", "type": "toll_plaza", "note": "Take exit towards Jaysingpur sugar belt", "distance_km_to_farm": 15.0},
    {"name": "Panchganga River Overbridge", "type": "bridge", "note": "Crossing into sugarcane country", "distance_km_to_farm": 9.5},
    {"name": "Jaysingpur Sugar Mill Cross", "type": "highway_junction", "note": "Turn east onto the canal link road", "distance_km_to_farm": 5.0},
    {"name": "Datta Mandir Weighbridge", "type": "temple", "note": "Sugarcane weighing station on the right", "distance_km_to_farm": 2.1},
    {"name": "Gur Ghar Traditional Bhatti Chimney", "type": "landmark", "note": "Tall brick chimney of organic jaggery press visible", "distance_km_to_farm": 0.4}
  ]'::jsonb,
  nearby_services = '{
    "fuel": {"name": "Bharat Petroleum Jaysingpur Bypass", "distance_km": 3.2, "phone": "+919822104441"},
    "atm": {"name": "Kolhapur District Central Bank ATM", "distance_km": 2.8},
    "pharmacy": {"name": "Kisan Medical & Surgical", "distance_km": 3.0, "phone": "+919822104442"},
    "grocery": {"name": "Mahalaxmi Kirana Store", "distance_km": 1.5},
    "hospital": {"name": "Chhatrapati Pramila Raje Hospital (CPR Kolhapur)", "distance_km": 9.8, "phone": "0231-2641555"},
    "police": {"name": "Shirol Rural Police Station", "distance_km": 4.2, "phone": "0231-265100"}
  }'::jsonb
where slug = 'gur-ghar-kolhapur';

update farms
set
  landmarks = '[
    {"name": "Dwarka Circle Flyover Nashik", "type": "highway_junction", "note": "Exit Mumbai-Agra highway towards Gangapur Road", "distance_km_to_farm": 12.5},
    {"name": "Godavari River Causeway", "type": "river", "note": "Cross upstream Godavari tributary", "distance_km_to_farm": 7.2},
    {"name": "Gangapur Dam Spillway View", "type": "landmark", "note": "Dam backwaters and vineyards on right", "distance_km_to_farm": 3.5},
    {"name": "Someshwar Temple Arch", "type": "temple", "note": "Follow wine & grape valley signs", "distance_km_to_farm": 1.8},
    {"name": "Draksha Valley Stone Gate", "type": "gate", "note": "Carved stone gate with brass grape vine motif", "distance_km_to_farm": 0.2}
  ]'::jsonb,
  nearby_services = '{
    "fuel": {"name": "Indian Oil Gangapur Road Station", "distance_km": 2.8, "phone": "+919822105551"},
    "atm": {"name": "ICICI Bank ATM Gangapur", "distance_km": 2.5},
    "pharmacy": {"name": "Apollo Pharmacy Gangapur Branch", "distance_km": 3.0, "phone": "+919822105552"},
    "grocery": {"name": "Valley Mart Organic Groceries", "distance_km": 1.7},
    "hospital": {"name": "Nashik Civil Hospital & Trauma Centre", "distance_km": 7.5, "phone": "0253-2576106"},
    "police": {"name": "Gangapur Police Station", "distance_km": 3.8, "phone": "0253-2311200"}
  }'::jsonb
where slug = 'draksha-valley-stay';

update farms
set
  landmarks = '[
    {"name": "Thamarassery Churam Hairpin 9", "type": "highway_junction", "note": "Top of mountain pass overlooking Malabar plains", "distance_km_to_farm": 32.0},
    {"name": "Kabini River Tributary Bridge", "type": "bridge", "note": "Stream beside bamboo forest reserve", "distance_km_to_farm": 8.5},
    {"name": "Sulthan Bathery Junction (NH766)", "type": "town", "note": "Take Ambalavayal heritage spice road", "distance_km_to_farm": 5.2},
    {"name": "Edakkal Caves Foothill Turn", "type": "landmark", "note": "Turn left at coffee growers cooperative board", "distance_km_to_farm": 2.0},
    {"name": "Spice Hills Pepper Vine Arch", "type": "gate", "note": "Living green bamboo & black pepper vine gate", "distance_km_to_farm": 0.1}
  ]'::jsonb,
  nearby_services = '{
    "fuel": {"name": "HP Auto Fuels Ambalavayal", "distance_km": 2.4, "phone": "+919847106661"},
    "atm": {"name": "Federal Bank ATM Ambalavayal", "distance_km": 2.0},
    "pharmacy": {"name": "Kerala Medical & Ayurvedic Pharmacy", "distance_km": 2.1, "phone": "+919847106662"},
    "grocery": {"name": "Malabar Fresh Village Store", "distance_km": 1.9},
    "hospital": {"name": "Sulthan Bathery Taluk Government Hospital", "distance_km": 6.8, "phone": "04936-220224"},
    "police": {"name": "Ambalavayal Police Station", "distance_km": 2.6, "phone": "04936-260233"}
  }'::jsonb
where slug = 'spice-hills-homestay';

update farms
set
  landmarks = '[
    {"name": "Golden Gate GT Road Interchange (NH3)", "type": "highway_junction", "note": "Grand entry arch to Amritsar bypass", "distance_km_to_farm": 14.0},
    {"name": "Upper Bari Doab Canal Bridge", "type": "bridge", "note": "Cross traditional brick-lined irrigation canal", "distance_km_to_farm": 7.5},
    {"name": "Attari Border Road Junction", "type": "town", "note": "Turn north towards village link road", "distance_km_to_farm": 4.8},
    {"name": "Gurdwara Sahib Village Square", "type": "temple", "note": "High Nishan Sahib visible across mustard fields", "distance_km_to_farm": 1.5},
    {"name": "Sarson da Khet Brick Gateway", "type": "gate", "note": "Traditional Punjabi painted brick portal and tractor track", "distance_km_to_farm": 0.3}
  ]'::jsonb,
  nearby_services = '{
    "fuel": {"name": "Indian Oil Kisan Seva Kendra Attari", "distance_km": 3.5, "phone": "+919814107771"},
    "atm": {"name": "Punjab National Bank ATM Attari", "distance_km": 3.0},
    "pharmacy": {"name": "Singh Medical Hall Attari", "distance_km": 2.8, "phone": "+919814107772"},
    "grocery": {"name": "Kisan Karyana Provision Store", "distance_km": 1.4},
    "hospital": {"name": "Guru Nanak Dev Hospital Amritsar", "distance_km": 11.2, "phone": "0183-2573200"},
    "police": {"name": "Attari Police Station", "distance_km": 3.9, "phone": "0183-2382100"}
  }'::jsonb
where slug = 'sarson-da-khet';
