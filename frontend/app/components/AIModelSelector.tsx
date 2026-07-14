"use client"

import { useState } from "react"

// CHANGED: Removed emojis, added 'icon' property for FontAwesome
const ARCHITECTURES = [
  { id: "yolo11n.pt", label: "YOLO 11 Nano", desc: "Fastest (CPU Friendly)", icon: "fa-bolt" },
  { id: "yolo11s.pt", label: "YOLO 11 Small", desc: "Balanced Speed/Acc", icon: "fa-scale-balanced" },
  { id: "yolo11m.pt", label: "YOLO 11 Medium", desc: "Strong (GPU Recommended)", icon: "fa-dumbbell" },
  { id: "yolo11x.pt", label: "YOLO 11 X-Large", desc: "Max Precision (High VRAM)", icon: "fa-gem" },
  { id: "custom", label: "Custom Model", desc: "Import your own .pt file", icon: "fa-folder-open" },
]

type Config = {
    architecture: string
    file: File | null
}

type AIModelSelectorProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: (config: Config) => void
}

export default function AIModelSelector({ isOpen, onClose, onConfirm }: AIModelSelectorProps) {
  const [step, setStep] = useState(1)
  const [selectedArch, setSelectedArch] = useState<string | null>(null)
  const [customFile, setCustomFile] = useState<File | null>(null)

  if (!isOpen) return null

  const handleArchSelect = (id: string) => {
    setSelectedArch(id)
    setStep(2)
    setCustomFile(null)
  }

  const handleConfirm = () => {
    if (!selectedArch) return

    if (selectedArch === "custom" && !customFile) {
        alert("Please upload a .pt weights file.")
        return
    }

    onConfirm({
        architecture: selectedArch,
        file: customFile
    })
    handleClose()
  }

  const handleClose = () => {
      setStep(1)
      setSelectedArch(null)
      setCustomFile(null)
      onClose()
  }

  const activeArch = ARCHITECTURES.find(a => a.id === selectedArch)

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <i className="fa fa-robot text-purple-500"></i> 
            {step === 1 ? "Select Intelligence Engine" : "Configure Engine"}
          </h3>
          <button onClick={handleClose} className="text-zinc-500 hover:text-white transition">
            <i className="fa fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          
          {/* STEP 1: ARCHITECTURE LIST */}
          {step === 1 && (
            <div className="grid gap-3">
              {ARCHITECTURES.map((arch) => (
                <button
                  key={arch.id}
                  onClick={() => handleArchSelect(arch.id)}
                  className="group flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/50 hover:border-purple-500 hover:bg-purple-500/10 transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon Box */}
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-purple-400 group-hover:border-purple-500/30 transition-colors">
                        <i className={`fa ${arch.icon}`}></i>
                    </div>
                    
                    <div>
                        <div className="text-zinc-200 font-bold group-hover:text-purple-400 transition-colors">
                            {arch.label}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                            {arch.desc}
                        </div>
                    </div>
                  </div>
                  
                  <i className="fa fa-chevron-right text-zinc-700 group-hover:text-purple-500 transition-transform group-hover:translate-x-1"></i>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2: CONFIGURATION */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
              
              <div className="flex items-center gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl">
                      <i className={`fa ${activeArch?.icon || 'fa-microchip'}`}></i>
                  </div>
                  <div>
                      <div className="text-xs text-zinc-500 uppercase font-bold">Selected Architecture</div>
                      <div className="text-white font-bold text-lg">{activeArch?.label}</div>
                  </div>
              </div>

              <div>
                  <label className="block text-sm text-zinc-400 mb-3 flex justify-between">
                      <span>Weights Configuration</span>
                      {selectedArch !== 'custom' && <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">Optional Override</span>}
                  </label>
                  
                  <div className="relative border-2 border-dashed border-zinc-700 hover:border-purple-500 hover:bg-zinc-800/30 rounded-xl p-8 text-center transition-all group cursor-pointer">
                    <input 
                      type="file" 
                      accept=".pt,.pth"
                      onChange={(e) => setCustomFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="pointer-events-none">
                        <i className={`fa ${customFile ? 'fa-check-circle text-purple-500' : 'fa-cloud-arrow-up text-zinc-600'} text-3xl mb-3 group-hover:scale-110 transition`}></i>
                        <p className={`text-sm font-medium ${customFile ? 'text-white' : 'text-zinc-400'}`}>
                          {customFile ? customFile.name : (selectedArch === 'custom' ? "Upload .pt file (Required)" : "Drop custom weights to override (Optional)")}
                        </p>
                    </div>
                  </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex justify-between items-center">
                <button onClick={() => setStep(1)} className="text-sm text-zinc-500 hover:text-white px-4">Back</button>
                <button 
                    onClick={handleConfirm}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-purple-900/20 transition-all active:scale-95 flex items-center gap-2"
                >
                    <i className="fa fa-power-off"></i>
                    <span>Load Engine</span>
                </button>
            </div>
        )}

      </div>
    </div>
  )
}