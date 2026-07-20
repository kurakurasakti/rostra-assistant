"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { faqs } from "./faq-data"

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      {faqs.map((faq, i) => (
        <div key={i} className="border border-[#E8E4DC] rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F8F6F2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#703c8b] focus-visible:ring-inset"
            aria-expanded={open === i}
          >
            <span className="font-medium text-[#1A1A18] text-sm leading-snug pr-4">{faq.q}</span>
            <ChevronDown
              className={`w-4 h-4 text-[#6B6862] transition-transform duration-200 flex-shrink-0 ${open === i ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {/* Answers stay in the DOM (crawlable); grid-rows animates the collapse */}
          <div
            className={`grid transition-[grid-template-rows] duration-200 ease-out ${
              open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="px-5 pb-4 pt-3 text-sm text-[#6B6862] leading-relaxed border-t border-[#E8E4DC]">
                {faq.a}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
