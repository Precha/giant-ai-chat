import Anthropic from '@anthropic-ai/sdk'
import { searchProducts, formatProductsForPrompt } from '@/lib/product-search'
import { searchDealers, formatDealersForPrompt } from '@/lib/dealer-search'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are Giant Bicycles' AI assistant for the US market.
Help customers find the right bike or gear, and locate nearby dealers.

Guidelines:
- Be concise, friendly, and direct — no filler phrases
- Never use emoji
- Do not use markdown formatting (no **bold**, no bullet dashes, no headers)
- Product and dealer cards are rendered automatically by the UI — do NOT write placeholders like [PRODUCT CARDS], [DEALER CARDS], or any bracketed labels. Never reference the cards in your text.
- When products are provided in context: write 1-2 sentences max about why they suit the customer. Do not repeat name, price, or specs. End with a follow-up question if helpful.
- When dealers are provided in context: write one short sentence only (e.g. "Here are the closest dealers near you."). Do not repeat addresses, phone numbers, or URLs.
- If you cannot answer from the provided context, say so honestly
- Do not invent product specs or prices`

function detectIntent(message: string): 'product' | 'dealer' | 'general' {
  const msg = message.toLowerCase()
  const dealerKws = ['dealer', 'store', 'shop', 'near me', 'nearby', 'closest', 'find a', 'where can i buy', 'where to buy', 'where do i buy', 'where can i get', 'buy a bike', 'purchase', 'location', 'retailer', 'i live in', 'i\'m in', 'i am in', 'local']
  const productKws = ['bike', 'bicycle', 'e-bike', 'ebike', 'gear', 'helmet', 'recommend', 'looking for', 'suggest', 'best', 'under $', 'budget', 'road', 'mountain', 'electric', 'commut']

  if (dealerKws.some(kw => msg.includes(kw))) return 'dealer'
  if (productKws.some(kw => msg.includes(kw))) return 'product'
  return 'general'
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { message, userLat, userLng, history = [] } = body as {
      message: string
      sessionId?: string
      platform?: string
      userLat?: number
      userLng?: number
      history?: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    if (!message?.trim()) {
      return new Response('Missing message', { status: 400 })
    }

    // Build full context from history for better intent detection
    const recentContext = history.map(m => m.content).join(' ')
    const fullContext = `${recentContext} ${message}`.trim()

    const intent = detectIntent(fullContext)
    let contextBlock = ''
    let structuredData: object | null = null

    if (intent === 'product') {
      const results = searchProducts(fullContext, 3)
      if (results.length) {
        contextBlock = `RELEVANT PRODUCTS:\n${formatProductsForPrompt(results)}`
        structuredData = {
          type: 'products',
          items: results.map(p => ({
            name: p.name,
            brand: p.brand,
            price: p.price,
            priceMax: p.priceMax,
            description: p.description ? p.description.slice(0, 100).replace(/\s\S+$/, '…') : '',
            imageUrl: p.imageUrl,
            productUrl: p.productUrl,
            inStock: p.inStock,
          })),
        }
      }
    } else if (intent === 'dealer') {
      const results = searchDealers(message, userLat, userLng, 3)
      if (results.length) {
        contextBlock = `NEARBY DEALERS:\n${formatDealersForPrompt(results)}`
        structuredData = {
          type: 'dealers',
          items: results.map(d => ({
            name: d.name,
            address: d.address,
            phone: d.phone,
            url: d.url,
            distanceMi: d.distanceMi,
            lat: d.lat,
            lng: d.lng,
            campaigns: d.campaigns,
          })),
        }
      }
    }

    const userContent = contextBlock
      ? `${contextBlock}\n\nCustomer question: ${message}`
      : message

    // Stream from Claude
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        // Inject conversation history for multi-turn context
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userContent },
      ],
    })

    // Return SSE stream
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        // Send structured data first so the widget can render cards immediately
        if (structuredData) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ structured: structuredData })}\n\n`)
          )
        }

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            )
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (err) {
    console.error('Chat API error:', err)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
