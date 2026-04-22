import * as React from "react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 border border-dashed border-border bg-[color:var(--muted)]/40 px-6 py-16 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex h-10 w-10 items-center justify-center border border-[color:var(--accent)]/40 text-[color:var(--accent)]">
          {icon}
        </div>
      ) : null}
      <div className="space-y-2">
        <p className="font-serif text-[22px] font-light text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-md text-sm leading-[1.7] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
