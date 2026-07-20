"use client"

import { type ReactNode, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface InlineEditCardProps {
  title: string
  subtitle?: string
  summary: ReactNode // shown when collapsed
  defaultExpanded: boolean
  onCollapseRequest?: number // bump this number to force-collapse after save (e.g. Date.now())
  children: ReactNode // the real form/content, rendered only when expanded
}

export default function InlineEditCard({
  title,
  subtitle,
  summary,
  defaultExpanded,
  onCollapseRequest,
  children,
}: InlineEditCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  useEffect(() => {
    if (onCollapseRequest) {
      setExpanded(false)
    }
  }, [onCollapseRequest])

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {!expanded ? (
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="font-display font-semibold text-sm">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">{summary}</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => setExpanded(true)}
            >
              Edit
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-0.5">
            <h2 className="font-display font-semibold text-sm">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
        </div>
      )}
    </div>
  )
}
