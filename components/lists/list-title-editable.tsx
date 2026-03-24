"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { toast } from "sonner"
import { updateList } from "@/lib/actions/lists"

type ListTitleEditableProps = {
  listId: string
  name: string
  emoji: string
}

export function ListTitleEditable({ listId, name, emoji }: ListTitleEditableProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const save = () => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === name) {
      setValue(name)
      setEditing(false)
      return
    }

    startTransition(async () => {
      const result = await updateList({ listId, name: trimmed })
      if (!result.success) {
        toast.error(result.error.message)
        setValue(name)
      }
      setEditing(false)
    })
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-0">
        {emoji !== "📋" && <span className="text-2xl mr-1">{emoji}</span>}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
            if (e.key === "Escape") {
              setValue(name)
              setEditing(false)
            }
          }}
          disabled={isPending}
          className="text-2xl font-semibold leading-snug bg-transparent border-b border-foreground/20 outline-none w-full min-w-0"
        />
      </div>
    )
  }

  return (
    <h1
      onClick={() => setEditing(true)}
      className="text-2xl font-semibold leading-snug truncate cursor-text hover:text-foreground/80 transition-colors"
      title="Click to edit"
    >
      {emoji !== "📋" && <span className="mr-1">{emoji}</span>}
      {name}
    </h1>
  )
}
