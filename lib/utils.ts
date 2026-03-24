import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CURRENCY_FORMATS: Record<string, Intl.NumberFormatOptions> = {
  INR: { style: "currency", currency: "INR", maximumFractionDigits: 0 },
  USD: { style: "currency", currency: "USD", maximumFractionDigits: 2 },
  EUR: { style: "currency", currency: "EUR", maximumFractionDigits: 2 },
}

export function formatPrice(amount: number, currency: string = "INR"): string {
  const opts = CURRENCY_FORMATS[currency] ?? {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }
  return new Intl.NumberFormat("en-IN", opts).format(amount)
}

export function formatPriceRange(
  min: number | null,
  max: number | null,
  currency: string = "INR"
): string {
  if (min === null && max === null) return "Price not available"
  if (min !== null && max !== null && min !== max) {
    return `${formatPrice(min, currency)} – ${formatPrice(max, currency)}`
  }
  return formatPrice(min ?? max!, currency)
}

export function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  tv: "📺", television: "📺",
  laptop: "💻", computer: "💻",
  phone: "📱", mobile: "📱",
  headphone: "🎧", audio: "🎧", speaker: "🎧",
  furniture: "🛋️", sofa: "🛋️", couch: "🛋️",
  kitchen: "🍳", appliance: "🍳",
  camera: "📷",
  shoe: "👟", running: "👟",
  house: "🏠", home: "🏠",
  car: "🚗", vehicle: "🚗",
  coffee: "☕", espresso: "☕",
  ac: "❄️", "air conditioner": "❄️",
  book: "📚",
  game: "🎮", gaming: "🎮",
  watch: "⌚",
  bike: "🚲", cycle: "🚲",
  baby: "👶", stroller: "👶",
}

/** Fallback emoji when AI-generated emoji is not available */
export function getCategoryEmoji(category: string | null): string {
  if (!category) return "📋"
  const lower = category.toLowerCase()
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI_MAP)) {
    if (lower.includes(key)) return emoji
  }
  return "📦"
}

const MINUTE = 60
const HOUR = 3600
const DAY = 86400

export function relativeTime(date: string | Date): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < MINUTE) return "just now"
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE)
    return `${m}m ago`
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR)
    return `${h}h ago`
  }
  const d = Math.floor(diff / DAY)
  return `${d}d ago`
}
