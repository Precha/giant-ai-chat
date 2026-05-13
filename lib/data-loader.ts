import fs from 'fs'
import path from 'path'

export type Brand = 'Giant' | 'Liv' | 'Momentum' | 'Giant Gear' | 'Liv Gear' | 'Momentum Gear' | 'Cadex'

export interface Product {
  id: number
  name: string
  brand: Brand
  category: string
  price: number
  priceMax: number
  description: string
  imageUrl: string
  productUrl: string
  filters: string[]
  structuredFilters: Record<string, string>  // FilterName → FilterValue
  categories: string[]
  keySpecs: Record<string, string>
  sizes: string[]
  colors: string[]
  inStock: boolean
  riderHeightMin: number  // cm, min rider height across all SKUs (0 = unknown)
  riderHeightMax: number  // cm, max rider height across all SKUs (0 = unknown)
  keyPerformanceFactors: string[]
  technologies: string[]
  isSale: boolean
  modelYear: string
}

export interface Dealer {
  code: string
  name: string
  address: string
  city: string
  state: string
  phone: string
  url: string
  lat: number
  lng: number
  campaigns: string[]   // service names: "Click & Collect", "Home Delivery", etc.
}

// Brand codes from raw JSON
const BRAND_MAP: Record<number, Brand> = {
  1: 'Giant',
  2: 'Liv',
  3: 'Momentum',
  4: 'Cadex',
}

const BRAND_BASE_URL: Record<Brand, string> = {
  'Giant':          'https://www.giant-bicycles.com',
  'Liv':            'https://www.liv-cycling.com',
  'Momentum':       'https://www.momentum-biking.com',
  'Giant Gear':     'https://www.giant-bicycles.com',
  'Liv Gear':       'https://www.liv-cycling.com',
  'Momentum Gear':  'https://www.momentum-biking.com',
  'Cadex':          'https://www.cadex-cycling.com',
}

// Spec keys worth keeping for AI context
const KEY_SPEC_KEYS = new Set([
  'bike_specs_hybrid_motor',
  'bike_specs_hybrid_battery',
  'bike_specs_frame_frame',
  'bike_specs_frame_fork',
  'bike_specs_frame_shock',
  'bike_specs_drivetrain_brakes',
  'bike_specs_drivetrain_rearderailleur',
  'bike_specs_wheels_tires',
  'bike_specs_frame_sizes',
  'bike_specs_frame_colors',
  'bike_specs_max_tire_clearance',
  'bike_specs_components_seatpost',
])

