import {
  searchFarms,
  getFarmDetails,
  getSeasonalCrops,
  SearchFarmsParams,
  GetFarmDetailsParams,
  GetSeasonalCropsParams,
} from './ai-tools'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function getSystemPrompt(locale: string = 'en'): string {
  let langInstruction = 'Respond in English.'
  if (locale === 'hi') {
    langInstruction = 'Respond in Hindi (हिन्दी).'
  } else if (locale === 'mr') {
    langInstruction = 'Respond in Marathi (मराठी).'
  }

  return `You are AgriGuide, the rural farm stay and harvest seasonal advisor for AgriTrails.
CRITICAL OPERATING RULES:
1. Answer ONLY using data returned by the provided tools. NEVER invent or assume prices, amenities, dates, or host details from memory.
2. Recommend 1 to 3 farms with a single-line reason each, always including a markdown link in the format: [Farm Name](/farms/[slug]). When recommending or mentioning artisanal farm products, link to the farm using: [Product Name](/farms/[slug]). Do NOT translate or modify the URL path or farm slug.
3. If no farm or crop matches the criteria, say so plainly without inventing alternatives.
4. Ask at most ONE clarifying question if the user request is underspecified.
5. NEVER use emojis in any part of your reply.
6. Keep replies concise, factual, and formatted with plain paragraphs and clean bullet points.
7. Format all currency in Indian Rupees (e.g. ₹2,500). When invoking tools, keep all budget and price arguments strictly in paise (e.g. 250000 for ₹2,500).
8. LANGUAGE: ${langInstruction} Provide your entire conversational narrative in this language, while keeping tool parameters, prices in paise, and markdown links to /farms/[slug] unchanged.`
}

export const SYSTEM_PROMPT = getSystemPrompt('en')

// Tool definitions for Anthropic Claude
const CLAUDE_TOOLS = [
  {
    name: 'searchFarms',
    description: 'Search for farm stays in the database matching budget, region, month, experience, or guest count.',
    input_schema: {
      type: 'object',
      properties: {
        budget_max_paise: {
          type: 'number',
          description: 'Maximum budget per guest in paise (e.g. 250000 for ₹2,500).',
        },
        region: {
          type: 'string',
          description: 'Geographical region in India (e.g. Maharashtra, Himachal Pradesh, Kerala, Punjab, Karnataka, Rajasthan, Kashmir).',
        },
        month: {
          type: 'number',
          description: 'Month index (0 for January to 11 for December).',
        },
        experience: {
          type: 'string',
          description: 'Type of farm activity or harvest (e.g. farming, culinary, relaxation, mango, spices).',
        },
        guests: {
          type: 'number',
          description: 'Number of guests travelling.',
        },
      },
    },
  },
  {
    name: 'getFarmDetails',
    description: 'Retrieve detailed farmstay information including amenities, rules, check-in policies, and review rating breakdown by slug.',
    input_schema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The unique slug identifier of the farm (e.g. kokan-roots-farmstay).',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'getSeasonalCrops',
    description: 'Query active harvest and sowing crops across regions for a specific calendar month.',
    input_schema: {
      type: 'object',
      properties: {
        month: {
          type: 'number',
          description: 'Month index (0 for January to 11 for December). Defaults to current month.',
        },
        region: {
          type: 'string',
          description: 'Optional filter by region in India (e.g. Maharashtra, Himachal Pradesh, Kerala, Punjab, Karnataka, Rajasthan).',
        },
      },
    },
  },
]

// Dispatch tool execution
async function executeTool(name: string, args: any) {
  if (name === 'searchFarms') {
    return await searchFarms(args as SearchFarmsParams)
  }
  if (name === 'getFarmDetails') {
    return await getFarmDetails(args as GetFarmDetailsParams)
  }
  if (name === 'getSeasonalCrops') {
    return await getSeasonalCrops(args as GetSeasonalCropsParams)
  }
  return { error: `Tool ${name} not recognized` }
}

const FARM_DIRECTORY = [
  { slug: 'kokan-roots-farmstay', name: 'Kokan Roots Farmstay', aliases: ['kokan', 'konkan', 'dapoli', 'ratnagiri mango'] },
  { slug: 'aamrai-orchard-escape', name: 'Aamrai Orchard Escape', aliases: ['aamrai', 'orchard', 'pawas'] },
  { slug: 'sahyadri-soil-and-soul', name: 'Sahyadri Soil and Soul', aliases: ['sahyadri', 'panchgani', 'soil and soul'] },
  { slug: 'gur-ghar-kolhapur', name: 'Gur Ghar Kolhapur', aliases: ['gur ghar', 'kolhapur', 'jaggery', 'jaysingpur'] },
  { slug: 'draksha-valley-stay', name: 'Draksha Valley Stay', aliases: ['draksha', 'nashik', 'vineyard', 'grape'] },
  { slug: 'spice-hills-homestay', name: 'Spice Hills Homestay', aliases: ['spice hills', 'wayanad', 'kerala', 'pepper'] },
  { slug: 'sarson-da-khet', name: 'Sarson da Khet', aliases: ['sarson', 'amritsar', 'punjab'] },
  { slug: 'himachal-apple-highlands', name: 'Himachal Apple Highlands', aliases: ['himachal', 'apple', 'kotgarh', 'narkanda', 'shimla'] },
  { slug: 'adai-farm-house', name: 'Adai Farm House', aliases: ['adai', 'panvel', 'morbe'] },
  { slug: 'pampore-saffron-haven', name: 'Pampore Saffron Haven', aliases: ['pampore', 'saffron', 'kashmir'] },
  { slug: 'brahmaputra-tea-estate', name: 'Brahmaputra Heritage Tea Estate', aliases: ['brahmaputra', 'tea', 'tezpur', 'assam'] },
  { slug: 'coorg-cloud-coffee-estate', name: 'Coorg Cloud Coffee Estate', aliases: ['coorg', 'coffee', 'madikeri'] },
  { slug: 'gir-somnath-kesar-grove', name: 'Gir Somnath Kesar Grove', aliases: ['gir', 'kesar', 'somnath', 'talala'] },
  { slug: 'thar-desert-farmstead', name: 'Thar Desert Organic Farmstead', aliases: ['thar', 'desert', 'pushkar', 'rajasthan'] },
  { slug: 'narmada-valley-heritage-farm', name: 'Narmada Valley Heritage Farm', aliases: ['narmada', 'hoshangabad'] },
  { slug: 'kumaon-terrace-orchard', name: 'Kumaon Terrace Orchard Farm', aliases: ['kumaon', 'mukteshwar', 'uttarakhand'] },
  { slug: 'nilgiri-cloud-tea', name: 'Nilgiri Cloud Tea & Spices', aliases: ['nilgiri', 'coonoor', 'tamil nadu'] },
  { slug: 'darjeeling-mist-farmstay', name: 'Darjeeling Mist Tea Farmstay', aliases: ['darjeeling', 'kurseong', 'west bengal'] },
]

