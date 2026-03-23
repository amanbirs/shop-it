import { z } from "zod/v4"

export const createListSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    category: z.string().max(100).optional(),
    description: z.string().max(1000).optional(),
    budget_min: z.number().positive("Must be positive").optional(),
    budget_max: z.number().positive("Must be positive").optional(),
    purchase_by: z.iso.date().optional(),
  })
  .refine(
    (d) => !d.budget_min || !d.budget_max || d.budget_min <= d.budget_max,
    { message: "Min budget must be ≤ max budget", path: ["budget_min"] }
  )

export const updateListSchema = z.object({
  listId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  budget_min: z.number().positive().nullable().optional(),
  budget_max: z.number().positive().nullable().optional(),
  purchase_by: z.iso.date().nullable().optional(),
  priorities: z.array(z.string().max(100)).max(10).optional(),
  ai_title_edited: z.boolean().optional(),
})

export const archiveListSchema = z.object({
  listId: z.string().uuid(),
})

export type CreateListInput = z.infer<typeof createListSchema>
export type UpdateListInput = z.infer<typeof updateListSchema>
