import { readImageBytes } from '@/lib/images'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bytes = await readImageBytes(slug).catch(() => null)
  if (!bytes) return new Response('Not found', { status: 404 })
  const versioned = new URL(request.url).searchParams.has('v')
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': versioned ? 'private, max-age=31536000, immutable' : 'private, no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  })
}
