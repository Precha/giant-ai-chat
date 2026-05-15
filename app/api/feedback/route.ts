import { createClient } from '@supabase/supabase-js'

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null

const ALLOWED_ORIGINS: Set<string> = new Set(
  (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean)
)
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.add('http://localhost:3000')
  ALLOWED_ORIGINS.add('http://localhost:3001')
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : null
  return {
    'Access-Control-Allow-Origin': allowed ?? '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  try {
    const { session_id, message_index, rating } = await req.json()
    if (!session_id || !['up', 'down'].includes(rating)) {
      return new Response('Bad request', { status: 400, headers: cors })
    }
    if (supabase) {
      const { error } = await supabase.from('feedback').insert({ session_id, message_index, rating })
      if (error) console.error('Supabase feedback error:', error.message)
    }
    return new Response('ok', { headers: cors })
  } catch {
    return new Response('error', { status: 500, headers: cors })
  }
}

export async function OPTIONS(req: Request) {
  return new Response(null, { headers: corsHeaders(req.headers.get('origin')) })
}
