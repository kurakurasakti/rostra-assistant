"use client"

import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

export default function InboxLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-[calc(100vh-4rem)] overflow-hidden" // Matching Inbox layout
    >
      {/* Sidebar List Skeleton */}
      <div className="w-full md:w-[320px] lg:w-[380px] border-r border-border shrink-0 flex flex-col bg-background">
        <div className="px-4 py-3 border-b border-border flex-shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-9 w-full rounded-md" /> {/* Search input */}
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-border flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area Skeleton */}
      <div className="hidden md:flex flex-1 flex-col bg-slate-50/50">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 p-6 space-y-6 overflow-y-hidden">
          <div className="flex gap-3 max-w-[80%]">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className="h-20 w-64 rounded-2xl rounded-tl-sm" />
          </div>
          <div className="flex gap-3 max-w-[80%] ml-auto justify-end">
            <Skeleton className="h-16 w-48 rounded-2xl rounded-tr-sm" />
          </div>
          <div className="flex gap-3 max-w-[80%] ml-auto justify-end">
            <Skeleton className="h-24 w-72 rounded-2xl rounded-tr-sm" />
          </div>
          <div className="flex gap-3 max-w-[80%]">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className="h-12 w-56 rounded-2xl rounded-tl-sm" />
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-background border-t border-border shrink-0">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </motion.div>
  )
}
