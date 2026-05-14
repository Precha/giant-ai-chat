import { type Product, getProducts } from './data-loader'

interface SearchFilters {
  priceMax?: number
  priceMin?: number
  brand?: string
  types?: string[]
  keywords?: string[]
  level?: 'entry' | 'mid' | 'high'
  excludeLevels?: string[]
  isGear?: boolean      // user is looking for accessories/gear, not a bike
  gearType?: string     // specific gear type keyword, e.g. 'helmet', 'jersey'
  color?: string        // color keyword, e.g. 'black', 'white', 'red'
  suspension?: string   // 'Full Suspension' | 'Hardtail' | 'Front Suspension'
  frameMaterial?: string // 'Composite/Carbon' | 'Aluminum'
  wheelSize?: string    // '29"' | '700c' | '650b' | etc.
  brakeType?: string    // 'Disc Brake' | 'Rim Brake'
  riderHeightCm?: number
  isSale?: boolean
}

const GEAR_KEYWORDS_SET = new Set([
  'helmet', 'saddle', 'jersey', 'shoes', 'gloves', 'shorts', 'pedal', 'bottle',
  'light', 'lock', 'pump', 'bag', 'rack', 'fender', 'wheel', 'tire', 'tube',
  'handlebar', 'stem', 'seatpost', 'battery', 'charger', 'accessory', 'gear', 'apparel',
  'sock', 'eyewear', 'goggle', 'glasses', 'sunglass', 'computer', 'bib', 'warmer',
  // Additional gear categories derived from product data
  'grip', 'tape', 'tool', 'brake', 'tubeless', 'lube', 'cleaner',
  'trainer', 'inflator', 'co2', 'kickstand', 'cage',
])

// Maps gear keyword → exact Categories value in the product data
const GEAR_CATEGORY_MAP: Record<string, string> = {
  'helmet':     'Bike Helmets',
  'jersey':     'Jerseys',
  'glove':      'Gloves',
  'saddle':     'Saddles',
  'shoes':      'Shoes',
  'pedal':      'Pedals',
  'bottle':     'Bottles & Cages',
  'light':      'Lights',
  'lock':       'Locks',
  'pump':       'Floor & Mini Pumps',
  'bag':        'Bike Bag & Panniers',
  'rack':       'Racks',
  'fender':     'Fenders',
  'tire':       'Tires',
  'tube':       'Tubes',
  'handlebar':  'Handlebars',
  'stem':       'Stems',
  'seatpost':   'Seatposts',
  'battery':    'E-Bike Batteries & Accessories',
  'charger':    'E-Bike Batteries & Accessories',
  'sock':       'Socks',
  'eyewear':    'Eyewear',
  'goggle':     'Eyewear',
  'glasses':    'Eyewear',
  'sunglass':   'Eyewear',
  'computer':   'Computers',
  'bib':        'Bibs, Shorts & Tights',
  'short':      'Bibs, Shorts & Tights',
  'warmer':     'Arm & Leg Warmers/Coolers',
  // Additional mappings derived from product data
  'grip':       'Grips & Tape',
  'tape':       'Grips & Tape',
  'tool':       'Mini Tools',
  'brake':      'Brakes',
  'tubeless':   'Tubeless Accessories',
  'lube':       'Lubes & Cleaners',
  'cleaner':    'Lubes & Cleaners',
  'trainer':    'Trainers',
  'inflator':   'Inflators & CO2',
  'co2':        'Inflators & CO2',
  'kickstand':  'Kickstands',
  'cage':       'Bottles & Cages',
}

const TYPE_KEYWORDS: Record<string, string[]> = {
  'Mountain': ['mountain', 'mtb', 'trail', 'enduro', 'xc', 'cross-country', 'downhill', 'dirt', 'dirt jump', 'dirt jumper', 'jump bike', 'dj'],
  'Road': ['road', 'racing', 'aero', 'endurance', 'gravel', 'triathlon', 'tt'],
  'E-Bike': ['e-bike', 'ebike', 'electric', 'e-mtb', 'pedal assist', 'motor'],
  'City & Hybrid': ['city', 'commut', 'hybrid', 'urban', 'casual', 'everyday', 'lifestyle'],
  'Kids': ['kid', 'child', 'junior', 'youth', 'small', 'boy', 'girl', 'age 5', 'age 7', 'age 10', 'age 12', 'age 16'],
}

