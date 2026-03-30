/**
 * Serper.dev Google Search API client.
 * Used to find real product page URLs — LLMs hallucinate URLs,
 * but Serper returns actual Google SERP results.
 */

const SERPER_API_URL = "https://google.serper.dev/search"

type SerperOrganicResult = {
  title: string
  link: string
  snippet: string
  position: number
  sitelinks?: Array<{ title: string; link: string }>
}

type SerperResponse = {
  organic: SerperOrganicResult[]
  knowledgeGraph?: {
    title?: string
    description?: string
    website?: string
  }
}

export type WebSearchResult = {
  title: string
  url: string
  snippet: string
  domain: string
}

/**
 * Search Google via Serper.dev and return the top organic results.
 */
export async function searchWeb(
  query: string,
  options: { num?: number; gl?: string } = {}
): Promise<WebSearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    throw new Error("SERPER_API_KEY is not set")
  }

  const res = await fetch(SERPER_API_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num: options.num ?? 5,
      gl: options.gl ?? "in", // India by default
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Serper API error (${res.status}): ${text.slice(0, 300)}`)
  }

  const data: SerperResponse = await res.json()

  return (data.organic ?? []).map((r) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
    domain: extractDomainFromUrl(r.link),
  }))
}

/**
 * Find a product purchase page by searching for the product name.
 * Returns the best matching URL from Google results.
 */
export async function findProductUrl(
  productName: string,
  brand: string | null
): Promise<{ url: string; domain: string } | null> {
  const query = brand
    ? `${brand} ${productName} buy India`
    : `${productName} buy India`

  try {
    const results = await searchWeb(query, { num: 5 })

    // Prefer retailer/brand pages over review sites
    const retailers = new Set([
      "amazon.in", "flipkart.com", "croma.com", "reliance digital",
      "vijaysales.com", "tatacliq.com", "jiomart.com",
      "amazon.com", "bestbuy.com", "walmart.com",
    ])

    // Score results: retailers get priority, product-looking paths get priority
    const scored = results.map((r) => {
      let score = 0
      const domain = r.domain.toLowerCase()

      // Retailer bonus
      for (const retailer of retailers) {
        if (domain.includes(retailer)) { score += 10; break }
      }

      // Product page path bonus (contains /dp/, /product/, /p/, /ip/)
      const path = new URL(r.url).pathname.toLowerCase()
      if (/\/(dp|product|p|ip|itm)\//.test(path)) score += 5
      if (path.length > 10 && path !== "/") score += 2

      // Penalize review/comparison sites
      if (domain.includes("smartprix") || domain.includes("91mobiles") || domain.includes("gadgets360") || domain.includes("gsmarena")) {
        score -= 5
      }

      return { ...r, score }
    })

    scored.sort((a, b) => b.score - a.score)

    const best = scored[0]
    if (!best) return null

    return { url: best.url, domain: best.domain }
  } catch (err) {
    console.error(`[findProductUrl] Failed for "${productName}":`, err)
    return null
  }
}

function extractDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}