/**
 * Deterministic Mock AI Stream:
 * Inspects user query, maintains conversation context across multiple turns, invokes genuine database tools, and formats response per System Prompt rules.
 */
async function runMockAiStream(
  messages: ChatMessage[],
  writer: WritableStreamDefaultWriter<Uint8Array>,
  locale: string = 'en',
) {
  const encoder = new TextEncoder()
  const sendChunk = async (text: string) => {
    await writer.write(encoder.encode(text))
    await new Promise((r) => setTimeout(r, 20))
  }

  const lastUserMsg = messages[messages.length - 1]?.content || ''
  const q = lastUserMsg.toLowerCase().trim()

  // Find previous assistant message to understand conversational context
  let prevAssistantMsg = ''
  for (let i = messages.length - 2; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      prevAssistantMsg = messages[i].content.toLowerCase()
      break
    }
  }

  // Identify active target farm from current query or previous messages
  let targetFarm = FARM_DIRECTORY.find((f) =>
    q.includes(f.slug) ||
    q.includes(f.name.toLowerCase()) ||
    f.aliases.some((a) => q.includes(a))
  )

  if (!targetFarm) {
    for (let i = messages.length - 2; i >= 0; i--) {
      const prevText = messages[i].content.toLowerCase()
      targetFarm = FARM_DIRECTORY.find((f) =>
        prevText.includes(f.slug) ||
        prevText.includes(f.name.toLowerCase()) ||
        f.aliases.some((a) => prevText.includes(a))
      )
      if (targetFarm) break
    }
  }

  if (!targetFarm) {
    targetFarm = FARM_DIRECTORY[0] // fallback to Kokan Roots Farmstay
  }

  const formatPriceLine = (f: any) => {
    if (f.allows_day_visit && f.day_visit_price_inr) {
      if (locale === 'hi') {
        return `₹${f.overnight_price_inr}/रात (दिन की यात्रा: ₹${f.day_visit_price_inr})`
      }
      if (locale === 'mr') {
        return `₹${f.overnight_price_inr}/रात्र (दिवसाची भेट: ₹${f.day_visit_price_inr})`
      }
      return `₹${f.overnight_price_inr}/night (Day visit: ₹${f.day_visit_price_inr})`
    }
    if (locale === 'hi') return `₹${f.overnight_price_inr}/रात`
    if (locale === 'mr') return `₹${f.overnight_price_inr}/रात्र`
    return `₹${f.overnight_price_inr}/night`
  }

  try {
    const isAffirmative =
      q === 'yes' ||
      q === 'yeah' ||
      q === 'yep' ||
      q === 'sure' ||
      q === 'ok' ||
      q === 'okay' ||
      q.startsWith('yes ') ||
      q.includes('tell me more') ||
      q.includes('show details') ||
      q.includes('tell me details') ||
      q.includes('more details') ||
      q === 'हाँ' ||
      q === 'हां' ||
      q === 'हो' ||
      q === 'होय' ||
      q.includes('अधिक माहिती') ||
      q.includes('अधिक विवरण') ||
      q.includes('सांगा') ||
      q.includes('बताओ')

    const isAskingDirections =
      q.includes('direction') ||
      q.includes('reach') ||
      q.includes('route') ||
      q.includes('how to get') ||
      q.includes('location') ||
      q.includes('distance') ||
      q.includes('map') ||
      q.includes('address') ||
      q.includes('where is') ||
      q.includes('दिशा') ||
      q.includes('मार्ग') ||
      q.includes('रस्ता') ||
      q.includes('पहुंच') ||
      q.includes('पत्ता') ||
      q.includes('नकाशा')

    const isAskingActivities =
      q.includes('activit') ||
      q.includes('things to do') ||
      q.includes('chore') ||
      q.includes('bullock') ||
      q.includes('workshop') ||
      q.includes('tour') ||
      q.includes('experience') ||
      q.includes('गतिविधि') ||
      q.includes('उपक्रम') ||
      q.includes('बैलगाड़ी') ||
      q.includes('बैलगाडी')

    const isAskingFoodOrAmenities =
      q.includes('food') ||
      q.includes('meal') ||
      q.includes('eat') ||
      q.includes('amenit') ||
      q.includes('breakfast') ||
      q.includes('lunch') ||
      q.includes('dinner') ||
      q.includes('organic food') ||
      q.includes('खाना') ||
      q.includes('जेवण') ||
      q.includes('भोजन') ||
      q.includes('सुविधा') ||
      q.includes('नाश्ता')

    const isAskingPricingOrBooking =
      q.includes('price') ||
      q.includes('cost') ||
      q.includes('rate') ||
      q.includes('day visit') ||
      q.includes('overnight') ||
      q.includes('how much') ||
      q.includes('book') ||
      q.includes('reservation') ||
      q.includes('मूल्य') ||
      q.includes('किराया') ||
      q.includes('दर') ||
      q.includes('पैसे') ||
      q.includes('बुकिंग') ||
      q.includes('खर्च')

    const isAskingReviews =
      q.includes('review') ||
      q.includes('rating') ||
      q.includes('score') ||
      q.includes('feedback') ||
      q.includes('समीक्षा') ||
      q.includes('रेटिंग') ||
      q.includes('पुनरावलोकन') ||
      q.includes('अभिप्राय')

    // 1. Follow-up to seasonal crops question
    if (isAffirmative && (prevAssistantMsg.includes('harvest regions') || prevAssistantMsg.includes('फसल') || prevAssistantMsg.includes('पीक'))) {
      const data = await searchFarms({ budget_max_paise: 300000 })
      const farms = data.farms || []
      const header = locale === 'hi'
        ? `सक्रिय फसल क्षेत्रों में सत्यापित कृषि प्रवास यहां दिए गए हैं:\n\n`
        : locale === 'mr'
        ? `सक्रिय पीक क्षेत्रांमधील पडताळणी केलेले फार्म स्टे येथे आहेत:\n\n`
        : `Here are verified farm stays in active harvest regions:\n\n`
      await sendChunk(header)

      for (const f of farms.slice(0, 3)) {
        await sendChunk(`- [${f.name}](/farms/${f.slug}) (${f.place}, ${f.region}) — ${formatPriceLine(f)}: ${f.summary}\n`)
      }

      const followup = locale === 'hi'
        ? `\nक्या आप इनमें से किसी भी प्रवास के लिए कृषि गतिविधियों या दिशा-निर्देशों का विवरण चाहेंगे?`
        : locale === 'mr'
        ? `\nतुम्हाला यापैकी कोणत्याही स्टेसाठी शेती उपक्रम किंवा रस्त्याच्या दिशानिर्देशांची माहिती हवी आहे का?`
        : `\nWould you like details on farm activities or directions for any of these stays?`
      await sendChunk(followup)
      return
    }

    // 2. Follow-up: Affirmative or Asking for Directions
    if (isAskingDirections || (isAffirmative && (prevAssistantMsg.includes('directions') || prevAssistantMsg.includes('दिशा') || prevAssistantMsg.includes('मार्ग') || prevAssistantMsg.includes('farm activities')))) {
      const farmRes = await getFarmDetails({ slug: targetFarm.slug })
      if ((farmRes as any).error) {
        const notFound = locale === 'hi'
          ? `${targetFarm.name} के विवरण नहीं मिल सके।`
          : locale === 'mr'
          ? `${targetFarm.name} ची माहिती सापडली नाही.`
          : `Could not find details for ${targetFarm.name}.`
        await sendChunk(notFound)
        return
      }

      const f = farmRes as any
      const dirHeader = locale === 'hi'
        ? `[${f.name}](/farms/${f.slug}) (${f.place}, ${f.region}) के लिए दिशा-निर्देश और आगमन दिशानिर्देश:\n\n`
        : locale === 'mr'
        ? `[${f.name}](/farms/${f.slug}) (${f.place}, ${f.region}) साठी दिशानिर्देश आणि आगमनाची माहिती:\n\n`
        : `Directions and arrival guidelines for [${f.name}](/farms/${f.slug}) in ${f.place}, ${f.region}:\n\n`
      await sendChunk(dirHeader)

      if (f.check_in_info?.landmark_note) {
        const lmPrefix = locale === 'hi' ? `- लैंडमार्क: ` : locale === 'mr' ? `- लँडमार्क: ` : `- Landmark: `
        await sendChunk(`${lmPrefix}${f.check_in_info.landmark_note}\n`)
      }
      if (Array.isArray(f.check_in_info?.directions_steps) && f.check_in_info.directions_steps.length > 0) {
        const stepsPrefix = locale === 'hi' ? `- मार्ग के चरण:\n` : locale === 'mr' ? `- प्रवासाचे टप्पे:\n` : `- Route steps:\n`
        await sendChunk(stepsPrefix)
        for (let idx = 0; idx < f.check_in_info.directions_steps.length; idx++) {
          const step = f.check_in_info.directions_steps[idx]
          await sendChunk(`  ${idx + 1}. ${step.trim()}\n`)
        }
      }
      const checkInPrefix = locale === 'hi' ? `- चेक-इन: ` : locale === 'mr' ? `- चेक-इन: ` : `- Check-in: `
      const defCheckIn = locale === 'hi'
        ? 'दोपहर 12:00 बजे चेक-इन, सुबह 10:00 बजे चेकआउट'
        : locale === 'mr'
        ? 'दुपारी 12:00 चेक-इन, सकाळी 10:00 चेकआउट'
        : '12:00 PM check-in, 10:00 AM checkout'
      await sendChunk(`${checkInPrefix}${f.check_in_info?.overnight_check_in || defCheckIn}\n\n`)

      const dirFooter = locale === 'hi'
        ? `आप [${f.name}](/farms/${f.slug}) पर पूरा ऑफ़लाइन मार्ग और यात्रा सुरक्षा कार्ड देख सकते हैं। क्या आप कृषि गतिविधियों या भोजन की जानकारी चाहते हैं?`
        : locale === 'mr'
        ? `तुम्ही [${f.name}](/farms/${f.slug}) वर संपूर्ण ऑफलाइन नकाशा आणि प्रवास सुरक्षा कार्ड पाहू शकता. तुम्हाला शेती उपक्रम किंवा जेवणाची माहिती हवी आहे का?`
        : `You can access the full offline route map and travel safety card on [${f.name}](/farms/${f.slug}). Would you like information on farm activities or meals?`
      await sendChunk(dirFooter)
      return
    }

    // 3. Follow-up: Asking for Activities
    if (isAskingActivities) {
      const farmRes = await getFarmDetails({ slug: targetFarm.slug })
      const f = farmRes as any
      const actHeader = locale === 'hi'
        ? `[${f.name}](/farms/${f.slug}) पर गतिविधियां और कृषि अनुभव:\n\n`
        : locale === 'mr'
        ? `[${f.name}](/farms/${f.slug}) वरील उपक्रम आणि कृषी अनुभव:\n\n`
        : `Activities and farm experiences at [${f.name}](/farms/${f.slug}):\n\n`
      await sendChunk(actHeader)

      if (Array.isArray(f.activities) && f.activities.length > 0) {
        for (const act of f.activities) {
          const durationStr = act.duration_min ? ` (${act.duration_min} mins)` : ''
          const kindStr = act.kind ? ` [${act.kind}]` : ''
          await sendChunk(`- ${act.name}${kindStr}${durationStr}\n`)
        }
      } else {
        const defaultActs = locale === 'hi'
          ? `- जैविक बगीचा भ्रमण और मौसमी फलों की तुड़ाई\n- पारंपरिक ग्रामीण बैलगाड़ी की सवारी\n- शाम को अलाव और तारों को देखना\n`
          : locale === 'mr'
          ? `- सेंद्रिय फळबागेची सफर आणि हंगामी फळांची काढणी\n- पारंपरिक बैलगाडी सफर\n- संध्याकाळी कॅम्पफायर आणि तारांगण दर्शन\n`
          : `- Organic orchard walk and seasonal fruit harvesting\n- Traditional village bullock cart ride\n- Evening community campfire and stargazing\n`
        await sendChunk(defaultActs)
      }

      const actFooter = locale === 'hi'
        ? `\nसभी कृषि गतिविधियां स्थानीय मेजबानों के साथ आयोजित की जाती हैं। क्या आप मूल्य या पहुंचने का मार्ग देखना चाहते हैं?`
        : locale === 'mr'
        ? `\nसर्व शेती उपक्रम स्थानिक यजमानांसोबत आयोजित केले जातात. तुम्हाला दर किंवा पोहोचण्याचा मार्ग जाणून घ्यायचा आहे का?`
        : `\nAll farm activities are conducted with local hosts. Would you like to check pricing or how to reach?`
      await sendChunk(actFooter)
      return
    }

    // 4. Follow-up: Asking for Food, Meals, or Amenities
    if (isAskingFoodOrAmenities) {
      const farmRes = await getFarmDetails({ slug: targetFarm.slug })
      const f = farmRes as any
      const foodHeader = locale === 'hi'
        ? `[${f.name}](/farms/${f.slug}) पर भोजन और सुविधाएं:\n\n`
        : locale === 'mr'
        ? `[${f.name}](/farms/${f.slug}) वरील भोजन आणि सुविधा:\n\n`
        : `Food and amenities at [${f.name}](/farms/${f.slug}):\n\n`
      await sendChunk(foodHeader)

      if (Array.isArray(f.amenities) && f.amenities.length > 0) {
        for (const am of f.amenities) {
          await sendChunk(`- ${am}\n`)
        }
      }
      const mealsLine = locale === 'hi'
        ? `- भोजन: खेतों से सीधे तोड़ी गई उपज से तैयार ताज़ा पारंपरिक ग्रामीण भोजन।\n`
        : locale === 'mr'
        ? `- भोजन: शेतातून ताज्या तोडलेल्या पिकांपासून तयार केलेले पारंपरिक अस्सल जेवण.\n`
        : `- Meals: Freshly prepared traditional farm thali using crops harvested directly from the fields.\n`
      await sendChunk(mealsLine)

      const capLine = locale === 'hi'
        ? `- क्षमता: ${f.max_guests || 6} अतिथियों तक के लिए आरामदायक आवास।\n\n`
        : locale === 'mr'
        ? `- क्षमता: ${f.max_guests || 6} पाहुण्यांसाठी सोयीस्कर राहण्याची सोय.\n\n`
        : `- Capacity: Accommodates up to ${f.max_guests || 6} guests comfortably.\n\n`
      await sendChunk(capLine)

      const foodFooter = locale === 'hi'
        ? `क्या आप मूल्य जानना चाहते हैं या चेक-इन नियम पढ़ना चाहते हैं?`
        : locale === 'mr'
        ? `तुम्हाला दर जाणून घ्यायचे आहेत की चेक-इन नियम वाचायचे आहेत?`
        : `Would you like to know the pricing or read check-in rules?`
      await sendChunk(foodFooter)
      return
    }

    // 5. Follow-up: Asking for Pricing, Day visits, or Booking
    if (isAskingPricingOrBooking) {
      const farmRes = await getFarmDetails({ slug: targetFarm.slug })
      const f = farmRes as any

      let dayVisitText = 'Day visits are currently not offered (overnight stay only)'
      if (f.day_visit_price_inr) {
        const hours = f.check_in_info?.day_visit_hours || '09:00 to 17:00'
        dayVisitText = locale === 'hi'
          ? `₹${f.day_visit_price_inr} प्रति अतिथि (समय: ${hours})`
          : locale === 'mr'
          ? `₹${f.day_visit_price_inr} प्रति पाहुणा (वेळ: ${hours})`
          : `₹${f.day_visit_price_inr} per guest (Hours: ${hours})`
      } else if (locale === 'hi') {
        dayVisitText = 'दिन की यात्रा वर्तमान में उपलब्ध नहीं है (केवल रात्रि प्रवास)'
      } else if (locale === 'mr') {
        dayVisitText = 'दिवसाची भेट सध्या उपलब्ध नाही (केवळ मुक्काम)'
      }

      const pHeader = locale === 'hi'
        ? `[${f.name}](/farms/${f.slug}) के लिए मूल्य और बुकिंग:\n\n`
        : locale === 'mr'
        ? `[${f.name}](/farms/${f.slug}) चे दर आणि बुकिंग:\n\n`
        : `Pricing and booking for [${f.name}](/farms/${f.slug}):\n\n`
      await sendChunk(pHeader)

      const overLine = locale === 'hi'
        ? `- रात्रि प्रवास: ₹${f.overnight_price_inr}/रात (घर का बना भोजन शामिल)\n`
        : locale === 'mr'
        ? `- मुक्काम: ₹${f.overnight_price_inr}/रात्र (घरगुती जेवण समाविष्ट)\n`
        : `- Overnight stay: ₹${f.overnight_price_inr}/night (Includes organic home-cooked meals)\n`
      await sendChunk(overLine)

      const dayLine = locale === 'hi'
        ? `- दिन की यात्रा: ${dayVisitText}\n`
        : locale === 'mr'
        ? `- दिवसाची भेट: ${dayVisitText}\n`
        : `- Day visit: ${dayVisitText}\n`
      await sendChunk(dayLine)

      const capLine = locale === 'hi'
        ? `- समूह क्षमता: ${f.max_guests || 6} अतिथियों तक\n`
        : locale === 'mr'
        ? `- गट क्षमता: ${f.max_guests || 6} पाहुण्यांपर्यंत\n`
        : `- Group capacity: Up to ${f.max_guests || 6} guests\n`
      await sendChunk(capLine)

      const cancelLine = locale === 'hi'
        ? `- रद्दीकरण: आगमन से 48 घंटे पहले तक निःशुल्क रद्दीकरण\n\n`
        : locale === 'mr'
        ? `- रद्द करण्याचे नियम: आगमनापूर्वी 48 तास आधी मोफत रद्दीकरण\n\n`
        : `- Cancellation: Free cancellation up to 48 hours prior to arrival\n\n`
      await sendChunk(cancelLine)

      const pFooter = locale === 'hi'
        ? `आप आज बिना किसी भुगतान के सीधे [${f.name}](/farms/${f.slug}) पर बुकिंग अनुरोध भेज सकते हैं। आपके मेजबान शीघ्र ही उपलब्धता की पुष्टि करेंगे।`
        : locale === 'mr'
        ? `तुम्ही आज कोणतेही शुल्क न भरता थेट [${f.name}](/farms/${f.slug}) वर बुकिंग विनंती करू शकता. तुमचे यजमान लवकरच उपलब्धतेची खात्री करतील.`
        : `You can submit a booking request without payment today directly on [${f.name}](/farms/${f.slug}). Your host will confirm availability shortly.`
      await sendChunk(pFooter)
      return
    }

    // 6. Follow-up: Asking for Reviews
    if (isAskingReviews) {
      const farmRes = await getFarmDetails({ slug: targetFarm.slug })
      const f = farmRes as any
      const rb = f.rating_breakdown || {}

      const rHeader = locale === 'hi'
        ? `[${f.name}](/farms/${f.slug}) के लिए सत्यापित अतिथि समीक्षाएं:\n\n`
        : locale === 'mr'
        ? `[${f.name}](/farms/${f.slug}) साठी पडताळणी केलेली पाहुण्यांची रेटिंग:\n\n`
        : `Verified guest ratings for [${f.name}](/farms/${f.slug}):\n\n`
      await sendChunk(rHeader)

      const revCount = rb.review_count || 12
      const overallStr = locale === 'hi'
        ? `- समग्र स्कोर: ${rb.overall_avg || 4.8} / 5 (${revCount} समीक्षाएं)\n`
        : locale === 'mr'
        ? `- एकूण गुण: ${rb.overall_avg || 4.8} / 5 (${revCount} पुनरावलोकने)\n`
        : `- Overall score: ${rb.overall_avg || 4.8} / 5 (${revCount} reviews)\n`
      await sendChunk(overallStr)

      const foodStr = locale === 'hi'
        ? `- भोजन प्रामाणिकता: ${rb.food_authenticity || 4.9} / 5\n`
        : locale === 'mr'
        ? `- अस्सल जेवण: ${rb.food_authenticity || 4.9} / 5\n`
        : `- Food authenticity: ${rb.food_authenticity || 4.9} / 5\n`
      await sendChunk(foodStr)

      const cleanStr = locale === 'hi'
        ? `- स्वच्छता: ${rb.cleanliness || 4.8} / 5\n`
        : locale === 'mr'
        ? `- स्वच्छता: ${rb.cleanliness || 4.8} / 5\n`
        : `- Cleanliness: ${rb.cleanliness || 4.8} / 5\n`
      await sendChunk(cleanStr)

      const hospStr = locale === 'hi'
        ? `- आतिथ्य: ${rb.hospitality || 4.9} / 5\n`
        : locale === 'mr'
        ? `- पाहुणचार: ${rb.hospitality || 4.9} / 5\n`
        : `- Hospitality: ${rb.hospitality || 4.9} / 5\n`
      await sendChunk(hospStr)

      const locStr = locale === 'hi'
        ? `- स्थान: ${rb.location || 4.7} / 5\n\n`
        : locale === 'mr'
        ? `- स्थान: ${rb.location || 4.7} / 5\n\n`
        : `- Location: ${rb.location || 4.7} / 5\n\n`
      await sendChunk(locStr)

      const rFooter = locale === 'hi'
        ? `समीक्षाएं केवल उन सत्यापित यात्रियों से ली जाती हैं जिन्होंने अपना कृषि प्रवास पूरा किया है।`
        : locale === 'mr'
        ? `पुनरावलोकने केवळ अशा पडताळणी केलेल्या प्रवाशांकडून गोळा केली जातात ज्यांनी त्यांचा मुक्काम पूर्ण केला आहे.`
        : `Reviews are collected only from verified travellers who completed their farm stay.`
      await sendChunk(rFooter)
      return
    }

    // 7. Queries about seasons, harvests, or crops
    if (q.includes('season') || q.includes('crop') || q.includes('harvest') || q.includes('month') || q.includes('मौसम') || q.includes('हंगाम') || q.includes('फसल') || q.includes('पीक')) {
      const currentMonth = new Date().getMonth()
      const data = await getSeasonalCrops({ month: currentMonth })
      const active = data.active_crops || []

      if (active.length === 0) {
        const noCrops = locale === 'hi'
          ? `${data.month_name} के लिए इस समय कोई मुख्य फसल दर्ज नहीं है।\n`
          : locale === 'mr'
          ? `${data.month_name} साठी या वेळी कोणतीही मोठी पिके नोंदवलेली नाहीत.\n`
          : `No major harvest crops are recorded for ${data.month_name} at this time.\n`
        await sendChunk(noCrops)
      } else {
        const sHeader = locale === 'hi'
          ? `${data.month_name} में, हमारे सहयोगी क्षेत्रों में निम्नलिखित फसलें मौसम में हैं:\n\n`
          : locale === 'mr'
          ? `${data.month_name} मध्ये, आमच्या भागीदार भागांमध्ये खालील पिकांचा हंगाम आहे:\n\n`
          : `In ${data.month_name}, the following crops are in season across our partner regions:\n\n`
        await sendChunk(sHeader)

        for (const c of active.slice(0, 4)) {
          const kindStr = c.kind === 'harvest'
            ? (locale === 'hi' ? 'कटाई का मौसम' : locale === 'mr' ? 'काढणीचा हंगाम' : 'Harvest season')
            : (locale === 'hi' ? 'बुवाई का मौसम' : locale === 'mr' ? 'पेरणीचा हंगाम' : 'Sowing season')
          await sendChunk(`- ${c.name} (${c.place}, ${c.region}) — ${kindStr}\n`)
        }

        const sFooter = locale === 'hi'
          ? `\nक्या आप इन फसल क्षेत्रों के पास कृषि प्रवास की सिफारिशें चाहेंगे?`
          : locale === 'mr'
          ? `\nतुम्हाला या पीक क्षेत्रांजवळील फार्म स्टेच्या शिफारसी हव्या आहेत का?`
          : `\nWould you like farm stay recommendations near these harvest regions?`
        await sendChunk(sFooter)
      }
      return
    }

    // 8. Rules and Check-in Policies
    if (q.includes('rule') || q.includes('check-in') || q.includes('check in') || q.includes('policy') || q.includes('नियम') || q.includes('धोरण') || q.includes('वेळ')) {
      const farmRes = await getFarmDetails({ slug: targetFarm.slug })
      const f = farmRes as any

      const ruleHeader = locale === 'hi'
        ? `[${f.name}](/farms/${f.slug}) पर चेक-इन नीतियां और नियम:\n\n`
        : locale === 'mr'
        ? `[${f.name}](/farms/${f.slug}) वरील चेक-इन धोरणे आणि नियम:\n\n`
        : `Check-in policies and rules at [${f.name}](/farms/${f.slug}):\n\n`
      await sendChunk(ruleHeader)

      const defOver = locale === 'hi'
        ? 'दोपहर 12:00 बजे चेक-इन, सुबह 10:00 बजे चेकआउट'
        : locale === 'mr'
        ? 'दुपारी 12:00 चेक-इन, सकाळी 10:00 चेकआउट'
        : '12:00 PM check-in, 10:00 AM checkout'
      const overnightLine = locale === 'hi'
        ? `- रात्रि प्रवास चेक-इन: ${f.check_in_info?.overnight_check_in || defOver}।\n`
        : locale === 'mr'
        ? `- मुक्काम चेक-इन: ${f.check_in_info?.overnight_check_in || defOver}.\n`
        : `- Overnight check-in: ${f.check_in_info?.overnight_check_in || defOver}.\n`
      await sendChunk(overnightLine)

      const dayVisitsLine = locale === 'hi'
        ? `- दिन की यात्रा: ${f.check_in_info?.day_visit_hours || '09:00 से 17:00'}।\n`
        : locale === 'mr'
        ? `- दिवसाची भेट: ${f.check_in_info?.day_visit_hours || '09:00 ते 17:00'}.\n`
        : `- Day visits: ${f.check_in_info?.day_visit_hours || '09:00 to 17:00'}.\n`
      await sendChunk(dayVisitsLine)

      const etiquetteLine = locale === 'hi'
        ? `- कृषि शिष्टाचार: रात 10:00 बजे के बाद शांत समय का पालन करें; बगीचों में प्लास्टिक कचरा न फैलाएं।\n`
        : locale === 'mr'
        ? `- शेताचे नियम: रात्री 10:00 नंतर शांततेचे पालन करा; फळबागेत प्लास्टिक कचरा टाकू नका.\n`
        : `- Farm etiquette: Respect quiet hours after 10:00 PM; no synthetic litter in orchards.\n`
      await sendChunk(etiquetteLine)

      const cancelLine = locale === 'hi'
        ? `- रद्दीकरण: आगमन से 48 घंटे पहले तक निःशुल्क रद्दीकरण।\n\n`
        : locale === 'mr'
        ? `- रद्द करण्याचे नियम: आगमनापूर्वी 48 तास आधी मोफत रद्दीकरण.\n\n`
        : `- Cancellation: Free cancellation up to 48 hours prior to scheduled arrival.\n\n`
      await sendChunk(cancelLine)

      const ruleFooter = locale === 'hi'
        ? `आप [${f.name}](/farms/${f.slug}) पर विस्तृत नियम देख सकते हैं।`
        : locale === 'mr'
        ? `तुम्ही [${f.name}](/farms/${f.slug}) वर सविस्तर नियम पाहू शकता.`
        : `You can review detailed farm rules on [${f.name}](/farms/${f.slug}).`
      await sendChunk(ruleFooter)
      return
    }

    // 9. Specific Farm Query if user typed a farm name directly
    const mentionedDirectly = FARM_DIRECTORY.find((f) =>
      q.includes(f.slug) ||
      q.includes(f.name.toLowerCase()) ||
      f.aliases.some((a) => q.includes(a))
    )
    if (mentionedDirectly) {
      const farmRes = await getFarmDetails({ slug: mentionedDirectly.slug })
      const f = farmRes as any
      const priceLine = formatPriceLine(f)
      await sendChunk(`[${f.name}](/farms/${f.slug}) in ${f.place}, ${f.region} (${priceLine}):\n\n`)
      if (f.amenities?.length) {
        const hl = locale === 'hi' ? `- प्रमुख विशेषताएं: ` : locale === 'mr' ? `- वैशिष्ट्ये: ` : `- Highlights: `
        await sendChunk(`${hl}${f.amenities.slice(0, 3).join(', ')}\n`)
      }
      if (f.check_in_info?.landmark_note) {
        const lm = locale === 'hi' ? `- लैंडमार्क: ` : locale === 'mr' ? `- लँडमार्क: ` : `- Landmark: `
        await sendChunk(`${lm}${f.check_in_info.landmark_note}\n`)
      }
      const mfFooter = locale === 'hi'
        ? `\nक्या आप [${f.name}](/farms/${f.slug}) के लिए गतिविधियों या मार्ग का विवरण चाहेंगे?`
        : locale === 'mr'
        ? `\nतुम्हाला [${f.name}](/farms/${f.slug}) साठी उपक्रम किंवा दिशानिर्देश हवे आहेत का?`
        : `\nWould you like details on farm activities or directions for [${f.name}](/farms/${f.slug})?`
      await sendChunk(mfFooter)
      return
    }

    // 10. Default: Search farms matching budget or location
    let budgetPaise = 300000 // default 3000 INR
    if (q.includes('2500') || q.includes('2,500') || q.includes('२,५००') || q.includes('२५००')) budgetPaise = 250000
    if (q.includes('2000') || q.includes('2,000') || q.includes('२,०००') || q.includes('२०००')) budgetPaise = 200000
    if (q.includes('1500') || q.includes('1,500') || q.includes('१,५००') || q.includes('१५००')) budgetPaise = 150000
    if (q.includes('1000') || q.includes('1,000') || q.includes('१,०००') || q.includes('१०००')) budgetPaise = 100000

    let region: string | undefined = undefined
    if (q.includes('maharashtra') || q.includes('konkan') || q.includes('ratnagiri') || q.includes('nashik') || q.includes('kolhapur') || q.includes('महाराष्ट्र') || q.includes('कोकण')) region = 'Maharashtra'
    else if (q.includes('kerala') || q.includes('wayanad') || q.includes('केरल') || q.includes('केरळ')) region = 'Kerala'
    else if (q.includes('punjab') || q.includes('amritsar') || q.includes('पंजाब')) region = 'Punjab'
    else if (q.includes('himachal') || q.includes('shimla') || q.includes('kotgarh') || q.includes('हिमाचल')) region = 'Himachal Pradesh'
    else if (q.includes('kashmir') || q.includes('pampore') || q.includes('कश्मीर') || q.includes('काश्मीर')) region = 'Kashmir'
    else if (q.includes('rajasthan') || q.includes('pushkar') || q.includes('राजस्थान')) region = 'Rajasthan'
    else if (q.includes('karnataka') || q.includes('coorg') || q.includes('madikeri') || q.includes('कर्नाटक')) region = 'Karnataka'
    else if (q.includes('tamil nadu') || q.includes('coonoor') || q.includes('nilgiris') || q.includes('तमिलनाडु')) region = 'Tamil Nadu'
    else if (q.includes('uttarakhand') || q.includes('mukteshwar') || q.includes('kumaon') || q.includes('उत्तराखंड')) region = 'Uttarakhand'
    else if (q.includes('gujarat') || q.includes('gir') || q.includes('talala') || q.includes('गुजरात')) region = 'Gujarat'
    else if (q.includes('west bengal') || q.includes('darjeeling') || q.includes('पश्चिम बंगाल')) region = 'West Bengal'
    else if (q.includes('assam') || q.includes('tezpur') || q.includes('असम') || q.includes('आसाम')) region = 'Assam'

    const data = await searchFarms({ budget_max_paise: budgetPaise, region })
    const farms = data.farms || []

    if (farms.length === 0) {
      const noFarms = locale === 'hi'
        ? `उस बजट या स्थान से मेल खाने वाला कोई फार्म स्टे नहीं मिला। क्या आप अपना बजट समायोजित करना चाहते हैं या अन्य क्षेत्रों का पता लगाना चाहते हैं?`
        : locale === 'mr'
        ? `त्या बजेट किंवा स्थानाशी जुळणारा कोणताही फार्म स्टे आढळला नाही. तुम्हाला तुमचे बजेट बदलायचे आहे की इतर प्रदेश पाहायचे आहेत?`
        : `No farm stays found matching that budget or location. Would you like to adjust your budget or explore other regions?`
      await sendChunk(noFarms)
    } else {
      const recHeader = locale === 'hi'
        ? `सत्यापित कृषि डेटा के आधार पर यहां कुछ सिफारिशें दी गई हैं:\n\n`
        : locale === 'mr'
        ? `पडताळणी केलेल्या शेती माहितीवर आधारित काही शिफारसी येथे आहेत:\n\n`
        : `Here are recommendations based on verified farm data:\n\n`
      await sendChunk(recHeader)

      for (const f of farms.slice(0, 3)) {
        await sendChunk(`- [${f.name}](/farms/${f.slug}) (${f.place}) — ${formatPriceLine(f)}: ${f.summary}\n`)
      }

      const recFooter = locale === 'hi'
        ? `\nक्या आप इनमें से किसी भी प्रवास के लिए कृषि गतिविधियों या दिशा-निर्देशों का विवरण चाहेंगे?`
        : locale === 'mr'
        ? `\nतुम्हाला यापैकी कोणत्याही स्टेसाठी शेती उपक्रम किंवा रस्त्याच्या दिशानिर्देशांची माहिती हवी आहे का?`
        : `\nWould you like details on farm activities or directions for any of these stays?`
      await sendChunk(recFooter)
    }
  } catch (err: any) {
    const errMsg = locale === 'hi'
      ? `इस समय कृषि डेटा प्राप्त करने में असमर्थ: ${err.message}`
      : locale === 'mr'
      ? `या वेळी शेती माहिती मिळवणे शक्य झाले नाही: ${err.message}`
      : `Unable to retrieve farm data at this time: ${err.message}`
    await sendChunk(errMsg)
  } finally {
    await writer.close()
  }
}

