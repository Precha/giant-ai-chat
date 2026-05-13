import fs from 'fs'
import path from 'path'

export type Brand = 'Giant' | 'Liv' | 'Momentum' | 'Giant Gear'

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
  keySpecs: Record<string, string>
  sizes: string[]
  colors: string[]
  inStock: boolean
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
}

// Brand codes from raw JSON
const BRAND_MAP: Record<number, Brand> = {
  1: 'Giant',
  2: 'Liv',
  3: 'Momentum',
}

// Spec keys worth keeping for AI context
const KEY_SPEC_KEYS = new Set([
  'bike_specs_hybrid_motor',
  'bike_specs_hybrid_battery',
  'bike_specs_frame_frame',
  'bike_specs_frame_fork',
  'bike_specs_drivetrain_brakes',
  'bike_specs_wheels_tires',
  'bike_specs_frame_sizes',
  'bike_specs_frame_colors',
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

      const keySpecs: Record<string, string> = {}
      for (const attr of p.ProductAttributes ?? []) {
        if (KEY_SPEC_KEYS.has(attr.Key) && attr.Value) {
          keySpecs[attr.Label] = attr.Value
        }
      }

      const sizes = [...new Set(skus.map((s: any) => s.Size).filter(Boolean))] as string[]
      const colors = [...new Set(skus.map((s: any) => s.Color).filter(Boolean))] as string[]
      const inStock = skus.some((s: any) => !s.HasNoStock && !s.Discontinued)

      return {
        id: p.Id,
        name: p.Name,
        brand,
        category: filters[0] ?? '',
        price,
        priceMax,
        description: p.MetaDescription ?? p.BikeSeriesDescription?.slice(0, 300) ?? '',
        imageUrl,
        productUrl: `https://www.giant-bicycles.com${p.Url ?? ''}`,
        filters,
        keySpecs,
        sizes,
        colors,
        inStock,
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
  ]
  return _products
}

export function getDealers(): Dealer[] {
  if (_dealers) return _dealers
  _dealers = parseDealers(readJson(path.join(DATA_DIR, 'dealers', 'dealers_US.json')))
  return _dealers
}
