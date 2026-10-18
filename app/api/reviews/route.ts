import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

const reviewSchema = z.object({
  farmId: z.string().uuid('Invalid farm ID'),
  bookingId: z.string().uuid('Invalid booking ID').optional(),
  ratingFood: z.coerce.number().int().min(1).max(5),
  ratingCleanliness: z.coerce.number().int().min(1).max(5),
  ratingHospitality: z.coerce.number().int().min(1).max(5),
  ratingLocation: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(5, 'Review comment must be at least 5 characters').max(2000),
})

const MAX_PHOTOS = 3
const MAX_PHOTO_SIZE = 3 * 1024 * 1024 // 3 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to submit a review' },
        { status: 401 },
      )
    }

    const contentType = request.headers.get('content-type') || ''
    let farmId = ''
    let bookingId: string | undefined
    let ratingFood = 5
    let ratingCleanliness = 5
    let ratingHospitality = 5
    let ratingLocation = 5
    let comment = ''
    const photoFiles: File[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      farmId = String(formData.get('farmId') || '')
      bookingId = formData.get('bookingId') ? String(formData.get('bookingId')) : undefined
      ratingFood = Number(formData.get('ratingFood') || 5)
      ratingCleanliness = Number(formData.get('ratingCleanliness') || 5)
      ratingHospitality = Number(formData.get('ratingHospitality') || 5)
      ratingLocation = Number(formData.get('ratingLocation') || 5)
      comment = String(formData.get('comment') || '')

      const rawPhotos = formData.getAll('photos')
      for (const item of rawPhotos) {
        if (item instanceof File && item.size > 0) {
          photoFiles.push(item)
        }
      }
    } else {
      const json = await request.json()
      farmId = json.farmId
      bookingId = json.bookingId
      ratingFood = json.ratingFood
      ratingCleanliness = json.ratingCleanliness
      ratingHospitality = json.ratingHospitality
      ratingLocation = json.ratingLocation
      comment = json.comment
    }

    const parsed = reviewSchema.safeParse({
      farmId,
      bookingId,
      ratingFood,
      ratingCleanliness,
      ratingHospitality,
      ratingLocation,
      comment,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid review data' },
        { status: 400 },
      )
    }

    // Validate photo constraints (max 3 images, 3 MB each, image types only)
    if (photoFiles.length > MAX_PHOTOS) {
      return NextResponse.json(
        { error: `You may upload a maximum of ${MAX_PHOTOS} photos` },
        { status: 400 },
      )
    }

    for (const file of photoFiles) {
      if (file.size > MAX_PHOTO_SIZE) {
        return NextResponse.json(
          { error: `Photo "${file.name}" exceeds the 3 MB size limit` },
          { status: 400 },
        )
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
        return NextResponse.json(
          { error: `Photo "${file.name}" is not a supported image type (JPEG, PNG, WebP, GIF only)` },
          { status: 400 },
        )
      }
    }

    const serviceClient = await createServiceClient()

    // Verify completed/confirmed booking for this user at this farm
    const { data: eligibleBookings, error: bookingErr } = await serviceClient
      .from('bookings')
      .select('id, status')
      .eq('farm_id', parsed.data.farmId)
      .eq('tourist_id', user.id)
      .in('status', ['confirmed', 'completed'])

    if (bookingErr || !eligibleBookings || eligibleBookings.length === 0) {
      return NextResponse.json(
        { error: 'Only guests with a completed or confirmed booking can post a review' },
        { status: 403 },
      )
    }

    const resolvedBookingId = parsed.data.bookingId || eligibleBookings[0].id

    // Upload photos to Supabase Storage bucket 'review-photos'
    const photoUrls: string[] = []
    for (const file of photoFiles) {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '')
      const storagePath = `${parsed.data.farmId}/${Date.now()}-${sanitizedName}`
      const fileBuffer = Buffer.from(await file.arrayBuffer())

      const { error: uploadError } = await serviceClient.storage
        .from('review-photos')
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        })

      if (!uploadError) {
        const { data: publicUrlData } = serviceClient.storage
          .from('review-photos')
          .getPublicUrl(storagePath)
        if (publicUrlData?.publicUrl) {
          photoUrls.push(publicUrlData.publicUrl)
        }
      }
    }

    // Insert review into reviews table
    const { data: insertedReview, error: insertError } = await serviceClient
      .from('reviews')
      .insert({
        farm_id: parsed.data.farmId,
        user_id: user.id,
        booking_id: resolvedBookingId,
        rating_food: parsed.data.ratingFood,
        rating_cleanliness: parsed.data.ratingCleanliness,
        rating_hospitality: parsed.data.ratingHospitality,
        rating_location: parsed.data.ratingLocation,
        comment: parsed.data.comment,
      })
      .select('*, profiles(full_name)')
      .single()

    if (insertError || !insertedReview) {
      return NextResponse.json(
        { error: insertError?.message || 'Failed to save review' },
        { status: 500 },
      )
    }

    // Insert photos into review_photos
    const createdPhotos: { id: string; url: string }[] = []
    if (photoUrls.length > 0) {
      const photoRecords = photoUrls.map((url) => ({
        review_id: insertedReview.id,
        url,
      }))
      const { data: photoData } = await serviceClient
        .from('review_photos')
        .insert(photoRecords)
        .select('*')
      if (photoData) {
        createdPhotos.push(...photoData)
      } else {
        photoUrls.forEach((url, i) =>
          createdPhotos.push({ id: `p-${Date.now()}-${i}`, url }),
        )
      }
    }

    // Keep rating_avg and review_count on farms updated
    const { data: allReviews } = await serviceClient
      .from('reviews')
      .select('rating_food, rating_cleanliness, rating_hospitality, rating_location')
      .eq('farm_id', parsed.data.farmId)

    if (allReviews && allReviews.length > 0) {
      const sum = allReviews.reduce(
        (acc, r) =>
          acc +
          (r.rating_food +
            r.rating_cleanliness +
            r.rating_hospitality +
            r.rating_location) /
            4,
        0,
      )
      const avg = Math.round((sum / allReviews.length) * 100) / 100
      await serviceClient
        .from('farms')
        .update({
          rating_avg: avg,
          review_count: allReviews.length,
        })
        .eq('id', parsed.data.farmId)
    }

    return NextResponse.json({
      success: true,
      review: {
        ...insertedReview,
        review_photos: createdPhotos,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'An unexpected error occurred while saving review' },
      { status: 500 },
    )
  }
}
