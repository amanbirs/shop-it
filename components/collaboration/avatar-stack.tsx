import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type Member = {
  name: string | null
  avatar_url: string | null
}

type AvatarStackProps = {
  members: Member[]
  max?: number
  size?: "sm" | "md"
}

const sizes = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
}

export function AvatarStack({ members, max = 3, size = "sm" }: AvatarStackProps) {
  const visible = members.slice(0, max)
  const overflow = members.length - max

  return (
    <div
      className="flex -space-x-2"
      aria-label={`${members.length} member${members.length === 1 ? "" : "s"}`}
    >
      {visible.map((m, i) => {
        const initials = m.name
          ? m.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
          : "?"
        return (
          <Avatar
            key={i}
            className={`${sizes[size]} ring-2 ring-background`}
          >
            <AvatarImage src={m.avatar_url ?? undefined} />
            <AvatarFallback className={sizes[size]}>{initials}</AvatarFallback>
          </Avatar>
        )
      })}
      {overflow > 0 && (
        <div
          className={`${sizes[size]} flex items-center justify-center rounded-full bg-muted ring-2 ring-background font-medium`}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
