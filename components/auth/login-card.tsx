"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Loader2, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const staggerChildren = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: [0.25, 0.4, 0, 1] as const },
  },
}

type LoginMode = "password" | "magic-link"

export function LoginCard() {
  const prefersReducedMotion = useReducedMotion()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<LoginMode>("password")
  const [state, setState] = useState<"form" | "sent">("form")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [cooldown, setCooldown] = useState(0)

  const handleMagicLink = () => {
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
        return
      }
      setState("sent")
    })
  }

  const handlePasswordLogin = () => {
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError(error.message)
        return
      }
      window.location.href = "/"
    })
  }

  const handleSignUp = () => {
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
        return
      }
      setState("sent")
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "magic-link") {
      handleMagicLink()
    } else {
      handlePasswordLogin()
    }
  }

  const handleResend = () => {
    if (cooldown > 0) return
    setCooldown(60)
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    handleMagicLink()
  }

  return (
    <div className="relative z-10 w-full max-w-md mx-4">
      <div className="rounded-2xl border border-white/50 bg-white/70 p-8 shadow-xl backdrop-blur-xl dark:border-zinc-700/50 dark:bg-zinc-900/60 dark:shadow-xl dark:shadow-black/30">
        <AnimatePresence mode="wait">
          {state === "form" ? (
            <motion.div
              key="form"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.98 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            >
              <motion.div
                variants={prefersReducedMotion ? undefined : staggerChildren}
                initial={prefersReducedMotion ? false : "hidden"}
                animate="visible"
                className="space-y-6"
              >
                <motion.div variants={fadeUp} className="text-center space-y-2">
                  <h1 className="text-2xl font-semibold text-foreground">
                    ◆ ShopIt
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Purchase decisions, made together.
                  </p>
                </motion.div>

                {/* Mode toggle */}
                <motion.div variants={fadeUp} className="flex rounded-lg bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => { setMode("password"); setError(null) }}
                    className={cn(
                      "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
                      mode === "password"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode("magic-link"); setError(null) }}
                    className={cn(
                      "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
                      mode === "magic-link"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Magic Link
                  </button>
                </motion.div>

                <motion.form
                  variants={fadeUp}
                  onSubmit={handleSubmit}
                  className="space-y-3"
                >
                  <Input
                    type="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="text-base"
                    aria-label="Email address"
                  />

                  {mode === "password" && (
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="text-base"
                      aria-label="Password"
                    />
                  )}

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isPending || !email || (mode === "password" && !password)}
                    aria-busy={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : mode === "magic-link" ? (
                      "Send Magic Link"
                    ) : (
                      "Sign In"
                    )}
                  </Button>

                  {/* Sign up disabled — users are created by admin in Supabase dashboard */}
                </motion.form>

                <motion.div
                  variants={fadeUp}
                  className="flex items-center gap-3"
                >
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">
                    or continue with
                  </span>
                  <Separator className="flex-1" />
                </motion.div>

                <motion.div
                  variants={fadeUp}
                  className="grid grid-cols-2 gap-3"
                >
                  <Button variant="outline" type="button" disabled>
                    Google
                  </Button>
                  <Button variant="outline" type="button" disabled>
                    Apple
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="space-y-6 text-center"
            >
              <div className="space-y-2">
                <Mail className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a {mode === "magic-link" ? "magic link" : "confirmation link"} to{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Click the link in your email to sign in.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={handleResend}
                disabled={isPending || cooldown > 0}
                className="w-full"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
              </Button>

              <button
                type="button"
                onClick={() => setState("form")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
