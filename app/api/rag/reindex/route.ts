import { NextResponse } from 'next/server'
import { index, indexEntity } from '@/lib/rag/core'
import { agritrailsSourceConfig, invalidateCatalogueCache } from '@/lib/rag/sources.agritrails'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const secretHeader = request.headers.get('x-rag-secret')
    const expectedSecret = process.env.RAG_REINDEX_SECRET || process.env.CRON_SECRET || 'agritrails-rag-secret'

    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    const provided = secretHeader || bearer

    if (expectedSecret && provided !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { entityType, entityId } = body

    // Always invalidate compact catalogue cache on any entity update
    invalidateCatalogueCache()

    if (entityType && entityId) {
      await indexEntity(agritrailsSourceConfig, entityType, entityId)
      return NextResponse.json({
        success: true,
        message: `Entity ${entityType}:${entityId} reindexed successfully.`,
      })
    }

    // Full reindexing
    const stats = await index(agritrailsSourceConfig, { force: Boolean(body?.force) })
    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (err: any) {
    console.error('[API /api/rag/reindex Error]:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to reindex' },
      { status: 500 },
    )
  }
}
