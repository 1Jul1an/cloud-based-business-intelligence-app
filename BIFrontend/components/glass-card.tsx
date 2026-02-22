import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "strong"
}

export function GlassCard({ className, variant = "default", children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl transition-all duration-200",
        variant === "default" && "glass",
        variant === "subtle" && "glass-subtle",
        variant === "strong" && "glass-strong",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
