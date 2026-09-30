"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ArrowRight } from "lucide-react"

export default function MotionDemoPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showList, setShowList] = useState(false)
  const [showModal, setShowModal] = useState(false)
  
  // Page Transition Demo State
  const [transitionType, setTransitionType] = useState("blur")
  const [mockPageKey, setMockPageKey] = useState(0)

  // Simulation for loading
  const handleSimulateLoad = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 2000)
  }

  // List variants for staggering
  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  }

  const listItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  // Different Page Transition Options
  const pageTransitions: Record<string, any> = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.4 }
    },
    slideUp: {
      initial: { opacity: 0, y: 40 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4, ease: "easeOut" }
    },
    slideRight: {
      initial: { opacity: 0, x: -40 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.4, ease: "easeOut" }
    },
    scaleUp: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.4, ease: "easeOut" }
    },
    blur: {
      initial: { opacity: 0, y: 15, filter: "blur(8px)" },
      animate: { opacity: 1, y: 0, filter: "blur(0px)" },
      transition: { duration: 0.4, ease: "easeOut" }
    },
    spring: {
      initial: { opacity: 0, scale: 0.9, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      transition: { type: "spring", bounce: 0.4, duration: 0.8 }
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12 h-screen overflow-y-auto pb-32">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-slate-800">Framer Motion Demo</h1>
        <p className="text-slate-500 mt-2">
          Interactive examples of common loading transitions and animations.
        </p>
      </div>

      {/* NEW: Demo 4: Page Transitions Options */}
      <section className="bg-white p-6 rounded-xl shadow-sm border space-y-6 border-indigo-200">
        <div>
          <h2 className="text-xl font-semibold text-indigo-700">Page Transition Styles (template.tsx)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Choose a style and click "Simulate Navigation" to see how the page content would enter.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {Object.keys(pageTransitions).map((type) => (
            <button
              key={type}
              onClick={() => setTransitionType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                transitionType === type
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <button
          onClick={() => setMockPageKey((prev) => prev + 1)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Simulate Navigation <ArrowRight className="w-4 h-4" />
        </button>

        {/* Mock Page Content area to show the transition */}
        <div className="h-48 border-2 border-dashed border-indigo-100 rounded-lg bg-indigo-50/30 p-6 overflow-hidden relative">
          {/* Key forces React to destroy and recreate the element, triggering 'initial' -> 'animate' */}
          <motion.div
            key={mockPageKey}
            initial={pageTransitions[transitionType].initial}
            animate={pageTransitions[transitionType].animate}
            transition={pageTransitions[transitionType].transition}
            className="w-full h-full bg-white rounded-lg shadow-sm border p-6 flex flex-col justify-center"
          >
            <h3 className="text-lg font-bold text-slate-800">
              Mock Page Content ({transitionType})
            </h3>
            <p className="text-slate-500 mt-2">
              This represents the content of the page (like your Settings or Dashboard) loading in.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Demo 1: Smooth Loader */}
      <section className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        <h2 className="text-xl font-semibold">1. Smooth Spinner / Loading State</h2>
        <p className="text-sm text-slate-500">
          Click the button to simulate a loading state that smoothly fades in and out.
        </p>
        <button
          onClick={handleSimulateLoad}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Simulate 2s Load
        </button>

        <div className="h-40 border-2 border-dashed rounded-lg bg-slate-50 flex items-center justify-center relative overflow-hidden">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-blue-600"
              >
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <span className="text-sm font-medium">Memuat data...</span>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-slate-600 font-medium"
              >
                Data berhasil dimuat! 🎉
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Demo 2: Staggered List Loading */}
      <section className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        <h2 className="text-xl font-semibold">2. Staggered List</h2>
        <button
          onClick={() => setShowList(!showList)}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {showList ? "Sembunyikan List" : "Tampilkan List Data"}
        </button>

        <div className="h-64 border-2 border-dashed rounded-lg bg-slate-50 p-4 overflow-hidden">
          <AnimatePresence>
            {showList && (
              <motion.div
                variants={listContainerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="space-y-3"
              >
                {[1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    variants={listItemVariants}
                    className="bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {i}
                      </div>
                      <div>
                        <div className="font-medium">Client {i}</div>
                        <div className="text-xs text-slate-500">Menunggu respons...</div>
                      </div>
                    </div>
                    <div className="h-8 w-20 bg-slate-100 rounded-md animate-pulse" />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Demo 3: Modal Entry/Exit */}
      <section className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        <h2 className="text-xl font-semibold">3. Smooth Modal Popup</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Buka Modal
        </button>

        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4"
              >
                <h3 className="text-xl font-bold mb-2">Simpan Perubahan?</h3>
                <p className="text-slate-500 mb-6">
                  Ini adalah contoh animasi menggunakan Framer Motion yang memberikan kesan aplikasi yang responsif dan premium.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg transition-colors font-medium"
                  >
                    Simpan
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}
