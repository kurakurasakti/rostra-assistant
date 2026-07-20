"use client"

import { format } from "date-fns"
import { id } from "date-fns/locale"
import { CalendarIcon, ClockIcon } from "lucide-react"
import * as React from "react"
import { buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  value?: string // YYYY-MM-DDTHH:mm or ISO string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  size?: "sm" | "default"
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal & waktu",
  className,
  size = "default",
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Parse string value into Date object or default to null/undefined
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    const d = new Date(value)
    return isNaN(d.getTime()) ? undefined : d
  }, [value])

  // Split date and time representation
  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return

    const newDate = new Date(date)
    if (dateValue) {
      newDate.setHours(dateValue.getHours())
      newDate.setMinutes(dateValue.getMinutes())
      newDate.setSeconds(0)
      newDate.setMilliseconds(0)
    } else {
      const now = new Date()
      newDate.setHours(now.getHours())
      newDate.setMinutes(now.getMinutes())
      newDate.setSeconds(0)
      newDate.setMilliseconds(0)
    }

    const localISOString = formatToLocalISO(newDate)
    onChange(localISOString)
  }

  const handleTimeChange = (type: "hours" | "minutes", timeVal: string) => {
    const now = dateValue ? new Date(dateValue) : new Date()
    const numVal = parseInt(timeVal, 10) || 0

    if (type === "hours") {
      now.setHours(Math.max(0, Math.min(23, numVal)))
    } else {
      now.setMinutes(Math.max(0, Math.min(59, numVal)))
    }
    now.setSeconds(0)
    now.setMilliseconds(0)

    const localISOString = formatToLocalISO(now)
    onChange(localISOString)
  }

  // Format Date to YYYY-MM-DDTHH:mm (local time representation)
  const formatToLocalISO = (date: Date): string => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    const dd = String(date.getDate()).padStart(2, "0")
    const hh = String(date.getHours()).padStart(2, "0")
    const min = String(date.getMinutes()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  }

  const currentHours = dateValue ? String(dateValue.getHours()).padStart(2, "0") : ""
  const currentMinutes = dateValue ? String(dateValue.getMinutes()).padStart(2, "0") : ""

  const now = new Date()
  const placeholderHours = String(now.getHours()).padStart(2, "0")
  const placeholderMinutes = String(now.getMinutes()).padStart(2, "0")

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
        {dateValue ? (
          format(dateValue, "d MMMM yyyy, HH:mm", { locale: id })
        ) : (
          <span>{placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 flex flex-col" align="start">
        <Calendar
          mode="single"
          selected={dateValue || new Date()}
          onSelect={handleSelectDate}
          locale={id}
        />
        <div className="flex items-center justify-between border-t border-border p-3 gap-2 bg-muted/10">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClockIcon className="h-3.5 w-3.5" />
            <span>Waktu:</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={23}
              value={currentHours}
              onChange={(e) => handleTimeChange("hours", e.target.value)}
              placeholder={placeholderHours}
              className="w-12 rounded-md border border-input bg-transparent px-2 py-1 text-center text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-muted-foreground font-medium">:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={currentMinutes}
              onChange={(e) => handleTimeChange("minutes", e.target.value)}
              placeholder={placeholderMinutes}
              className="w-12 rounded-md border border-input bg-transparent px-2 py-1 text-center text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