function parseProducts(raw: any, defaultBrand: Brand, forceBrand?: Brand): Product[] {
  if (!raw?.Products) return []
  return raw.Products.map((p: any): Product | null => {
    try {
      const skus: any[] = p.Skus ?? []
      const prices = skus.map((s: any) => s.Price).filter(Boolean)
      const price = prices.length ? Math.min(...prices) : 0
      const priceMax = prices.length ? Math.max(...prices) : 0

      const brand: Brand = forceBrand ?? BRAND_MAP[p.Brand] ?? defaultBrand

      const imageUrl: string =
        p.Images?.find((img: any) => img.Path)?.Path ?? ''

      const filters: string[] = (p.Filters ?? [])
        .map((f: any) => f.FilterValueLocalized)
        .filter(Boolean)

      const structuredFilters: Record<string, string> = {}
      for (const f of p.Filters ?? []) {
        if (f.FilterName && f.FilterValueLocalized) {
          structuredFilters[f.FilterName] = f.FilterValueLocalized
        }
      }

      const keySpecs: Record<string, string> = {}
      for (const attr of p.ProductAttributes ?? []) {
        if (KEY_SPEC_KEYS.has(attr.Key) && attr.Value) {
          keySpecs[attr.Label] = attr.Value
        }
      }

      const sizes = [...new Set(skus.map((s: any) => s.Size).filter(Boolean))] as string[]
      const colors = [...new Set(skus.map((s: any) => s.Color).filter(Boolean))] as string[]
      const inStock = skus.some((s: any) => !s.HasNoStock && !s.Discontinued)

      // Rider height range from Frame.SizeStart / SizeEnd (cm)
      const heights = skus.flatMap((s: any) => {
        const start = parseInt(s.Frame?.SizeStart ?? '')
        const end = parseInt(s.Frame?.SizeEnd ?? '')
        return [start, end].filter(n => !isNaN(n))
      })
      const riderHeightMin = heights.length ? Math.min(...heights) : 0
      const riderHeightMax = heights.length ? Math.max(...heights) : 0

      const keyPerformanceFactors: string[] = (p.KeyPerformanceFactors ?? [])
        .map((kpf: any) => [kpf.Title, kpf.Text].filter(Boolean).join(': '))
        .filter(Boolean)

      const technologies: string[] = (p.Technologies ?? [])
        .map((t: any) => t.Name)
        .filter(Boolean)

      const isSale = !!(p.IsSale || p.IsCloseOutSale)
      const modelYear: string = p.CollectionName ?? ''

      return {
        id: p.Id,
        name: p.Name,
        brand,
        category: filters[0] ?? '',
        price,
        priceMax,
        description: (() => {
          if (p.MetaDescription && p.MetaDescription.length >= 60) return p.MetaDescription
          if (p.BikeSeriesDescription) return p.BikeSeriesDescription.slice(0, 300)
          // Gear products use Features[0] as description fallback
          const firstFeature = ((p.Features as string[] | undefined)?.[0] ?? '')
            .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          if (firstFeature.length >= 30) return firstFeature.slice(0, 300)
          return p.MetaDescription ?? ''
        })(),
        imageUrl,
        productUrl: `${BRAND_BASE_URL[brand]}${p.Url ?? ''}`,
        filters,
        structuredFilters,
        categories: (p.Categories ?? []) as string[],
        keySpecs,
        sizes,
        colors,
        inStock,
        riderHeightMin,
        riderHeightMax,
        keyPerformanceFactors,
        technologies,
        isSale,
        modelYear,
      }
    } catch {
      return null
    }
  }).filter(Boolean) as Product[]
}

function parseDealers(raw: any): Dealer[] {
  if (!raw?.Dealers) return []
  return raw.Dealers.map((d: any): Dealer | null => {
    if (!d.Latitude || !d.Longitude) return null
    const parts = [d.Street, d.City, d.State, d.ZipCode].filter(Boolean)
    return {
      code: d.Code ?? '',
      name: d.Name ?? '',
      address: parts.join(', '),
      city: d.City ?? '',
      state: d.State ?? '',
      phone: d.Phone ?? '',
      url: d.Url ?? '',
      lat: d.Latitude,
      lng: d.Longitude,
      campaigns: (d.Campaigns ?? []).map((c: any) => c.Name).filter(Boolean),
    }
  }).filter(Boolean) as Dealer[]
}

function readJson(filePath: string): any {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

// Singleton — loaded once at server startup
let _products: Product[] | null = null
let _dealers: Dealer[] | null = null

const DATA_DIR = path.join(process.cwd(), 'data')

export function getProducts(): Product[] {
  if (_products) return _products
  const dir = path.join(DATA_DIR, 'products')
  _products = [
    ...parseProducts(readJson(path.join(dir, 'giant_bike_US.json')), 'Giant'),
    ...parseProducts(readJson(path.join(dir, 'liv_bike_US.json')), 'Liv'),
    ...parseProducts(readJson(path.join(dir, 'momentum_bike_US.json')), 'Momentum'),
    ...parseProducts(readJson(path.join(dir, 'giant_gear_US.json')), 'Giant Gear', 'Giant Gear'),
    ...parseProducts(readJson(path.join(dir, 'liv_gear_US.json')), 'Liv Gear', 'Liv Gear'),
    ...parseProducts(readJson(path.join(dir, 'momentum_gear_US.json')), 'Momentum Gear', 'Momentum Gear'),
    ...parseProducts(readJson(path.join(dir, 'cadex_gear_US.json')), 'Cadex', 'Cadex'),
  ]
  return _products
}

export function getDealers(): Dealer[] {
  if (_dealers) return _dealers
  _dealers = parseDealers(readJson(path.join(DATA_DIR, 'dealers', 'dealers_US.json')))
  return _dealers
}
