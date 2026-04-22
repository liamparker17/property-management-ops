import * as React from "react"

import { cn } from "@/lib/utils"

const TONE_ACCENT = {
  primary: "bg-[color:var(--primary)]",
  emerald: "bg-emerald-600",
  amber: "bg-[color:var(--accent)]",
  rose: "bg-rose-600",
  sky: "bg-[color:var(--accent)]",
  violet: "bg-[color:var(--primary)]",
  slate: "bg-border",
} as const

export type StatTone = keyof typeof TONE_ACCENT

interface StatCardProps {
  label: React.ReactNode
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: React.ReactNode
  tone?: StatTone
  className?: string
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden border border-border bg-card p-5 transition hover:bg-[color:var(--muted)]",
        className,
      )}
    >
      <span aria-hidden className="absolute left-0 top-0 h-full w-0.5 opacity-70 transition-opacity group-hover:opacity-100">
        <span className={cn("block h-full w-full", TONE_ACCENT[tone])} />
      </span>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {label}
          </p>
          <p className="font-serif text-[38px] font-light leading-none tracking-[-0.02em] text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="opacity-40 [&_svg]:size-5">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  )
}
