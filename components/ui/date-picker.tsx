"use client"

import { format } from "date-fns"
import { id } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import * as React from "react"
import { buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: string // YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  size?: "sm" | "default"
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal",
  className,
  size = "default",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    const d = new Date(value)
    return isNaN(d.getTime()) ? undefined : d
  }, [value])

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return

    // Format to YYYY-MM-DD in local time
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    const dd = String(date.getDate()).padStart(2, "0")
    const formatted = `${yyyy}-${mm}-${dd}`

    onChange(formatted)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline", size }),
          "w-full justify-start text-left font-normal h-10 px-3",
          size === "sm" && "h-8 text-xs px-2",
          !value && "text-muted-foreground",
          className,
        )}
      >
        <CalendarIcon
          className={cn("mr-2 h-4 w-4 shrink-0", size === "sm" && "mr-1 h-3.5 w-3.5")}
        />
        {dateValue ? format(dateValue, "d MMMM yyyy", { locale: id }) : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue || new Date()}
          onSelect={handleSelectDate}
          locale={id}
        />
      </PopoverContent>
    </Popover>
  )
}
