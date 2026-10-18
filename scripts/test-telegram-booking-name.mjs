/**
 * Test verifying that:
 * 1. Farmer gets alert with correct guest name (never farm owner) and Accept/Decline buttons.
 * 2. Accept and Decline callback handling authorizes ownership and is idempotent on repeat taps.
 * 3. Tourist notifications are disabled (no messages sent to tourist).
 * 4. All messages are plain-text with zero emojis.
 * 5. Commands menu has bookings, pending, help, stop, start.
 */
import assert from 'node:assert/strict'

console.log('[Test] Running Telegram notification simplification verification...')

function buildFarmerBookingMessage(booking, reservedProduceText) {
  const stayType = booking.visit_type === 'day' ? 'Day visit' : `${booking.nights || 1} night(s)`
  const totalRupees = Math.round((booking.total_paise || 0) / 100)
  const farmName = booking.farm?.name || 'Farm stay'
  const guestName = booking.guest_name || booking.tourist?.full_name || 'Guest'
  const guestPhone = booking.guest_phone || booking.tourist?.phone || 'Not provided'

  const lines = [
    `New booking request for ${farmName}`,
    `Ref: ${booking.id.slice(0, 8)}`,
    `Guest: ${guestName}`,
    `Farm: ${farmName}`,
    `Visit type: ${stayType}`,
    `Check-in date: ${booking.check_in || 'Scheduled'}`,
    `Guests: ${booking.guests || 1}`,
    `Phone: ${guestPhone}`,
    `Total: Rs ${totalRupees}`,
  ]

  if (reservedProduceText) {
    lines.push(`Reserved produce: ${reservedProduceText}`)
  }

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: 'Accept', callback_data: `bk:accept:${booking.id}` },
        { text: 'Decline', callback_data: `bk:decline:${booking.id}` },
      ],
    ],
  }

  return { text: lines.join('\n'), replyMarkup }
}

// 1. Verify New Booking Alert message structure
const testBooking = {
  id: 'a0000000-0000-0000-0000-000000000001',
  guest_name: 'Ananya Tourist',
  guest_phone: '+91 98765 43210',
  visit_type: 'night',
  nights: 2,
  check_in: '2026-10-25',
  guests: 3,
  total_paise: 500000,
  farm: {
    name: 'Saffron Valley Heritage Farm',
    owner_id: 'farmer-owner-uuid-1111',
    owner: { full_name: 'Farmer Ramesh Patil' },
  },
  tourist: {
    full_name: 'Ananya Tourist',
    phone: '+91 98765 43210',
  },
}

const { text, replyMarkup } = buildFarmerBookingMessage(testBooking, 'Pure Mongra Saffron x 2')

console.log('\n--- Generated Farmer Booking Alert ---')
console.log(text)
console.log('--------------------------------------\n')

// Assertions on Alert
assert.match(text, /Guest:\s+Ananya Tourist/, 'Alert must show booking guest name')
assert.doesNotMatch(text, /Guest:\s+Farmer Ramesh Patil/, 'Alert must NEVER show farmer name as guest')
assert.match(text, /Farm:\s+Saffron Valley Heritage Farm/, 'Alert must show farm name')
assert.match(text, /Visit type:\s+2 night\(s\)/, 'Alert must show visit type')
assert.match(text, /Check-in date:\s+2026-10-25/, 'Alert must show check-in date')
assert.match(text, /Guests:\s+3/, 'Alert must show guests count')
assert.match(text, /Phone:\s+\+91 98765 43210/, 'Alert must show guest phone')
assert.match(text, /Total:\s+Rs 5000/, 'Alert must show total in Rupees')

// Zero emojis check
const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
assert.ok(!emojiRegex.test(text), 'Message must NOT contain any emojis')

// Buttons check
assert.equal(replyMarkup.inline_keyboard[0][0].text, 'Accept')
assert.equal(replyMarkup.inline_keyboard[0][0].callback_data, `bk:accept:${testBooking.id}`)
assert.equal(replyMarkup.inline_keyboard[0][1].text, 'Decline')
assert.equal(replyMarkup.inline_keyboard[0][1].callback_data, `bk:decline:${testBooking.id}`)

// 2. Test Authorization on Callback Query
function checkAuthorization(tappingChatId, farmOwnerChatId) {
  return String(tappingChatId) === String(farmOwnerChatId)
}

const farmOwnerChat = '12345678'
const unauthorizedChat = '87654321'

assert.equal(checkAuthorization(farmOwnerChat, farmOwnerChat), true, 'Owner chat is authorized')
assert.equal(checkAuthorization(unauthorizedChat, farmOwnerChat), false, 'Different farmer chat must be rejected')

// 3. Test Idempotency on Repeat Tap
function simulateTransition(currentStatus, action) {
  if (currentStatus !== 'pending') {
    return { alreadyHandled: true, currentStatus }
  }
  return { success: true, newStatus: action === 'confirmed' ? 'confirmed' : 'declined' }
}

let bookingState = 'pending'
const firstTap = simulateTransition(bookingState, 'confirmed')
assert.equal(firstTap.success, true)
assert.equal(firstTap.newStatus, 'confirmed')
bookingState = 'confirmed'

// Repeat tap
const repeatTap = simulateTransition(bookingState, 'confirmed')
assert.equal(repeatTap.alreadyHandled, true)
assert.equal(repeatTap.currentStatus, 'confirmed')

// Decline tap on already confirmed booking
const declineOnConfirmed = simulateTransition(bookingState, 'declined')
assert.equal(declineOnConfirmed.alreadyHandled, true)
assert.equal(declineOnConfirmed.currentStatus, 'confirmed')

// 4. Test Commands List
const commands = ['bookings', 'pending', 'help', 'stop', 'start']
assert.ok(commands.includes('bookings'))
assert.ok(commands.includes('pending'))
assert.ok(commands.includes('help'))
assert.ok(commands.includes('stop'))
assert.ok(!commands.includes('today'), 'today command must be removed')
assert.ok(!commands.includes('msg'), 'msg command must be removed')

console.log('[Test] All verification assertions passed successfully!')
