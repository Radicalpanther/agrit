-- ==============================================================================
-- AgriTrails Migration 002: Add Nationwide Farms Across Major Regions of India
-- Safe to run multiple times (idempotent via ON CONFLICT and WHERE NOT EXISTS)
-- Does NOT touch or overwrite existing farm records.
-- ==============================================================================

-- Ensure published column exists on farms (from migration 001)
alter table farms add column if not exists published boolean not null default true;

do $$
declare
  v_farmer_id uuid;
begin
  -- Resolve owner_id from existing farmer profile, fallback to any profile or null
  select id into v_farmer_id from profiles where role = 'farmer' limit 1;
  if v_farmer_id is null then
    select id into v_farmer_id from profiles limit 1;
  end if;

  -- ----------------------------------------------------------------------------
  -- 1. Insert New Crops
  -- ----------------------------------------------------------------------------
  insert into crops (name, place, region, kind, months)
  select c.name, c.place, c.region, c.kind::crop_kind, c.months
  from (values
    ('Gir Kesar Mango',          'Talala Gir',  'Gujarat',          'harvest', array[4,5]),
    ('Pushkar Damask Rose',      'Pushkar',     'Rajasthan',        'harvest', array[1,2,3]),
    ('Kumaon Himalayan Apricot', 'Mukteshwar',  'Uttarakhand',      'harvest', array[4,5,6]),
    ('Nilgiri Frost Tea',        'Coonoor',     'Tamil Nadu',       'harvest', array[11,0,1]),
    ('Darjeeling First Flush',   'Kurseong',    'West Bengal',      'harvest', array[2,3])
  ) as c(name, place, region, kind, months)
  where not exists (
    select 1 from crops where crops.name = c.name
  );

  -- ----------------------------------------------------------------------------
  -- 2. Insert New Farms Across Major Indian Regions
  -- ----------------------------------------------------------------------------
  insert into farms (
    owner_id, slug, name, place, region, lat, lng,
    description, type, tags, price_paise, max_guests, image_url, verified,
    organic_pct, host_name, host_phone,
    directions_steps, landmark_note,
    allows_day_visit, day_visit_price_paise, day_visit_start, day_visit_end,
    rating_avg, review_count, published
  ) values
  (
    v_farmer_id,
    'himachal-apple-highlands',
    'Himachal Apple Highlands',
    'Kotgarh, Shimla',
    'Himachal Pradesh',
    31.3174, 77.4777,
    'Perched on high Himalayan slopes amidst century-old heritage apple orchards. Walk through blossoming terraces in spring, hand-pick crisp apples in autumn, and taste warm wood-fired Pahadi rajma by the hearth.',
    'Apple orchard · Mountain retreat',
    array['apple', 'himachal', 'mountains', 'orchard', 'organic'],
    260000, 6,
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=900&q=85',
    true, 95, 'Surender Stokes', '+919800000010',
    array['Take NH5 from Chandigarh through Shimla to Narkanda', 'Turn off towards Kotgarh village via the old apple trail', 'Farmhouse gate is 3 km down the pine-lined track'],
    'Wooden heritage gate with carved deodar arch opposite Kotgarh post office',
    true, 80000, '09:00'::time, '17:00'::time,
    4.9, 38, true
  ),
  (
    v_farmer_id,
    'pampore-saffron-haven',
    'Pampore Saffron Haven',
    'Pampore, Kashmir',
    'Kashmir',
    34.0182, 74.9312,
    'Located in the historic saffron plateaus (karewas) of Pampore. Experience purple saffron blossoms at autumn dawn, learn the delicate art of stigma plucking, and sip steaming saffron kahwa brewed on a brass samovar.',
    'Saffron fields · Walnut orchard',
    array['saffron', 'kashmir', 'walnut', 'valley', 'organic'],
    320000, 4,
    'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=85',
    true, 100, 'Bashir Ahmad Wani', '+919800000011',
    array['From Srinagar airport take NH44 south towards Anantnag', 'Exit at Pampore karewa bypass', 'Follow the saffron grove road for 2.5 km'],
    'Ancient brick courtyard near the Pampore Karewa Saffron cooperative',
    true, 100000, '09:30'::time, '16:30'::time,
    4.9, 44, true
  ),
  (
    v_farmer_id,
    'brahmaputra-tea-estate',
    'Brahmaputra Heritage Tea Estate',
    'Tezpur, Assam',
    'Assam',
    26.6528, 92.7926,
    'Sprawling across gentle hills bordered by the mighty Brahmaputra river. Join traditional tea pluckers with woven baskets at daybreak, witness leaf withering and oxidation, and sleep in a restored colonial planter home.',
    'Tea plantation · Riverfront estate',
    array['tea', 'assam', 'plantation', 'heritage', 'northeast'],
    240000, 6,
    'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=900&q=85',
    true, 90, 'Pranab Saikia', '+919800000012',
    array['Fly to Guwahati or Tezpur', 'Drive NH15 towards Tezpur tea belt', 'Enter through the arched bamboo gate marked Brahmaputra Estate'],
    'Tea estate watchtower right beside the river embankment road',
    true, 75000, '08:30'::time, '16:30'::time,
    4.8, 33, true
  ),
  (
    v_farmer_id,
    'coorg-cloud-coffee-estate',
    'Coorg Cloud Coffee Estate',
    'Madikeri, Coorg',
    'Karnataka',
    12.4244, 75.7382,
    'An ancient shade-grown coffee plantation enveloped in mist and rainforest greenery. Walk along pepper vines clinging to silver oak trees, hand-pick ripe red coffee berries, and brew estate pour-overs on the veranda.',
    'Coffee estate · Rain-forest farm',
    array['coffee', 'coorg', 'spices', 'rainforest', 'south-india'],
    210000, 6,
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=85',
    true, 95, 'Kaveri Bopanna', '+919800000013',
    array['From Mysore take SH88 to Madikeri (120 km)', 'Turn towards Siddapur road at toll junction', 'Follow the winding coffee lane for 4 km'],
    'Red tile roof bungalow opposite the silver oak plantation board',
    true, 70000, '09:00'::time, '17:00'::time,
    4.9, 52, true
  ),
  (
    v_farmer_id,
    'gir-somnath-kesar-grove',
    'Gir Somnath Kesar Grove',
    'Talala Gir, Gujarat',
    'Gujarat',
    21.0543, 70.5264,
    'Located in the famous Gir Kesar mango heartland near Gir National Park. Experience organic mango orchards watered from natural step-wells, interact with native Gir cows, and taste hot Bajra rotla with fresh white butter.',
    'Kesar mango · Gir cow sanctuary',
    array['mango', 'gujarat', 'gir-cow', 'organic', 'west-india'],
    185000, 8,
    'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=900&q=85',
    true, 100, 'Devraj Vala', '+919800000014',
    array['From Junagadh take SH26 towards Talala Gir (45 km)', 'Turn right at the mango market yard bypass', 'Farm entrance is 1.5 km ahead on the village canal road'],
    'White stone gate with carving of Gir lions and mango tree',
    true, 65000, '08:30'::time, '16:30'::time,
    4.8, 29, true
  ),
  (
    v_farmer_id,
    'thar-desert-farmstead',
    'Thar Desert Organic Farmstead',
    'Pushkar, Rajasthan',
    'Rajasthan',
    26.4899, 74.5511,
    'An oasis of organic farming where desert sands meet fragrant fields of indigenous Damask roses and pearl millet. Witness early dawn rose-water distillation, explore sandy trails on camel carts, and eat under star-lit skies.',
    'Rose cultivation · Organic millet',
    array['rajasthan', 'rose-water', 'millet', 'desert', 'heritage'],
    195000, 6,
    'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=900&q=85',
    true, 90, 'Rameshwar Gurjar', '+919800000015',
    array['From Ajmer take Pushkar ghat road', 'Head 5 km northwest towards Motisar road', 'Follow the painted pink rose stones to the farm gate'],
    'Clay mud boundary wall decorated with traditional Mandana paintings',
    true, 65000, '09:00'::time, '17:00'::time,
    4.8, 36, true
  ),
  (
    v_farmer_id,
    'narmada-valley-heritage-farm',
    'Narmada Valley Heritage Farm',
    'Hoshangabad, Madhya Pradesh',
    'Madhya Pradesh',
    22.7519, 77.7289,
    'Located in the rich black soil floodplains of the sacred Narmada river. Known for famous Sharbati golden wheat and organic chickpeas. Experience community harvesting, riverbank walks, and comforting central Indian village meals.',
    'Sharbati wheat · Organic pulses',
    array['wheat', 'madhya-pradesh', 'central-india', 'organic', 'riverfront'],
    145000, 6,
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=85',
    true, 85, 'Shyamlal Yadav', '+919800000016',
    array['From Bhopal take NH46 south to Hoshangabad (70 km)', 'Cross Narmada bridge and take riverbank village road', 'Farm gate is 6 km ahead'],
    'Old mango grove next to the Narmada ghat steps',
    true, 55000, '09:00'::time, '17:00'::time,
    4.7, 24, true
  ),
  (
    v_farmer_id,
    'kumaon-terrace-orchard',
    'Kumaon Terrace Orchard Farm',
    'Mukteshwar, Uttarakhand',
    'Uttarakhand',
    29.4722, 79.6479,
    'Perched at 7,000 feet with panoramic views of snow-capped Trishul and Nanda Devi peaks. Wander through terraced orchards of apricots, wild plums, and mountain herbs, and enjoy hearty Pahadi meals cooked in brass pots.',
    'Terraced fruit farm · Himalayan view',
    array['uttarakhand', 'apricots', 'himalayan', 'terrace', 'north-india'],
    230000, 4,
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85',
    true, 95, 'Bhuwan Chandra Joshi', '+919800000017',
    array['From Kathgodam railway station take Bhowali-Mukteshwar road (65 km)', 'Turn at Bhatelia junction towards Sargakhet', 'Follow the stone paved orchard trail for 1 km'],
    'Traditional slate-roof stone farmhouse with red wooden windows',
    true, 75000, '09:30'::time, '16:30'::time,
    4.9, 41, true
  ),
  (
    v_farmer_id,
    'nilgiri-cloud-tea',
    'Nilgiri Cloud Tea & Spices',
    'Coonoor, Tamil Nadu',
    'Tamil Nadu',
    11.3530, 76.7959,
    'High amidst the rolling blue slopes of the Nilgiris, surrounded by cloud forests and eucalyptus aromas. Pluck fine high-grown frost tea, discover rare hillside spices, and relax with panoramic valley lookouts.',
    'High-altitude tea · Herb gardens',
    array['tamil-nadu', 'nilgiri', 'tea', 'western-ghats', 'south-india'],
    225000, 5,
    'https://images.unsplash.com/photo-1576085898323-218337e3e43c?auto=format&fit=crop&w=900&q=85',
    true, 90, 'Selvamani Ramanathan', '+919800000018',
    array['From Coimbatore airport drive Mettupalayam to Coonoor (70 km)', 'Take the upper Coonoor valley tea road', 'Enter through the tea estate arch opposite Brooklands'],
    'Cottage with stone porch facing the tea slopes and eucalyptus trees',
    true, 70000, '09:00'::time, '17:00'::time,
    4.8, 35, true
  ),
  (
    v_farmer_id,
    'darjeeling-mist-farmstay',
    'Darjeeling Mist Tea Farmstay',
    'Kurseong, West Bengal',
    'West Bengal',
    26.8812, 88.2777,
    'Located on misty ridges where famous Darjeeling Muscatel tea grows alongside mandarin orange trees. Experience first flush plucking on dizzying slopes, stay with friendly Gorkha hosts, and enjoy authentic momos steamed on the chulha.',
    'Biodynamic tea · Orange grove',
    array['west-bengal', 'darjeeling', 'tea', 'orange', 'east-india'],
    250000, 4,
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=85',
    true, 100, 'Pemba Tamang', '+919800000019',
    array['From Bagdogra airport or NJP station take Hill Cart Road (45 km)', 'Turn uphill at Kurseong tourist lodge junction', 'Farm entrance is 2 km on the ridge road'],
    'Brightly painted wooden prayer flags at the entry gate overlooking the valley',
    true, 80000, '09:00'::time, '16:30'::time,
    4.9, 47, true
  )
  on conflict (slug) do nothing;

  -- ----------------------------------------------------------------------------
  -- 3. Link Farms to Crops
  -- ----------------------------------------------------------------------------
  insert into farm_crops (farm_id, crop_id)
  select f.id, c.id
  from (values
    ('himachal-apple-highlands',     'Apple'),
    ('pampore-saffron-haven',        'Saffron (Kesar)'),
    ('brahmaputra-tea-estate',       'Assam Tea'),
    ('coorg-cloud-coffee-estate',    'Coorg Coffee'),
    ('coorg-cloud-coffee-estate',    'Kerala Spices'),
    ('gir-somnath-kesar-grove',      'Gir Kesar Mango'),
    ('thar-desert-farmstead',        'Pushkar Damask Rose'),
    ('narmada-valley-heritage-farm', 'Wheat'),
    ('kumaon-terrace-orchard',       'Kumaon Himalayan Apricot'),
    ('nilgiri-cloud-tea',            'Nilgiri Frost Tea'),
    ('darjeeling-mist-farmstay',     'Darjeeling First Flush')
  ) as fc(slug, crop_name)
  join farms f on f.slug = fc.slug
  join crops c on c.name = fc.crop_name
  on conflict (farm_id, crop_id) do nothing;

  -- ----------------------------------------------------------------------------
  -- 4. Insert On-Farm Activities
  -- ----------------------------------------------------------------------------
  insert into activities (farm_id, name, kind, duration_min, best_months, sort_hint)
  select f.id, a.name, a.kind::activity_kind, a.duration_min, a.best_months, a.sort_hint::sort_hint
  from (values
    -- Himachal Apple Highlands
    ('himachal-apple-highlands', 'Apple harvesting and sorting', 'farming', 90, array[7,8,9], 'morning'),
    ('himachal-apple-highlands', 'Raw apple cider vinegar pressing', 'culinary', 60, array[8,9,10], 'midday'),
    ('himachal-apple-highlands', 'Cedar forest trail and birding', 'relaxation', 75, '{}', 'morning'),
    ('himachal-apple-highlands', 'Chulha siddu making with walnut chutney', 'culinary', 90, '{}', 'evening'),
    ('himachal-apple-highlands', 'Pine deck mountain meditation', 'relaxation', 45, '{}', 'morning'),

    -- Pampore Saffron Haven
    ('pampore-saffron-haven', 'Saffron flower harvesting at sunrise', 'farming', 90, array[9,10], 'morning'),
    ('pampore-saffron-haven', 'Kahwa brewing on brass samovar', 'culinary', 45, '{}', 'morning'),
    ('pampore-saffron-haven', 'Walnut de-husking and sun drying', 'farming', 60, array[8,9], 'midday'),
    ('pampore-saffron-haven', 'Chinar shade garden contemplation', 'relaxation', 60, '{}', 'afternoon'),
    ('pampore-saffron-haven', 'Wazwan haak-saag cooking class', 'culinary', 90, '{}', 'evening'),

    -- Brahmaputra Heritage Tea Estate
    ('brahmaputra-tea-estate', 'Two leaves and a bud tea plucking', 'farming', 90, array[2,3,4,5], 'morning'),
    ('brahmaputra-tea-estate', 'Orthodox tea rolling and tasting', 'culinary', 60, array[2,3,4,5], 'midday'),
    ('brahmaputra-tea-estate', 'Riverbank bamboo weaving session', 'relaxation', 60, '{}', 'afternoon'),
    ('brahmaputra-tea-estate', 'Assamese pitika and fish curry hearth feast', 'culinary', 90, '{}', 'evening'),
    ('brahmaputra-tea-estate', 'Dawn wetland bird trail', 'relaxation', 75, array[10,11,0,1], 'morning'),

    -- Coorg Cloud Coffee Estate
    ('coorg-cloud-coffee-estate', 'Arabica coffee berry harvest', 'farming', 90, array[10,11,0], 'morning'),
    ('coorg-cloud-coffee-estate', 'Estate roast and cupping masterclass', 'culinary', 60, '{}', 'midday'),
    ('coorg-cloud-coffee-estate', 'Pepper and cardamom canopy trail', 'farming', 75, array[0,1,2], 'morning'),
    ('coorg-cloud-coffee-estate', 'Kodava kachampuli curry cooking', 'culinary', 90, '{}', 'evening'),
    ('coorg-cloud-coffee-estate', 'Rainforest stream sit and hammock nap', 'relaxation', 90, '{}', 'afternoon'),

    -- Gir Somnath Kesar Grove
    ('gir-somnath-kesar-grove', 'Kesar mango plucking and crate grading', 'farming', 90, array[4,5], 'morning'),
    ('gir-somnath-kesar-grove', 'Gir cow gaushala care and bilona churning', 'farming', 60, '{}', 'morning'),
    ('gir-somnath-kesar-grove', 'Kathiyawadi ringna no olo on open fire', 'culinary', 90, array[10,11,0,1], 'evening'),
    ('gir-somnath-kesar-grove', 'Organic mango pulp bottling', 'culinary', 60, array[4,5], 'midday'),
    ('gir-somnath-kesar-grove', 'Orchard canopy night stargazing', 'relaxation', 60, '{}', 'evening'),

    -- Thar Desert Organic Farmstead
    ('thar-desert-farmstead', 'Dawn rose petal plucking', 'farming', 75, array[1,2,3], 'morning'),
    ('thar-desert-farmstead', 'Copper-deg rose water distillation', 'culinary', 60, array[1,2,3], 'morning'),
    ('thar-desert-farmstead', 'Pearl millet (Bajra) threshing and roasting', 'farming', 60, array[9,10], 'midday'),
    ('thar-desert-farmstead', 'Traditional Dal Baati Churma cooked on cow-dung cakes', 'culinary', 100, '{}', 'evening'),
    ('thar-desert-farmstead', 'Dune sunset camel ride', 'relaxation', 60, '{}', 'afternoon'),

    -- Narmada Valley Heritage Farm
    ('narmada-valley-heritage-farm', 'Sharbati wheat harvesting and bundle making', 'farming', 90, array[2,3], 'morning'),
    ('narmada-valley-heritage-farm', 'Stone-chakki flour milling workshop', 'culinary', 45, '{}', 'midday'),
    ('narmada-valley-heritage-farm', 'Wood-fired bafla and dal lunch circle', 'culinary', 90, '{}', 'midday'),
    ('narmada-valley-heritage-farm', 'Narmada holy riverbank evening quiet', 'relaxation', 60, '{}', 'evening'),
    ('narmada-valley-heritage-farm', 'Earthen seed ball making for rewilding', 'farming', 45, array[5,6], 'afternoon'),

    -- Kumaon Terrace Orchard Farm
    ('kumaon-terrace-orchard', 'Apricot and wild plum harvesting', 'farming', 90, array[4,5,6], 'morning'),
    ('kumaon-terrace-orchard', 'Buransh (rhododendron) flower cordial making', 'culinary', 60, array[2,3], 'midday'),
    ('kumaon-terrace-orchard', 'Himalayan peak viewing and journaling', 'relaxation', 60, '{}', 'morning'),
    ('kumaon-terrace-orchard', 'Pahadi Bhatt ki Churkani and Madua roti cooking', 'culinary', 90, '{}', 'evening'),
    ('kumaon-terrace-orchard', 'Terrace herb gathering for detox tea', 'farming', 45, '{}', 'afternoon'),

    -- Nilgiri Cloud Tea & Spices
    ('nilgiri-cloud-tea', 'High-grown winter frost tea plucking', 'farming', 90, array[11,0,1], 'morning'),
    ('nilgiri-cloud-tea', 'Small-batch artisanal tea pan-roasting', 'culinary', 60, '{}', 'midday'),
    ('nilgiri-cloud-tea', 'Eucalyptus and clove oil extraction demo', 'farming', 45, '{}', 'afternoon'),
    ('nilgiri-cloud-tea', 'Chettinad vegetarian farm lunch', 'culinary', 90, '{}', 'midday'),
    ('nilgiri-cloud-tea', 'Valley ridge tea-cup meditation', 'relaxation', 45, '{}', 'evening'),

    -- Darjeeling Mist Tea Farmstay
    ('darjeeling-mist-farmstay', 'First flush spring tea plucking', 'farming', 90, array[2,3], 'morning'),
    ('darjeeling-mist-farmstay', 'Darjeeling mandarin orange harvest', 'farming', 75, array[10,11,0], 'morning'),
    ('darjeeling-mist-farmstay', 'Traditional steamed momo making on firewood', 'culinary', 90, '{}', 'evening'),
    ('darjeeling-mist-farmstay', 'Tea tasting of spring, summer and autumn flushes', 'culinary', 60, '{}', 'midday'),
    ('darjeeling-mist-farmstay', 'Toy train view deck silence', 'relaxation', 60, '{}', 'afternoon')
  ) as a(slug, name, kind, duration_min, best_months, sort_hint)
  join farms f on f.slug = a.slug
  where not exists (
    select 1 from activities act where act.farm_id = f.id and act.name = a.name
  );

  -- ----------------------------------------------------------------------------
  -- 5. Insert Farm Products
  -- ----------------------------------------------------------------------------
  insert into products (farm_id, name, detail, unit, price_paise, stock, in_season_months)
  select f.id, p.name, p.detail, p.unit, p.price_paise, p.stock, p.in_season_months
  from (values
    -- Himachal Apple Highlands
    ('himachal-apple-highlands', 'Dried Royal Delicious apples', 'Sun-dried unsweetened rings', '250 g', 32000, 35, array[7,8,9,10]),
    ('himachal-apple-highlands', 'Raw apple cider vinegar', 'Naturally fermented mother vinegar', '500 ml', 38000, 25, array[8,9,10,11]),
    ('himachal-apple-highlands', 'Wild Himalayan pine honey', 'Cold-extracted comb honey', '350 g', 45000, 20, array[3,4,5]),

    -- Pampore Saffron Haven
    ('pampore-saffron-haven', 'Pure Mongra Saffron GI-tagged', 'Sun-cured deep crimson stigmas', '2 g', 95000, 40, array[9,10,11]),
    ('pampore-saffron-haven', 'Kashmiri kagzi thin-shell walnuts', 'Organic cold-cracked whole nuts', '500 g', 42000, 30, array[8,9,10]),
    ('pampore-saffron-haven', 'Saffron infused acacia honey', 'Raw wild floral nectar', '250 g', 48000, 20, array[9,10]),

    -- Brahmaputra Heritage Tea Estate
    ('brahmaputra-tea-estate', 'Single-estate Golden Flowery Orange Pekoe', 'Hand-plucked whole orthodox leaf', '250 g', 45000, 50, array[2,3,4,5]),
    ('brahmaputra-tea-estate', 'Organic CTC strong breakfast blend', 'Rich malty morning tea', '500 g', 28000, 60, array[2,3,4,5]),
    ('brahmaputra-tea-estate', 'Wild forest stingless bee honey', 'Unheated medicinal nectar', '250 g', 39000, 25, array[3,4,5]),

    -- Coorg Cloud Coffee Estate
    ('coorg-cloud-coffee-estate', 'Medium roast Arabica single-origin', 'Hand-picked shade-grown beans', '250 g', 38000, 45, array[10,11,0]),
    ('coorg-cloud-coffee-estate', 'Coorg coffee blossom honey', 'Pure floral seasonal honey', '350 g', 44000, 30, array[1,2,3]),
    ('coorg-cloud-coffee-estate', 'Black tellicherry peppercorns', 'Sun-dried bold grade', '200 g', 26000, 40, array[0,1,2]),

    -- Gir Somnath Kesar Grove
    ('gir-somnath-kesar-grove', 'GI-tagged Talala Gir Kesar mango box', 'Directly orchard plucked organic box', '1 dozen', 90000, 35, array[4,5]),
    ('gir-somnath-kesar-grove', 'Vedic A2 Gir cow bilona ghee', 'Grass-fed traditional earthen pot churned', '500 ml', 85000, 20, '{}'),
    ('gir-somnath-kesar-grove', 'Organic dried sesame gachak', 'Raw sesame and jaggery brittle', '300 g', 22000, 30, array[11,0,1]),

    -- Thar Desert Organic Farmstead
    ('thar-desert-farmstead', 'Pure steam-distilled Pushkar rose water', 'Made in traditional copper degs', '200 ml', 34000, 50, array[1,2,3]),
    ('thar-desert-farmstead', 'Raw sun-baked Gulkand', 'Damask rose petals cured with rock sugar', '350 g', 32000, 40, array[1,2,3]),
    ('thar-desert-farmstead', 'Heirloom Bajra whole grain', 'Naturally grown rainfed millet', '2 kg', 22000, 30, array[9,10,11]),

    -- Narmada Valley Heritage Farm
    ('narmada-valley-heritage-farm', 'Unpolished Sharbati golden wheat grain', 'Naturally sweet GI-recognized grain', '5 kg', 42000, 40, array[2,3,4]),
    ('narmada-valley-heritage-farm', 'Roasted desi chana sattu powder', 'High protein wood-roasted grain', '500 g', 21000, 35, array[3,4,5]),
    ('narmada-valley-heritage-farm', 'Cold-pressed black mustard oil', 'Wood kolhu extracted', '1 litre', 26000, 25, array[1,2,3]),

    -- Kumaon Terrace Orchard Farm
    ('kumaon-terrace-orchard', 'Sun-dried sweet apricot kernels & fruit', 'Hand-pitted mountain harvest', '300 g', 36000, 30, array[5,6,7]),
    ('kumaon-terrace-orchard', 'Wild Rhododendron (Buransh) nectar', 'Cold-pressed flower preserve', '500 ml', 34000, 25, array[2,3,4]),
    ('kumaon-terrace-orchard', 'Organic finger millet (Madua) flour', 'Stone-ground high iron grain', '1 kg', 22000, 40, array[9,10,11]),

    -- Nilgiri Cloud Tea & Spices
    ('nilgiri-cloud-tea', 'Nilgiri Blue Mountain Winter Frost Tea', 'Fine aromatic whole leaf orthodox', '200 g', 42000, 40, array[11,0,1]),
    ('nilgiri-cloud-tea', 'Steam-distilled pure eucalyptus oil', 'Handmade from wild blue gum leaves', '100 ml', 28000, 50, '{}'),
    ('nilgiri-cloud-tea', 'Coonoor green cardamom pods', 'Hill grown extra bold', '100 g', 38000, 35, array[9,10,11]),

    -- Darjeeling Mist Tea Farmstay
    ('darjeeling-mist-farmstay', 'Single Estate Darjeeling First Flush (FTGFOP1)', 'Muscatel floral character', '150 g', 65000, 30, array[2,3,4]),
    ('darjeeling-mist-farmstay', 'Darjeeling orange blossom marmalade', 'Pulp and peel slow simmered', '350 g', 28000, 25, array[11,0,1]),
    ('darjeeling-mist-farmstay', 'Fire-cured Dalle Khursani chili preserve', 'Fiery round mountain chillies in mustard oil', '200 g', 24000, 35, array[8,9,10])
  ) as p(slug, name, detail, unit, price_paise, stock, in_season_months)
  join farms f on f.slug = p.slug
  where not exists (
    select 1 from products prod where prod.farm_id = f.id and prod.name = p.name
  );

end;
$$;
