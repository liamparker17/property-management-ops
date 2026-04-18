import * as React from "react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const TONE_STYLES = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
} as const

export type StatTone = keyof typeof TONE_STYLES

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
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105 [&_svg]:size-5",
              TONE_STYLES[tone],
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 bottom-0 h-0.5 opacity-60",
          TONE_STYLES[tone].split(" ")[0],
        )}
      />
    </Card>
  )
}
