import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateBookingPrice } from './pricing'

test('1 to 3 guests gets Standard Rate with 0% discount for overnight', () => {
  const result = calculateBookingPrice({
    visitType: 'overnight',
    guests: 2,
    nights: 1,
    ratePerGuestPaise: 200000, // Rs. 2,000
  })

  assert.equal(result.discountPct, 0)
  assert.equal(result.packageName, 'Standard Rate')
  assert.equal(result.subtotalPaise, 400000)
  assert.equal(result.discountPaise, 0)
  assert.equal(result.discountedBasePaise, 400000)
  assert.equal(result.effectiveRatePerGuestPaise, 200000)
  assert.equal(result.totalPaise, 400000)
})

test('4 to 9 guests gets Family Package with 10% discount', () => {
  const result = calculateBookingPrice({
    visitType: 'overnight',
    guests: 5,
    nights: 2,
    ratePerGuestPaise: 100000, // Rs. 1,000
  })

  // 5 guests * 2 nights * 100000 = 1,000,000 paise (Rs. 10,000)
  assert.equal(result.discountPct, 10)
  assert.equal(result.packageName, 'Family Package')
  assert.equal(result.subtotalPaise, 1000000)
  assert.equal(result.discountPaise, 100000) // Rs. 1,000 discount
  assert.equal(result.discountedBasePaise, 900000) // Rs. 9,000
  assert.equal(result.effectiveRatePerGuestPaise, 90000) // Rs. 900 / guest / night
  assert.equal(result.totalPaise, 900000)
})

test('10 or more guests gets Group and Educational Package with 20% discount', () => {
  const result = calculateBookingPrice({
    visitType: 'overnight',
    guests: 12,
    nights: 1,
    ratePerGuestPaise: 150000, // Rs. 1,500
  })

  // 12 guests * 1 night * 150000 = 1,800,000 paise (Rs. 18,000)
  assert.equal(result.discountPct, 20)
  assert.equal(result.packageName, 'Group and Educational Package')
  assert.equal(result.subtotalPaise, 1800000)
  assert.equal(result.discountPaise, 360000) // 20% of 1,800,000 = 360,000
  assert.equal(result.discountedBasePaise, 1440000)
  assert.equal(result.effectiveRatePerGuestPaise, 120000)
  assert.equal(result.totalPaise, 1440000)
})

test('Day visit enforces 1 night and applies group discounts to day rates', () => {
  const result = calculateBookingPrice({
    visitType: 'day',
    guests: 10,
    nights: 3, // should be ignored for day visits
    ratePerGuestPaise: 50000, // Rs. 500 day rate
  })

  assert.equal(result.visitType, 'day')
  assert.equal(result.nights, 1)
  assert.equal(result.discountPct, 20)
  assert.equal(result.packageName, 'Group and Educational Package')
  assert.equal(result.subtotalPaise, 500000) // 10 * 50,000
  assert.equal(result.discountPaise, 100000)
  assert.equal(result.discountedBasePaise, 400000)
  assert.equal(result.totalPaise, 400000)
})

test('Add-ons are added to the total without discounts', () => {
  const result = calculateBookingPrice({
    visitType: 'day',
    guests: 4,
    ratePerGuestPaise: 80000,
    addOns: [
      { id: 'prod-1', pricePaise: 18000, qty: 2 }, // 36,000
      { id: 'prod-2', pricePaise: 22000, qty: 1 }, // 22,000
    ],
  })

  // 4 guests @ 80000 = 320,000. 10% discount = 32,000. Base = 288,000.
  // Add-ons = 36,000 + 22,000 = 58,000.
  // Total = 288,000 + 58,000 = 346,000.
  assert.equal(result.discountPct, 10)
  assert.equal(result.discountedBasePaise, 288000)
  assert.equal(result.addOnsTotalPaise, 58000)
  assert.equal(result.totalPaise, 346000)
})
