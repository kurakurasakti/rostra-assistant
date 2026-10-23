"use client"

import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, filter: "blur(4px)", y: 10 },
    show: { opacity: 1, filter: "blur(0px)", y: 0 },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6"
    >
      <motion.div variants={item} className="space-y-1.5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </motion.div>
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </motion.div>
      <motion.div variants={item} className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </motion.div>
    </motion.div>
  )
}
