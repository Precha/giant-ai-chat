import { type Product, getProducts } from './data-loader'

interface SearchFilters {
  priceMax?: number
  priceMin?: number
  brand?: string
  types?: string[]
  keywords?: string[]
  level?: 'entry' | 'mid' | 'high'
  excludeLevels?: string[]
  isGear?: boolean    // user is looking for accessories/gear, not a bike
}

const GEAR_KEYWORDS_SET = new Set([
  'helmet', 'saddle', 'jersey', 'shoes', 'gloves', 'shorts', 'pedal', 'bottle',
  'light', 'lock', 'pump', 'bag', 'rack', 'fender', 'wheel', 'tire', 'tube',
  'handlebar', 'stem', 'seatpost', 'battery', 'charger', 'accessory', 'gear', 'apparel',
])

const TYPE_KEYWORDS: Record<string, string[]> = {
  'Mountain': ['mountain', 'mtb', 'trail', 'enduro', 'xc', 'cross-country', 'downhill', 'dirt'],
  'Road': ['road', 'racing', 'aero', 'endurance', 'gravel', 'triathlon', 'tt'],
  'E-Bike': ['e-bike', 'ebike', 'electric', 'e-mtb', 'pedal assist', 'motor'],
  'City & Hybrid': ['city', 'commut', 'hybrid', 'urban', 'casual', 'everyday', 'lifestyle'],
  'Kids': ['kid', 'child', 'junior', 'youth', 'small'],
}

const BRAND_KEYWORDS: Record<string, string[]> = {
  'Giant': ['giant'],
  'Liv': ['liv', 'women', 'female', "women's"],
  'Momentum': ['momentum'],
}

function extractFilters(message: string): SearchFilters {
  const msg = message.toLowerCase()
  const filters: SearchFilters = {}

  // Price extraction
  const underMatch = msg.match(/under\s*\$?([\d,]+)/)
  const belowMatch = msg.match(/below\s*\$?([\d,]+)/)
  const maxMatch = msg.match(/budget[^\d]*\$?([\d,]+)|less than\s*\$?([\d,]+)|\$?([\d,]+)\s*(?:or less|max|maximum)/)
  const rangeMatch = msg.match(/\$?([\d,]+)\s*(?:to|-)\s*\$?([\d,]+)/)

  if (rangeMatch) {
    filters.priceMin = parseInt(rangeMatch[1].replace(',', ''))
    filters.priceMax = parseInt(rangeMatch[2].replace(',', ''))
  } else if (underMatch || belowMatch) {
    const raw = (underMatch?.[1] ?? belowMatch?.[1])!
    filters.priceMax = parseInt(raw.replace(',', ''))
  } else if (maxMatch) {
    const raw = maxMatch[1] ?? maxMatch[2] ?? maxMatch[3]
    if (raw) filters.priceMax = parseInt(raw.replace(',', ''))
  }

  // Brand extraction
  for (const [brand, kws] of Object.entries(BRAND_KEYWORDS)) {
    if (kws.some(kw => msg.includes(kw))) {
      filters.brand = brand
      break
    }
  }

  // Gear/accessory detection — when searching for accessories, skip bike-type filters
  filters.isGear = Array.from(GEAR_KEYWORDS_SET).some(kw => msg.includes(kw))

  // Type extraction — skip for gear queries (e.g. "road biker" shouldn't filter helmets to Road bikes)
  if (!filters.isGear) {
    const matchedTypes: string[] = []
    for (const [type, kws] of Object.entries(TYPE_KEYWORDS)) {
      if (kws.some(kw => msg.includes(kw))) matchedTypes.push(type)
    }
    if (matchedTypes.length) filters.types = matchedTypes
  }

  // Skill / budget level detection
  const isEntry = /beginner|entry.?level|starter|first.?bike|first bike|new to|getting into|casual|recreational/i.test(msg)
  const isHigh = /pro|professional|elite|racing|competitive|advanced|expert|high.?end|top.?of.?the.?line/i.test(msg)

  if (isEntry) {
    filters.level = 'entry'
    // Implied price cap if user didn't specify one
    if (!filters.priceMax) filters.priceMax = 2500
    // Exclude high-end level tags from Giant's filter system
    filters.excludeLevels = ['Elite', 'Racing', 'Performance SL']
  } else if (isHigh) {
    filters.level = 'high'
    if (!filters.priceMin) filters.priceMin = 2000
  }

  // Remaining keywords for scoring
  filters.keywords = msg
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)

  return filters
}

