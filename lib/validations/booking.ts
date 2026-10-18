import { z } from 'zod'

export const bookingSchema = z.object({
  farmSlug: z.string().min(1, 'Farm is required'),
  visitType: z.enum(['day', 'overnight']).default('day'),
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().min(8, 'Phone number is required'),
  whatsappOptIn: z.boolean().default(false),
  checkInDate: z.string().min(1, 'Date is required'),
  arrivalTime: z.string().optional(),
  nights: z.coerce.number().int().min(1, 'At least 1 night required').default(1),
  guests: z.coerce.number().int().min(1, 'At least 1 guest required').default(2),
  addOnIds: z.array(z.string()).default([]),
})

export type BookingFormData = z.infer<typeof bookingSchema>
