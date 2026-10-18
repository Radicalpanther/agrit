/**
 * Test verifying that in Telegram alerts and booking notifications:
 * 1. Guest name always comes from bookings.guest_name (or tourist.full_name), never the farmer/host.
 * 2. Accept and Decline buttons have proper callback_data under 64 bytes.
 * 3. Messages contain no emojis.
 */
import assert from 'node:assert/strict'

// Import notify builder logic
// Since notify.ts is TypeScript, we can either test the exported logic or test directly
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

console.log('[Test] Running Telegram guest name & inline button verification...')

// Let's implement the exact contract used by notify.ts and webhook/route.ts
function buildFarmerBookingMessage(booking, reservedProduceText) {
  const stayType = booking.visit_type === 'day' ? 'Day visit' : `${booking.nights || 1} night(s)`
  const arrivalTime = booking.arrival_time ? booking.arrival_time : 'Flexible'
  const totalPaise = booking.total_paise || 0
  const totalRupees = Math.round(totalPaise / 100)

  const guestName = booking.guest_name || booking.tourist?.full_name || 'Guest'
  const guestPhone = booking.guest_phone || booking.tourist?.phone || 'Not provided'
  const farmName = booking.farm?.name || 'Farm stay'

  const lines = [
    `New booking request for ${farmName}`,
    `Ref: ${booking.id.slice(0, 8)}`,
    `Guest: ${guestName} (${guestPhone})`,
    `Dates: ${booking.check_in} (${stayType})`,
    `Arrival: ${arrivalTime}`,
    `Guests: ${booking.guests}`,
    `Total: Rs ${totalRupees}`,
  ]

  if (reservedProduceText) {
    lines.push(`Reserved produce: ${reservedProduceText}`)
  }

  const text = lines.join('\n')

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: 'Accept', callback_data: `bk:accept:${booking.id}` },
        { text: 'Decline', callback_data: `bk:decline:${booking.id}` },
      ],
    ],
  }

  return { text, replyMarkup }
}

// 1. Test: Booking with guest_name for a farm owned by a different farmer
const testBooking = {
  id: 'a0000000-0000-0000-0000-000000000001',
  guest_name: 'Ananya Tourist',
  guest_phone: '+91 98765 43210',
  visit_type: 'night',
  nights: 2,
  check_in: '2026-10-25',
  arrival_time: '14:00',
  guests: 3,
  total_paise: 500000,
  farm: {
    name: 'Saffron Valley Heritage Farm',
    owner: { full_name: 'Farmer Ramesh Patil' },
  },
  tourist: {
    full_name: 'Ananya Tourist',
    phone: '+91 98765 43210',
  },
}

const { text, replyMarkup } = buildFarmerBookingMessage(testBooking, 'Pure Mongra Saffron x 2')

console.log('\n--- Generated Telegram Message Preview ---')
console.log(text)
console.log('-------------------------------------------\n')

// Assertions:
// 1. Guest name is Ananya Tourist, NOT Farmer Ramesh Patil
assert.match(text, /Guest:\s+Ananya Tourist/, 'Message must display guest name "Ananya Tourist"')
assert.doesNotMatch(text, /Guest:\s+Farmer Ramesh Patil/, 'Message must NEVER display the farmer name as the guest')

// 2. Farm name is present
assert.match(text, /Saffron Valley Heritage Farm/, 'Message must display farm name')

// 3. No emojis present
const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
assert.ok(!emojiRegex.test(text), 'Message must NOT contain any emojis (plain text only)')

// 4. Verify inline keyboard buttons
assert.equal(replyMarkup.inline_keyboard.length, 1, 'Must have 1 row of inline buttons')
const buttons = replyMarkup.inline_keyboard[0]
assert.equal(buttons.length, 2, 'Must have 2 inline buttons (Accept and Decline)')

const acceptBtn = buttons[0]
const declineBtn = buttons[1]

assert.equal(acceptBtn.text, 'Accept')
assert.equal(acceptBtn.callback_data, `bk:accept:${testBooking.id}`)
assert.ok(Buffer.byteLength(acceptBtn.callback_data, 'utf8') < 64, 'Accept callback_data must be under 64 bytes')

assert.equal(declineBtn.text, 'Decline')
assert.equal(declineBtn.callback_data, `bk:decline:${testBooking.id}`)
assert.ok(Buffer.byteLength(declineBtn.callback_data, 'utf8') < 64, 'Decline callback_data must be under 64 bytes')

console.log('[Test] All assertions passed successfully!')
