"use client"

import { useState, useRef, useEffect, useTransition, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { SearchResultCard } from "@/components/products/search-result-card"
import { callChatAction, loadChatMessages, updateChatInsights } from "@/lib/actions/chat"
import { addProductFromSearch } from "@/lib/actions/search"
import type { SearchResult } from "@/lib/actions/search"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  products?: SearchResult[]
}

type ChatPanelProps = {
  open: boolean
  onClose: () => void
  listId: string
  prefill?: string
}

export function ChatPanel({ open, onClose, listId, prefill }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasLoadedRef = useRef(false)
  // Track whether new messages were added this session (to decide if insights need updating)
  const hasNewMessagesRef = useRef(false)

  // Load persisted messages when panel opens
  useEffect(() => {
    if (open && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      setIsLoading(true)
      loadChatMessages(listId).then((result) => {
        if (result.success && result.data.messages.length > 0) {
          setMessages(
            result.data.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            }))
          )
        }
        setIsLoading(false)
      })
    }
  }, [open, listId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when opened + apply prefill
  useEffect(() => {
    if (open) {
      if (prefill) {
        setInput(prefill)
      }
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, prefill])

  const handleClose = useCallback(() => {
    // Extract insights in the background when closing, only if new messages were sent
    if (hasNewMessagesRef.current) {
      hasNewMessagesRef.current = false
      updateChatInsights(listId)
    }
    onClose()
  }, [listId, onClose])

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
        hasNewMessagesRef.current = true
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.data.response,
            products: result.data.products,
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

  const handleAddProduct = async (product: SearchResult): Promise<boolean> => {
    const res = await addProductFromSearch({
      listId,
      title: product.title,
      url: product.url,
      domain: product.domain,
      image_url: product.image_url,
      brand: product.brand,
      price_min: product.price_min,
      price_max: product.price_max,
      currency: product.currency,
    })

    if (res.success) {
      toast.success("Product added — extracting data...")
      return true
    } else {
      toast.error(res.error.message)
      return false
    }
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
            className="fixed bottom-6 right-6 z-50 hidden lg:flex flex-col w-[400px] h-[540px] rounded-xl border bg-card shadow-lg"
          >
            <ChatContent
              messages={messages}
              input={input}
              setInput={setInput}
              isPending={isPending}
              isLoading={isLoading}
              onSubmit={handleSubmit}
              onClose={handleClose}
              onAddProduct={handleAddProduct}
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
              isLoading={isLoading}
              onSubmit={handleSubmit}
              onClose={handleClose}
              onAddProduct={handleAddProduct}
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
  isLoading,
  onSubmit,
  onClose,
  onAddProduct,
  scrollRef,
  inputRef,
}: {
  messages: Message[]
  input: string
  setInput: (v: string) => void
  isPending: boolean
  isLoading: boolean
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  onAddProduct: (product: SearchResult) => Promise<boolean>
  scrollRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="text-sm font-medium">AI Assistant</span>
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
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Ask about products in your list, or discover new ones.
            </p>
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-muted-foreground/60">Try:</p>
              <p className="text-xs text-muted-foreground">&ldquo;Why is the LG better than the Samsung?&rdquo;</p>
              <p className="text-xs text-muted-foreground">&ldquo;Find me a good TV for gaming under 1L&rdquo;</p>
              <p className="text-xs text-muted-foreground">&ldquo;What should I look for in an OLED TV?&rdquo;</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            {msg.role === "user" ? (
              <p className="text-sm font-medium">{msg.content}</p>
            ) : (
              <>
                <div className="text-sm text-muted-foreground prose prose-sm prose-neutral dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-muted prose-pre:text-xs prose-a:text-primary">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
                {/* Inline product cards for discovery responses */}
                {msg.products && msg.products.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {msg.products.map((product) => (
                      <SearchResultCard
                        key={product.id}
                        result={product}
                        onAdd={() => onAddProduct(product)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
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
            placeholder="Ask a question or search for products..."
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
