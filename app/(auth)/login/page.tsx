import { LoginCard } from "@/components/auth/login-card"

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] bg-[size:16px_16px] dark:bg-[radial-gradient(#3f3f46_1px,transparent_1px)]"
        style={{
          maskImage:
            "radial-gradient(ellipse 60% 60% at 50% 50%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 60% at 50% 50%, #000 40%, transparent 100%)",
        }}
      />

      {/* Radial glow behind card */}
      <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,oklch(0.541_0.281_293.009/0.12),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,oklch(0.541_0.281_293.009/0.20),transparent_70%)]" />

      {/* Login card */}
      <LoginCard />
    </div>
  )
}
