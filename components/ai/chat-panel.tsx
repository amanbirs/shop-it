"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { callChatAction } from "@/lib/actions/chat"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

type ChatPanelProps = {
  open: boolean
  onClose: () => void
  listId: string
}

export function ChatPanel({ open, onClose, listId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isPending) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    startTransition(async () => {
      const result = await callChatAction({
        listId,
        message: userMessage.content,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      })

      if (result.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.data.response,
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Sorry, I couldn't process that. Try again.",
          },
        ])
      }
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Desktop: floating card */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.25, 0.4, 0, 1] as const }}
            className="fixed bottom-6 right-6 z-50 hidden lg:flex flex-col w-[360px] h-[480px] rounded-xl border bg-card shadow-lg"
          >
            <ChatContent
              messages={messages}
              input={input}
              setInput={setInput}
              isPending={isPending}
              onSubmit={handleSubmit}
              onClose={onClose}
              scrollRef={scrollRef}
              inputRef={inputRef}
            />
          </motion.div>

          {/* Mobile: full-screen */}
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0, 1] as const }}
            className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden"
          >
            <ChatContent
              messages={messages}
              input={input}
              setInput={setInput}
              isPending={isPending}
              onSubmit={handleSubmit}
              onClose={onClose}
              scrollRef={scrollRef}
              inputRef={inputRef}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ChatContent({
  messages,
  input,
  setInput,
  isPending,
  onSubmit,
  onClose,
  scrollRef,
  inputRef,
}: {
  messages: Message[]
  input: string
  setInput: (v: string) => void
  isPending: boolean
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  scrollRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="text-sm font-medium">Ask about this list</span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Ask anything about the products in this list.
            </p>
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-muted-foreground/60">Try:</p>
              <p className="text-xs text-muted-foreground">&ldquo;Why is the LG better than the Samsung?&rdquo;</p>
              <p className="text-xs text-muted-foreground">&ldquo;What if I increase my budget?&rdquo;</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-0.5">
            <p
              className={
                msg.role === "user"
                  ? "text-sm font-medium"
                  : "text-sm text-muted-foreground"
              }
            >
              {msg.content}
            </p>
          </div>
        ))}

        {isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="border-t border-border px-4 py-3 shrink-0"
      >
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="text-sm min-h-[36px] max-h-[80px] resize-none"
            rows={1}
            disabled={isPending}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onSubmit(e)
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={isPending || !input.trim()}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </form>
    </>
  )
}