/**
 * Anthropic Claude Provider
 */
async function runClaudeStream(
  messages: ChatMessage[],
  apiKey: string,
  writer: WritableStreamDefaultWriter<Uint8Array>,
  locale: string = 'en',
) {
  const encoder = new TextEncoder()
  const sendChunk = async (text: string) => {
    await writer.write(encoder.encode(text))
  }

  try {
    const claudeMessages = messages.map((m) => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content,
    }))

    // First request: Allow tool usage
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 800,
        system: getSystemPrompt(locale),
        messages: claudeMessages,
        tools: CLAUDE_TOOLS,
      }),
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson?.error?.message || `Claude API returned status ${res.status}`)
    }

    const data = await res.json()
    const content = data.content || []
    const toolCall = content.find((c: any) => c.type === 'tool_use')

    if (toolCall) {
      // Execute database tool
      const toolResult = await executeTool(toolCall.name, toolCall.input)

      // Send tool result back to Claude and stream final answer
      const followUpMessages = [
        ...claudeMessages,
        { role: 'assistant', content },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: JSON.stringify(toolResult),
            },
          ],
        },
      ]

      const streamRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 800,
          system: getSystemPrompt(locale),
          messages: followUpMessages,
          stream: true,
        }),
      })

      const reader = streamRes.body?.getReader()
      if (!reader) throw new Error('No stream response from Claude')

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') continue
            try {
              const parsed = JSON.parse(raw)
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                await sendChunk(parsed.delta.text)
              }
            } catch {}
          }
        }
      }
    } else {
      // Direct text response
      for (const item of content) {
        if (item.type === 'text') {
          await sendChunk(item.text)
        }
      }
    }
  } catch (err: any) {
    console.error('[Claude Error, falling back to database mock]:', err.message)
    await runMockAiStream(messages, writer, locale)
    return
  } finally {
    try {
      await writer.close()
    } catch {}
  }
}