function scoreProduct(product: Product, filters: SearchFilters): number {
  let score = 0
  const { keywords = [] } = filters

  const haystack = [
    product.name,
    product.description,
    ...product.filters,
    product.brand,
    product.category,
    ...Object.values(product.keySpecs),
  ].join(' ').toLowerCase()

  for (const kw of keywords) {
    if (haystack.includes(kw)) score += 1
  }

  // Bonus: in stock
  if (product.inStock) score += 2

  // Gear query boosts
  if (filters.isGear && product.brand === 'Giant Gear') {
    score += 3

    // Strong boost when the product name ends with the gear keyword
    // e.g. "Pursuit Mips Helmet" ends with "helmet" → primary product
    // "Replacement Pads for Helmets" does not → accessory/part
    const nameLower = product.name.toLowerCase()
    for (const kw of keywords) {
      if (GEAR_KEYWORDS_SET.has(kw) && new RegExp(`\\b${kw}s?$`).test(nameLower)) {
        score += 5  // primary product match
      }
    }

    // Penalise parts/accessories that mention the keyword only as a modifier
    if (/replacement|spare|pad|visor|plug|mount|strap|cover|part/i.test(product.name)) {
      score -= 4
    }
  }

  // Boost Lifestyle-level products for entry queries
  if (filters.level === 'entry') {
    if (product.filters.some(f => /lifestyle|recreational|leisure/i.test(f))) score += 3
    if (product.price <= 1500) score += 2
    else if (product.price <= 2500) score += 1
  }

  return score
}

export interface ProductResult extends Product {
  score: number
}

function isFrameset(product: Product): boolean {
  return /frameset/i.test(product.name) ||
    product.filters.some(f => /frameset/i.test(f))
}

export function searchProducts(message: string, topK = 3): ProductResult[] {
  const products = getProducts()
  const filters = extractFilters(message)

  // Only include framesets if user explicitly asked for one
  const wantsFrameset = /frameset/i.test(message)

  const BIKE_BRANDS = new Set(['Giant', 'Liv', 'Momentum'])

  const ACCESSORY_PART_RE = /^(replacement|spare|visor for|plug for|pad(s)? for|mount for|strap for|extension for|clip for|clamp for|cover for)/i

  let candidates = products.filter(p => {
    // Gear query: only return gear/accessory products, not bikes
    if (filters.isGear && BIKE_BRANDS.has(p.brand)) return false
    // Gear query: exclude obvious replacement parts/accessories
    if (filters.isGear && ACCESSORY_PART_RE.test(p.name)) return false
    if (!wantsFrameset && isFrameset(p)) return false
    if (filters.priceMax && p.price > filters.priceMax) return false
    if (filters.priceMin && p.priceMax < filters.priceMin) return false
    if (filters.brand && !p.brand.toLowerCase().includes(filters.brand.toLowerCase())) return false
    if (filters.types?.length) {
      const matchesType = filters.types.some(t =>
        p.filters.some(f => f.toLowerCase().includes(t.toLowerCase())) ||
        p.category.toLowerCase().includes(t.toLowerCase())
      )
      if (!matchesType) return false
    }
    // Exclude high-end level tags for entry-level queries
    if (filters.excludeLevels?.length) {
      const hasExcluded = filters.excludeLevels.some(ex =>
        p.filters.some(f => f.toLowerCase().includes(ex.toLowerCase()))
      )
      if (hasExcluded) return false
    }
    return true
  })

  // Fall back to full list if filters are too restrictive
  if (candidates.length === 0) candidates = products

  return candidates
    .map(p => ({ ...p, score: scoreProduct(p, filters) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

export function formatProductsForPrompt(products: ProductResult[]): string {
  return products.map(p => {
    const price = p.price === p.priceMax
      ? `$${p.price.toLocaleString()}`
      : `$${p.price.toLocaleString()}–$${p.priceMax.toLocaleString()}`
    const specs = Object.entries(p.keySpecs)
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ')
    return [
      `Product: ${p.name} (${p.brand})`,
      `Price: ${price}`,
      `Category: ${p.filters.slice(0, 3).join(', ')}`,
      specs ? `Key specs: ${specs}` : '',
      `Description: ${p.description.slice(0, 200)}`,
      `URL: ${p.productUrl}`,
      `Image: ${p.imageUrl}`,
      `In stock: ${p.inStock}`,
    ].filter(Boolean).join('\n')
  }).join('\n\n')
}
