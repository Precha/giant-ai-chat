import Anthropic from '@anthropic-ai/sdk'
import { searchProducts, formatProductsForPrompt } from '@/lib/product-search'
import { searchDealers, formatDealersForPrompt } from '@/lib/dealer-search'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are Giant Bicycles' AI assistant for the US market.
Help customers find the right bike or gear, and locate nearby dealers.

Guidelines:
- Always mention price when recommending products
- Be concise, friendly, and direct — no filler phrases
- Never use emoji
- When showing products, describe what makes each one suited to the customer's need
- When showing dealers, tell the customer they can call ahead or visit the website
- If you cannot answer from the provided context, say so honestly
- Do not invent product specs or prices`

function detectIntent(message: string): 'product' | 'dealer' | 'general' {
  const msg = message.toLowerCase()
  const dealerKws = ['dealer', 'store', 'shop', 'near me', 'nearby', 'closest', 'find a', 'where can i buy', 'location', 'retailer']
  const productKws = ['bike', 'bicycle', 'e-bike', 'ebike', 'gear', 'helmet', 'recommend', 'looking for', 'suggest', 'best', 'under $', 'budget', 'road', 'mountain', 'electric', 'commut']

  if (dealerKws.some(kw => msg.includes(kw))) return 'dealer'
  if (productKws.some(kw => msg.includes(kw))) return 'product'
  return 'general'
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { message, userLat, userLng } = body as {
      message: string
      sessionId?: string
      platform?: string
      userLat?: number
      userLng?: number
    }

    if (!message?.trim()) {
      return new Response('Missing message', { status: 400 })
    }

    const intent = detectIntent(message)
    let contextBlock = ''
    let structuredData: object | null = null

    if (intent === 'product') {
      const results = searchProducts(message, 3)
      if (results.length) {
        contextBlock = `RELEVANT PRODUCTS:\n${formatProductsForPrompt(results)}`
        structuredData = {
          type: 'products',
          items: results.map(p => ({
            name: p.name,
            brand: p.brand,
            price: p.price,
            priceMax: p.priceMax,
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
      messages: [{ role: 'user', content: userContent }],
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