/**
 * Custom error class to classify Gemini API responses for fallback handling.
 */
class GeminiApiError extends Error {
  status: number
  isModelNotFound: boolean
  isRateLimit: boolean
  isAuthError: boolean

  constructor(status: number, message: string, rawStatus?: string) {
    super(message)
    this.name = 'GeminiApiError'
    this.status = status

    const lowerMsg = (message || '').toLowerCase()
    const lowerStatus = (rawStatus || '').toLowerCase()

    this.isModelNotFound =
      status === 404 ||
      lowerStatus === 'not_found' ||
      lowerMsg.includes('not found') ||
      lowerMsg.includes('is not found') ||
      lowerMsg.includes('not supported for generatecontent') ||
      lowerMsg.includes('unsupported model') ||
      lowerMsg.includes('unknown model') ||
      lowerMsg.includes('model not recognized')

    this.isRateLimit =
      status === 429 ||
      lowerStatus === 'resource_exhausted' ||
      lowerMsg.includes('quota') ||
      lowerMsg.includes('rate limit') ||
      lowerMsg.includes('resource has been exhausted')

    this.isAuthError =
      status === 401 ||
      status === 403 ||
      lowerStatus === 'unauthenticated' ||
      lowerStatus === 'permission_denied' ||
      lowerMsg.includes('api key not valid') ||
      lowerMsg.includes('api_key_invalid')
  }
}

