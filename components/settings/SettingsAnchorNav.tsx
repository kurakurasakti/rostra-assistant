"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const sections = [
  { id: "profile", label: "Profil Bisnis" },
  { id: "whatsapp", label: "Koneksi WhatsApp" },
  { id: "business", label: "Pengetahuan Bisnis" },
  { id: "ai", label: "AI & Eskalasi" },
  { id: "import", label: "Impor Data" },
  { id: "system", label: "Tentang Aplikasi" },
  { id: "danger", label: "Zona Berbahaya" },
] as const

export type SettingsSectionId = (typeof sections)[number]["id"]

const sectionIds: readonly string[] = sections.map((s) => s.id)

export function SettingsAnchorNav() {
  const searchParams = useSearchParams()
  const [activeId, setActiveId] = useState<SettingsSectionId>("profile")
  const activeRef = useRef<SettingsSectionId>("profile")

  // Deep-link support: /settings?tab=whatsapp etc. "profile" (the default) means no scroll.
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && tab !== "profile" && sectionIds.includes(tab)) {
      requestAnimationFrame(() => {
        document.getElementById(tab)?.scrollIntoView({ behavior: "instant", block: "start" })
      })
    }
    // mount-only: deep link must not re-fire on later replaceState updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const setActive = (id: SettingsSectionId) => {
      if (activeRef.current !== id) {
        activeRef.current = id
        setActiveId(id)
      }
    }

    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)
    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && sectionIds.includes(entry.target.id)) {
            setActive(entry.target.id as SettingsSectionId)
          }
        }
      },
      { rootMargin: "-20% 0px -65% 0px" },
    )
    els.forEach((el) => observer.observe(el))

    // Short final sections never win intersection — force last item active at scroll bottom.
    // The dashboard scroll container is <main>, not the window.
    const scroller = els[0].closest("main") ?? document.documentElement
    const checkBottom = () => {
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
        setActive(sections[sections.length - 1].id)
      }
    }
    checkBottom()
    const scrollTarget: EventTarget = scroller === document.documentElement ? window : scroller
    scrollTarget.addEventListener("scroll", checkBottom, { passive: true })
    scrollTarget.addEventListener("scrollend", checkBottom)

    return () => {
      observer.disconnect()
      scrollTarget.removeEventListener("scroll", checkBottom)
      scrollTarget.removeEventListener("scrollend", checkBottom)
    }
  }, [])

  function handleClick(id: SettingsSectionId) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    history.replaceState(null, "", "?tab=" + id)
  }

  return (
    <nav className="sticky top-8">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2.5 pb-2">
        Di halaman ini
      </p>
      {sections.map(({ id, label }) => {
        const isActive = activeId === id
        const isDanger = id === "danger"
        return (
          <button
            key={id}
            type="button"
            onClick={() => handleClick(id)}
            className={cn(
              "block w-full text-left px-2.5 py-1.5 text-[12.5px] border-l-2 transition-colors duration-150",
              isActive
                ? isDanger
                  ? "border-red-600 text-red-600 font-semibold"
                  : "border-primary text-primary font-semibold"
                : isDanger
                  ? "border-border text-red-600/70 hover:text-red-600 font-normal"
                  : "border-border text-muted-foreground hover:text-foreground font-normal",
            )}
          >
            {label}
          </button>
        )
      })}
    </nav>
  )
}
