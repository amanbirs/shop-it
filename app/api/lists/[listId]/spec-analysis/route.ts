import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { callGemini } from "@/lib/ai/gemini"
import { buildSpecAnalysisPrompt } from "@/lib/ai/prompts"
import { specAnalysisResponseSchema } from "@/lib/validators/spec-analysis"
import { revalidatePath } from "next/cache"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  const { listId } = await params

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } },
        { status: 401 }
      )
    }

    // Verify membership (editor or owner)
    const { data: membership } = await supabase
      .from("list_members")
      .select("role")
      .eq("list_id", listId)
      .eq("user_id", user.id)
      .single()

    if (!membership || membership.role === "viewer") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Editors and owners only" } },
        { status: 403 }
      )
    }

    // Fetch completed products
    const { data: products } = await supabase
      .from("products")
      .select(
        "id, title, brand, price_min, price_max, currency, specs, pros, cons, rating, review_count, ai_summary"
      )
      .eq("list_id", listId)
      .eq("extraction_status", "completed")
      .is("archived_at", null)

    if (!products || products.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Need at least 2 products with completed extraction" },
        },
        { status: 422 }
      )
    }

    // Fetch list metadata
    const { data: list } = await supabase
      .from("lists")
      .select("budget_min, budget_max, purchase_by, category, priorities")
      .eq("id", listId)
      .single()

    // Fetch user context
    const { data: profile } = await supabase
      .from("profiles")
      .select("context")
      .eq("id", user.id)
      .single()

    // Build prompt and call Gemini
    const prompt = buildSpecAnalysisPrompt({
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        brand: p.brand,
        price_min: p.price_min,
        price_max: p.price_max,
        currency: p.currency ?? "INR",
        specs: (p.specs as Record<string, string>) ?? {},
        pros: (p.pros as string[]) ?? [],
        cons: (p.cons as string[]) ?? [],
        rating: p.rating,
        review_count: p.review_count,
        ai_summary: p.ai_summary,
      })),
      budgetMin: list?.budget_min ?? null,
      budgetMax: list?.budget_max ?? null,
      purchaseBy: list?.purchase_by ?? null,
      category: list?.category ?? null,
      priorities: (list?.priorities as string[]) ?? [],
      userContext: (profile?.context as Record<string, unknown>) ?? {},
    })

    const response = await callGemini(prompt, { jsonMode: true, maxTokens: 8192 })
    const parsed = JSON.parse(response)

    // Validate AI response shape
    const validated = specAnalysisResponseSchema.parse(parsed)

    // Upsert using admin client (bypasses RLS)
    const admin = createAdminClient()
    const { data: upserted, error: upsertError } = await admin
      .from("list_spec_analyses")
      .upsert(
        {
          list_id: listId,
          spec_comparison: validated.spec_comparison,
          dimensions: validated.dimensions,
          product_count: products.length,
          product_ids: products.map((p) => p.id),
          generated_at: new Date().toISOString(),
          model_version: "gemini-3.1-flash-lite-preview",
        },
        { onConflict: "list_id" }
      )
      .select()
      .single()

    if (upsertError) throw upsertError

    revalidatePath(`/lists/${listId}`)

    return NextResponse.json({ success: true, data: upserted })
  } catch (err) {
    console.error("[spec-analysis] Failed:", err)
    return NextResponse.json(
      { success: false, error: { code: "AI_ERROR", message: "Failed to generate spec analysis" } },
      { status: 500 }
    )
  }
}