const GEMINI_FUNCTION_DECLARATIONS = [
  {
    name: 'searchFarms',
    description: 'Search for farm stays matching budget, region, month, or guests.',
    parameters: {
      type: 'OBJECT',
      properties: {
        budget_max_paise: { type: 'NUMBER' },
        region: { type: 'STRING' },
        month: { type: 'NUMBER' },
        experience: { type: 'STRING' },
        guests: { type: 'NUMBER' },
      },
    },
  },
  {
    name: 'getFarmDetails',
    description: 'Get detailed amenities, check-in info, rules, and reviews for a farm.',
    parameters: {
      type: 'OBJECT',
      properties: {
        slug: { type: 'STRING' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'getSeasonalCrops',
    description: 'Get active crops in season for a month and region.',
    parameters: {
      type: 'OBJECT',
      properties: {
        month: { type: 'NUMBER' },
        region: { type: 'STRING' },
      },
    },
  },
]

/**
 * Execute a single Gemini generateContent request for a given model.
 */
async function callGeminiWithModel(
  model: string,
  apiKey: string,
  messages: ChatMessage[],
  locale: string = 'en',
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const geminiContents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: getSystemPrompt(locale) }] },
      contents: geminiContents,
      tools: [{ functionDeclarations: GEMINI_FUNCTION_DECLARATIONS }],
    }),
  })

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}))
    const msg = errJson?.error?.message || `HTTP ${res.status}`
    const st = errJson?.error?.status || ''
    throw new GeminiApiError(res.status, msg, st)
  }

  const data = await res.json()
  const candidate = data?.candidates?.[0]
  if (!candidate) {
    throw new Error('No candidate returned by Gemini')
  }

  const parts = candidate.content?.parts || []
  const functionCallPart = parts.find((p: any) => p.functionCall)

  if (functionCallPart) {
    const call = functionCallPart.functionCall
    const toolResult = await executeTool(call.name, call.args || {})

    const followUpRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: getSystemPrompt(locale) }] },
        contents: [
          ...geminiContents,
          { role: 'model', parts: parts },
          {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: call.name,
                  response: { content: toolResult },
                },
              },
            ],
          },
        ],
      }),
    })

    if (!followUpRes.ok) {
      const errJson = await followUpRes.json().catch(() => ({}))
      const msg = errJson?.error?.message || `Follow-up HTTP ${followUpRes.status}`
      const st = errJson?.error?.status || ''
      throw new GeminiApiError(followUpRes.status, msg, st)
    }

    const followUpData = await followUpRes.json()
    const followUpParts = followUpData?.candidates?.[0]?.content?.parts || []
    const textParts = followUpParts
      .map((p: any) => p.text)
      .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
    const answer = textParts.join('\n')

    if (!answer) {
      throw new Error('Empty response from model after tool call')
    }
    return answer
  }

  const textParts = parts
    .map((p: any) => p.text)
    .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
  const directText = textParts.join('\n')

  if (!directText) {
    throw new Error('Empty response from model')
  }
  return directText
}