// Specific bike model/series names — used in intent detection to catch bare model queries
export const BIKE_MODEL_NAMES = [
  'propel', 'revolt', 'tcr', 'reign', 'anthem', 'contend', 'defy', 'avail',
  'langma', 'talon', 'stp', 'seek', 'devote', 'trance', 'fathom', 'xtc',
  'glory', 'maestro', 'stance', 'fastroad', 'escape', 'roam', 'cypress',
]

// Maps bike type → Categories values in the product data
const BIKE_CATEGORY_MAP: Record<string, string[]> = {
  'Mountain':      ['Mountain Bikes', 'Cross Country', 'Trail', 'Electric Mountain'],
  'Road':          ['Road Bikes', 'Road Race', 'Aero Race', 'Endurance', 'All-Rounder', 'Electric Road', 'Cross & Gravel Bikes', 'Gravel'],
  'E-Bike':        ['E-bikes', 'Electric Mountain', 'Electric Road'],
  'City & Hybrid': ['Urban Bikes', 'Leisure Bikes', 'Adventure'],
  'Kids':          ['Kids Bikes', 'Kids Age 5-7 Bikes', 'Kids Age 7-12 Bikes', 'Kids Age 10-16 Bikes'],
}

const BRAND_KEYWORDS: Record<string, string[]> = {
  'Giant': ['giant'],
  'Liv': ['liv', 'women', 'female', "women's"],
  'Momentum': ['momentum'],
  'Cadex': ['cadex'],
}

