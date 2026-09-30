"use client"

import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

export default function RootLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </div>
          <Skeleton className="h-10 w-[120px]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
        </div>

        <div className="mt-6">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </motion.div>
    </div>
  )
}
