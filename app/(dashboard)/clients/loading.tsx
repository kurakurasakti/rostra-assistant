"use client"

import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClientsLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 lg:p-8 space-y-6"
    >
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Search and Filter Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border bg-card">
        <div className="h-12 border-b px-4 flex items-center">
          <Skeleton className="h-4 w-1/4" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center p-4 border-b last:border-0">
            <div className="flex items-center gap-3 w-1/4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="w-1/4">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="w-1/4">
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="w-1/4 flex justify-end">
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