// Convert feet+inches string to cm
function ftInToCm(ft: number, inch: number): number {
  return Math.round((ft * 12 + inch) * 2.54)
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
  const matchedGearKw = Array.from(GEAR_KEYWORDS_SET).find(kw => msg.includes(kw))
  filters.isGear = !!matchedGearKw
  if (matchedGearKw) filters.gearType = matchedGearKw

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

  // Suspension type
  if (/full.?suspension|full.?susp|dual.?susp/i.test(msg)) {
    filters.suspension = 'Full Suspension'
  } else if (/hardtail|hard.?tail/i.test(msg)) {
    filters.suspension = 'Hardtail'
  } else if (/front.?suspension/i.test(msg)) {
    filters.suspension = 'Front Suspension'
  }

  // Frame material
  if (/carbon|composite/i.test(msg)) {
    filters.frameMaterial = 'Composite/Carbon'
  } else if (/aluminum|aluminium|alloy|ally/i.test(msg)) {
    filters.frameMaterial = 'Aluminum'
  }

  // Wheel size — match "29", "700c", "650b", "27.5", "26", "24", "20"
  const wheelMatch = msg.match(/\b(700c|650b|27\.5|29|26|24|20)\b/)
  if (wheelMatch) {
    const w = wheelMatch[1]
    // Normalise to the format used in structured filters
    filters.wheelSize = w === '29' ? '29"' : w === '27.5' ? '27.5"' : w
  }

  // Brake type
  if (/disc.?brake|hydraulic.?brake/i.test(msg)) {
    filters.brakeType = 'Disc Brake'
  } else if (/rim.?brake/i.test(msg)) {
    filters.brakeType = 'Rim Brake'
  }

  // Rider height — "175cm", "175 cm", "5'9"", "5'9", "5ft9", "5 feet 9"
  const cmMatch = msg.match(/(\d{3})\s*cm/)
  const ftInMatch = msg.match(/(\d)\s*(?:ft|feet|'|foot)\s*(\d{1,2})\s*(?:in|inches|"|'')?/)
  const ftOnlyMatch = msg.match(/(\d)\s*(?:ft|feet|foot)\b/)
  if (cmMatch) {
    filters.riderHeightCm = parseInt(cmMatch[1])
  } else if (ftInMatch) {
    filters.riderHeightCm = ftInToCm(parseInt(ftInMatch[1]), parseInt(ftInMatch[2]))
  } else if (ftOnlyMatch) {
    filters.riderHeightCm = ftInToCm(parseInt(ftOnlyMatch[1]), 0)
  }

  // Sale / clearance
  if (/\bsale\b|discount|clearance|closeout|close.?out|deal\b/i.test(msg)) {
    filters.isSale = true
  }

  // Color extraction
  const COLOR_KEYWORDS = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'gray', 'grey', 'silver', 'orange', 'pink', 'purple', 'chrome', 'gold', 'brown', 'navy', 'teal']
  const matchedColor = COLOR_KEYWORDS.find(c => msg.includes(c))
  if (matchedColor) filters.color = matchedColor

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
    ...product.categories,
    ...product.keyPerformanceFactors,
    ...product.technologies,
    ...Object.values(product.keySpecs),
    ...Object.values(product.structuredFilters),
    ...product.colors,
  ].join(' ').toLowerCase()

  const nameLower = product.name.toLowerCase()
  for (const kw of keywords) {
    if (haystack.includes(kw)) score += 1
    if (nameLower.includes(kw)) score += 2  // extra boost: keyword appears in product name
  }

  // Bonus: in stock
  if (product.inStock) score += 2

  // Gear query boosts
  if (filters.isGear && product.brand === 'Giant Gear') {
    score += 3

    // Strong boost when the product name ends with the gear keyword
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

  // Boost products matching requested color
  if (filters.color) {
    const colorsLower = product.colors.map(c => c.toLowerCase())
    if (colorsLower.some(c => c.includes(filters.color!))) score += 4
  }

  // Boost products where rider height is close to the middle of the fit range
  if (filters.riderHeightCm && product.riderHeightMin > 0 && product.riderHeightMax > 0) {
    const mid = (product.riderHeightMin + product.riderHeightMax) / 2
    const diff = Math.abs(filters.riderHeightCm - mid)
    if (diff <= 10) score += 2
    else if (diff <= 20) score += 1
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
    // Specific gear type: filter by Category (e.g. "helmet" → "Bike Helmets")
    if (filters.gearType && filters.isGear) {
      const targetCategory = GEAR_CATEGORY_MAP[filters.gearType]
      if (targetCategory) {
        if (!p.categories.includes(targetCategory)) return false
      } else {
        if (!p.name.toLowerCase().includes(filters.gearType)) return false
      }
    }
    if (!wantsFrameset && isFrameset(p)) return false
    if (filters.priceMax && p.price > filters.priceMax) return false
    if (filters.priceMin && p.priceMax < filters.priceMin) return false
    if (filters.brand && !p.brand.toLowerCase().includes(filters.brand.toLowerCase())) return false
    if (filters.types?.length) {
      const matchesType = filters.types.some(t => {
        const catMatches = BIKE_CATEGORY_MAP[t] ?? []
        return p.filters.some(f => f.toLowerCase().includes(t.toLowerCase())) ||
          p.category.toLowerCase().includes(t.toLowerCase()) ||
          p.categories.some(c => catMatches.includes(c))
      })
      if (!matchesType) return false
    }
    // Exclude high-end level tags for entry-level queries
    if (filters.excludeLevels?.length) {
      const hasExcluded = filters.excludeLevels.some(ex =>
        p.filters.some(f => f.toLowerCase().includes(ex.toLowerCase()))
      )
      if (hasExcluded) return false
    }
    // Structured filter hard-filters (only apply to bike products)
    if (!filters.isGear) {
      if (filters.suspension && p.structuredFilters['Suspension'] &&
          p.structuredFilters['Suspension'] !== filters.suspension) return false
      if (filters.frameMaterial && p.structuredFilters['Frame Material'] &&
          p.structuredFilters['Frame Material'] !== filters.frameMaterial) return false
      if (filters.wheelSize && p.structuredFilters['Wheel Size'] &&
          !p.structuredFilters['Wheel Size'].includes(filters.wheelSize)) return false
      if (filters.brakeType && p.structuredFilters['Brake Type'] &&
          p.structuredFilters['Brake Type'] !== filters.brakeType) return false
    }
    // Rider height: exclude bikes that definitely don't fit
    if (filters.riderHeightCm && p.riderHeightMin > 0 && p.riderHeightMax > 0) {
      if (filters.riderHeightCm < p.riderHeightMin || filters.riderHeightCm > p.riderHeightMax) return false
    }
    // Sale filter
    if (filters.isSale && !p.isSale) return false
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
    const fitRange = p.riderHeightMin && p.riderHeightMax
      ? `${p.riderHeightMin}–${p.riderHeightMax} cm`
      : ''
    return [
      `Product: ${p.name} (${p.brand})`,
      `Price: ${price}`,
      `Category: ${p.filters.slice(0, 3).join(', ')}`,
      specs ? `Key specs: ${specs}` : '',
      fitRange ? `Fits rider height: ${fitRange}` : '',
      `Description: ${p.description.slice(0, 200)}`,
      `URL: ${p.productUrl}`,
      `Image: ${p.imageUrl}`,
      `In stock: ${p.inStock}`,
    ].filter(Boolean).join('\n')
  }).join('\n\n')
}
