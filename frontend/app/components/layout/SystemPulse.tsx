"use client"

import { useEffect, useState } from "react"
import axios from "axios"

type Mode = "offline" | "cpu" | "gpu"

export default function SystemPulse() {
  const [mode, setMode] = useState<Mode>("offline")

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/system/pulse")
      .then((res) => {
        setMode(res.data.mode === "gpu" ? "gpu" : "cpu")
      })
      .catch(() => setMode("offline"))
  }, [])

  const color =
    mode === "gpu"
      ? "bg-purple-500"
      : mode === "cpu"
      ? "bg-green-500"
      : "bg-red-500"

  const label =
    mode === "gpu"
      ? "Turbo Mode (GPU)"
      : mode === "cpu"
      ? "Standard Mode (CPU)"
      : "System Offline"

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-300">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  )
}

