import { type Dealer, getDealers } from './data-loader'

// Haversine formula — returns distance in miles
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Common US state abbreviation → full name map
const STATE_ABBR: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
}

// Full name → abbr reverse map
const STATE_FULL: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBR).map(([k, v]) => [v.toLowerCase(), k])
)

// Common city nicknames / abbreviations → { city, state }
const CITY_ALIASES: Record<string, { city: string; state: string }> = {
  'la':            { city: 'Los Angeles',   state: 'CA' },
  'los angeles':   { city: 'Los Angeles',   state: 'CA' },
  'sf':            { city: 'San Francisco', state: 'CA' },
  'san francisco': { city: 'San Francisco', state: 'CA' },
  'nyc':           { city: 'New York',      state: 'NY' },
  'new york city': { city: 'New York',      state: 'NY' },
  'chicago':       { city: 'Chicago',       state: 'IL' },
  'dallas':        { city: 'Dallas',        state: 'TX' },
  'houston':       { city: 'Houston',       state: 'TX' },
  'miami':         { city: 'Miami',         state: 'FL' },
  'seattle':       { city: 'Seattle',       state: 'WA' },
  'portland':      { city: 'Portland',      state: 'OR' },
  'denver':        { city: 'Denver',        state: 'CO' },
  'phoenix':       { city: 'Phoenix',       state: 'AZ' },
  'boston':        { city: 'Boston',        state: 'MA' },
  'atlanta':       { city: 'Atlanta',       state: 'GA' },
  'nashville':     { city: 'Nashville',     state: 'TN' },
  'austin':        { city: 'Austin',        state: 'TX' },
}

function extractLocation(message: string): { state?: string; city?: string } {
  const msg = message.toLowerCase()
  let city: string | undefined
  let state: string | undefined

  // "in Chicago, IL" / "near Chicago" / "live in Newbury Park" / "I'm in California"
  const nearIn = msg.match(/(?:live in|living in|based in|i'm in|i am in|near|in|around)\s+([a-z][a-z\s]*?)(?:,\s*([a-z]{2}))?(?:\s|$|,|\.|!)/)

  if (nearIn) {
    const loc = nearIn[1].trim()
    const abbr = nearIn[2]?.toUpperCase()

    // Check city aliases first (handles "LA", "SF", "NYC")
    const alias = CITY_ALIASES[loc]
    if (alias) {
      city = alias.city
      state = alias.state
    } else if (abbr && STATE_ABBR[abbr]) {
      state = abbr
      city = loc
    } else {
      const stateAbbr = STATE_FULL[loc]
      if (stateAbbr) {
        state = stateAbbr
      } else {
        city = loc
      }
    }
  }

  // Fallback: look for known state abbreviations (e.g. "CA", "NY") — uppercase only to avoid false matches
  if (!state) {
    const abbrMatch = message.match(/\b([A-Z]{2})\b/)
    if (abbrMatch && STATE_ABBR[abbrMatch[1]]) state = abbrMatch[1]
  }

  return { state, city }
}

export interface DealerResult extends Dealer {
  distanceMi?: number
}

// Map user query keywords → campaign names in the data
const CAMPAIGN_KEYWORDS: Array<{ pattern: RegExp; campaign: string }> = [
  { pattern: /click\s*[&and]+\s*collect|click\s*collect|curbside|in.?store pickup/i, campaign: 'Click & Collect' },
  { pattern: /home\s*deliver|deliver.*home|ship.*home/i,                               campaign: 'Home Delivery' },
  { pattern: /e.?bike\s*repair|electric\s*bike\s*service|e.?bike\s*service/i,         campaign: 'E-Bike Repair Certified' },
  { pattern: /bike\s*fit|fitting\s*service/i,                                          campaign: 'Bike Fitting Services' },
  { pattern: /cadex/i,                                                                  campaign: 'CADEX Certified' },
  { pattern: /\bliv\b|women.?s\s*bike/i,                                               campaign: "Liv Women's Bikes" },
  { pattern: /e.?bike(?!\s*repair)/i,                                                  campaign: 'E-Bikes' },
]

function extractRequiredCampaign(message: string): string | null {
  for (const { pattern, campaign } of CAMPAIGN_KEYWORDS) {
    if (pattern.test(message)) return campaign
  }
  return null
}

export interface DealerResult extends Dealer {
  distanceMi?: number
}

export function searchDealers(
  message: string,
  userLat?: number,
  userLng?: number,
  topK = 3
): DealerResult[] {
  const dealers = getDealers()
  const { state, city } = extractLocation(message)
  const requiredCampaign = extractRequiredCampaign(message)

  let candidates: DealerResult[] = dealers.map(d => ({ ...d }))

  // Filter by required service/campaign first
  if (requiredCampaign) {
    const serviceFiltered = candidates.filter(d =>
      d.campaigns.some(c => c.toLowerCase() === requiredCampaign.toLowerCase())
    )
    if (serviceFiltered.length > 0) candidates = serviceFiltered
  }

  // If user GPS provided, sort by distance
  if (userLat && userLng) {
    candidates = candidates
      .map(d => ({ ...d, distanceMi: haversine(userLat, userLng, d.lat, d.lng) }))
      .sort((a, b) => (a.distanceMi ?? 999) - (b.distanceMi ?? 999))
    return candidates.slice(0, topK)
  }

  // Filter by state
  if (state) {
    const stateFiltered = candidates.filter(d =>
      d.state?.toUpperCase() === state.toUpperCase() ||
      d.state?.toLowerCase() === STATE_ABBR[state]?.toLowerCase()
    )
    if (stateFiltered.length > 0) candidates = stateFiltered
  }

  // Filter by city — word boundary match to avoid substring false positives
  if (city) {
    const cityRe = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    const cityFiltered = candidates.filter(d =>
      cityRe.test(d.city ?? '') || cityRe.test(d.address ?? '')
    )
    if (cityFiltered.length > 0) candidates = cityFiltered
  }

  return candidates.slice(0, topK)
}

export function formatDealersForPrompt(dealers: DealerResult[]): string {
  return dealers.map(d => {
    const dist = d.distanceMi != null ? ` (${d.distanceMi.toFixed(1)} mi away)` : ''
    const services = d.campaigns.length ? `Services: ${d.campaigns.join(', ')}` : ''
    return [
      `Dealer: ${d.name}${dist}`,
      `Address: ${d.address}`,
      `Phone: ${d.phone || 'N/A'}`,
      `Website: ${d.url ? 'https://' + d.url.replace(/^https?:\/\//, '') : 'N/A'}`,
      services,
    ].filter(Boolean).join('\n')
  }).join('\n\n')
}
