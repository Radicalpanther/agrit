import { z } from 'zod'

export const farmListingSchema = z.object({
  name: z.string().trim().min(3, 'Farm name must be at least 3 characters'),
  place: z.string().trim().min(2, 'Place / locality must be at least 2 characters'),
  region: z.string().trim().min(2, 'Region is required'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  pricePaise: z.coerce.number().int().positive('Price must be greater than zero'),
  allowsDayVisit: z.boolean().default(false),
  dayVisitPricePaise: z.coerce.number().int().positive('Day visit price must be positive').optional().nullable(),
  dayVisitStart: z.string().trim().optional().nullable(),
  dayVisitEnd: z.string().trim().optional().nullable(),
  maxGuests: z.coerce.number().int().min(1, 'Max guests must be at least 1'),
  tags: z.array(z.string().trim()).default([]),
  hostName: z.string().trim().min(2, 'Host name is required'),
  hostPhone: z.string().trim().min(8, 'Host phone is required'),
  landmarkNote: z.string().trim().optional().default(''),
  directionsSteps: z.array(z.string().trim()).default([]),
  cropIds: z.array(z.string().uuid()).default([]),
  imageUrl: z.string().trim().min(5, 'Valid image URL is required'),
  lat: z.coerce.number().min(-90).max(90).default(18.5204),
  lng: z.coerce.number().min(-180).max(180).default(73.8567),
  published: z.boolean().default(true),
})

export type FarmListingInput = z.infer<typeof farmListingSchema>

export function generateFarmSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return base || 'farm-stay'
}
