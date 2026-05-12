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

function extractLocation(message: string): { state?: string; city?: string } {
  const msg = message.toLowerCase()

  // "in Chicago, IL" / "near Chicago" / "in California"
  const nearIn = msg.match(/(?:near|in|around)\s+([a-z\s]+?)(?:,\s*([a-z]{2}))?(?:\s|$|,|\.|!)/)
  let city: string | undefined
  let state: string | undefined

  if (nearIn) {
    const loc = nearIn[1].trim()
    const abbr = nearIn[2]?.toUpperCase()

    if (abbr && STATE_ABBR[abbr]) {
      state = abbr
      city = loc
    } else {
      // Check if loc is a state name
      const stateAbbr = STATE_FULL[loc]
      if (stateAbbr) {
        state = stateAbbr
      } else {
        city = loc
      }
    }
  }

  // Fallback: scan for state abbreviations (e.g., "CA", "NY")
  if (!state) {
    const abbrMatch = msg.match(/\b([A-Z]{2})\b/)
    if (abbrMatch && STATE_ABBR[abbrMatch[1]]) state = abbrMatch[1]
  }

  return { state, city }
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

  let candidates: DealerResult[] = dealers.map(d => ({ ...d }))

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

  // Filter by city (fuzzy)
  if (city) {
    const cityFiltered = candidates.filter(d =>
      d.city?.toLowerCase().includes(city.toLowerCase()) ||
      d.address?.toLowerCase().includes(city.toLowerCase())
    )
    if (cityFiltered.length > 0) candidates = cityFiltered
  }

  return candidates.slice(0, topK)
}

export function formatDealersForPrompt(dealers: DealerResult[]): string {
  return dealers.map(d => {
    const dist = d.distanceMi != null ? ` (${d.distanceMi.toFixed(1)} mi away)` : ''
    return [
      `Dealer: ${d.name}${dist}`,
      `Address: ${d.address}`,
      `Phone: ${d.phone || 'N/A'}`,
      `Website: ${d.url ? 'https://' + d.url.replace(/^https?:\/\//, '') : 'N/A'}`,
    ].join('\n')
  }).join('\n\n')
}
