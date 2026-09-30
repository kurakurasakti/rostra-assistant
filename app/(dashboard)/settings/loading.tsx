"use client"

import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,640px)_170px] lg:justify-center gap-8 p-6 lg:p-8"
    >
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Tabs skeleton */}
        <Skeleton className="h-10 w-[240px] rounded-lg" />

        {/* Form elements skeleton */}
        <div className="space-y-8 mt-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-4 w-48" />
          </div>
          
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>

          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Sidebar / Quick Links skeleton */}
      <div className="hidden lg:block space-y-4">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    </motion.div>
  )
}