/**
 * Google Gemini Provider with automatic fallback retry list:
 * - Reads model from GEMINI_MODEL env or defaults to "gemini-3.1-flash-lite"
 * - On 404, rate limit, or model error, automatically retries in order across known working models
 * - Logs which model finally worked on the server
 * - If every model fails or key is missing, falls back to database mock AI
 */
async function runGeminiStream(
  messages: ChatMessage[],
  apiKey: string,
  writer: WritableStreamDefaultWriter<Uint8Array>,
  locale: string = 'en',
) {
  try {
    const cleanKey = (apiKey || '').trim()
    if (!cleanKey) {
      console.warn('[AgriGuide] Missing Gemini API key. Falling back to database mock AI.')
      await runMockAiStream(messages, writer, locale)
      return
    }

    const primaryModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite'
    const FALLBACK_MODELS = [
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ]

    const modelsToTry: string[] = [primaryModel]
    for (const fb of FALLBACK_MODELS) {
      if (!modelsToTry.includes(fb)) {
        modelsToTry.push(fb)
      }
    }

    let finalAnswer: string | null = null
    let successfulModel: string | null = null

    for (const model of modelsToTry) {
      try {
        finalAnswer = await callGeminiWithModel(model, cleanKey, messages, locale)
        successfulModel = model
        break
      } catch (err: any) {
        if (err?.isModelNotFound) {
          console.warn(`[AgriGuide] Model "${model}" not found (${err.message}). Retrying with next fallback model...`)
          continue
        }
        if (err?.isRateLimit) {
          console.warn(`[AgriGuide] Gemini rate limit reached (429) on model "${model}". Retrying with next fallback model...`)
          continue
        }
        if (err?.isAuthError) {
          console.warn(`[AgriGuide] Gemini API authentication failed on model "${model}": ${err.message}. Retrying with next fallback model...`)
          continue
        }
        console.warn(`[AgriGuide] Gemini error on model "${model}": ${err?.message || err}. Retrying with next fallback model...`)
        continue
      }
    }

    if (finalAnswer && successfulModel) {
      console.log(`[AgriGuide Server] Successfully responded using model: ${successfulModel}`)
      const encoder = new TextEncoder()
      try {
        await writer.write(encoder.encode(finalAnswer))
      } catch {}
      try {
        await writer.close()
      } catch {}
      return
    }

    console.warn('[AgriGuide] All Gemini models failed or rate-limited. Falling back to database mock AI.')
    await runMockAiStream(messages, writer, locale)
  } catch (err: any) {
    console.error('[AgriGuide] Fatal error in runGeminiStream, falling back to mock AI:', err)
    try {
      await runMockAiStream(messages, writer, locale)
    } catch {
      try {
        await writer.close()
      } catch {}
    }
  }
}

/**
 * Public streaming entry point for AgriGuide chat.
 * Selects provider according to environment variables:
 * - ANTHROPIC_API_KEY -> Claude
 * - GEMINI_API_KEY / GOOGLE_API_KEY -> Gemini
 * - Missing -> Deterministic database mock AI stream
 */
export function streamChatResponse(messages: ChatMessage[], locale: string = 'en'): ReadableStream<Uint8Array> {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()

  const anthropicKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()

  if (anthropicKey) {
    runClaudeStream(messages, anthropicKey, writer, locale)
  } else if (geminiKey) {
    runGeminiStream(messages, geminiKey, writer, locale)
  } else {
    runMockAiStream(messages, writer, locale)
  }

  return readable
}
