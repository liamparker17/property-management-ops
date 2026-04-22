import * as React from "react"

import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  eyebrow?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border/60 pb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-8",
        className,
      )}
    >
      <div className="space-y-3">
        {eyebrow ? (
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--accent)]">
            <span aria-hidden className="block h-px w-6 bg-[color:var(--accent)]" />
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-serif text-[34px] font-light leading-[1.05] tracking-[-0.01em] text-foreground sm:text-[44px]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-[1.7] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  )
}
