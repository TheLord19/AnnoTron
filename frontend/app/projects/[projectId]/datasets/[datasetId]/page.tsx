"use client"

import { useParams } from "next/navigation"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import axios from "axios"
import Link from "next/link"

// --- TYPES ---
// Boxes are stored normalized [0,1] relative to the image, matching the YOLO
// convention and the backend's storage format. Pixel conversion happens only
// at draw time / mouse-interaction time.
type ImageItem = { id: number; url: string; avg_confidence: number | null }
type Box = { x: number; y: number; w: number; h: number; class_id: number; confidence?: number }

function boxIoU(a: Box, b: Box) {
  const ax2 = a.x + a.w, ay2 = a.y + a.h
  const bx2 = b.x + b.w, by2 = b.y + b.h
  const interX1 = Math.max(a.x, b.x), interY1 = Math.max(a.y, b.y)
  const interX2 = Math.min(ax2, bx2), interY2 = Math.min(ay2, by2)
  const interW = Math.max(0, interX2 - interX1)
  const interH = Math.max(0, interY2 - interY1)
  const interArea = interW * interH
  const unionArea = a.w * a.h + b.w * b.h - interArea
  return unionArea > 0 ? interArea / unionArea : 0
}

function confidenceColor(c: number) {
  if (c < 0.5) return "text-red-400"
  if (c < 0.75) return "text-amber-400"
  return "text-emerald-400"
}

// --- CONSTANTS ---
const COLOR_PALETTE = [
  "#2dd4bf", "#a78bfa", "#fbbf24", "#f472b6",
  "#bef264", "#60a5fa", "#fb923c", "#c084fc",
  "#22d3ee", "#f87171", "#818cf8", "#34d399"
]

const AI_MODELS = [
  { id: 'yolo11n.pt', name: 'YOLO11 Nano', speed: 'Fastest', accuracy: 'Low' },
  { id: 'yolo11s.pt', name: 'YOLO11 Small', speed: 'Fast', accuracy: 'Balanced' },
  { id: 'yolo11m.pt', name: 'YOLO11 Medium', speed: 'Moderate', accuracy: 'High' },
  { id: 'yolo11l.pt', name: 'YOLO11 Large', speed: 'Slow', accuracy: 'Very High' },
  { id: 'yolo11x.pt', name: 'YOLO11 X-Large', speed: 'Slowest', accuracy: 'Elite' },
  { id: 'custom', name: 'Custom Weights', speed: 'Varies', accuracy: 'Specialized' },
]

export default function AnnotationStudio() {
  const params = useParams()
  const projectId = params.projectId
  const datasetId = params.datasetId

  // Data State
  const [images, setImages] = useState<ImageItem[]>([])
  const [index, setIndex] = useState(0)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // AI State
  const [isAutoAnnotating, setIsAutoAnnotating] = useState(false)
  const [selectedModel, setSelectedModel] = useState("yolo11n.pt")
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [hwWarning, setHwWarning] = useState<string | null>(null)
  const [isUploadingModel, setIsUploadingModel] = useState(false)
  const [reviewPriority, setReviewPriority] = useState(false)

  // UI State
  const [imageLoaded, setImageLoaded] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedTool, setSelectedTool] = useState<"select" | "box">("box")
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null)

  // Classes
  const [classes, setClasses] = useState([
    { id: 0, name: "Class 0", color: COLOR_PALETTE[0] },
    { id: 1, name: "Class 1", color: COLOR_PALETTE[1] },
    { id: 2, name: "Class 2", color: COLOR_PALETTE[2] },
    { id: 3, name: "Class 3", color: COLOR_PALETTE[3] },
  ])
  const [activeClassId, setActiveClassId] = useState(0)

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const API_URL = "http://localhost:5003/api"

  // --- 1. DATA LOADING ---
  useEffect(() => {
    const init = async () => {
      try {
        const res = await axios.get(`${API_URL}/images/dataset/${datasetId}`)
        setImages(res.data)
      } catch (err) {
        console.error("Failed to load images", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [datasetId])

  // Review-priority mode surfaces the images the AI was least confident about
  // first, so a human reviews/corrects the shakiest predictions before the rest.
  const orderedImages = useMemo(() => {
    if (!reviewPriority) return images
    const withConf = images.filter(i => i.avg_confidence !== null && i.avg_confidence !== undefined)
    const withoutConf = images.filter(i => i.avg_confidence === null || i.avg_confidence === undefined)
    withConf.sort((a, b) => (a.avg_confidence as number) - (b.avg_confidence as number))
    return [...withConf, ...withoutConf]
  }, [images, reviewPriority])

  const toggleReviewPriority = () => {
    setReviewPriority(v => !v)
    setIndex(0)
  }

  useEffect(() => {
    if (orderedImages.length === 0) return
    setBoxes([])
    setImageLoaded(false)
    setMousePos(null)

    if (imgRef.current && imgRef.current.complete) {
      setImageLoaded(true)
    }

    const loadBoxes = async () => {
      try {
        const res = await axios.get(`${API_URL}/annotations/get/${datasetId}/${orderedImages[index].id}`)
        if (res.data.boxes) setBoxes(res.data.boxes)
      } catch (e) { /* Ignore 404 */ }
    }
    loadBoxes()
  }, [index, orderedImages, datasetId])

  // --- 2. CANVAS ENGINE ---
  useEffect(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !imageLoaded) return

    canvas.width = img.clientWidth
    canvas.height = img.clientHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Guides
    if (selectedTool === "box" && mousePos) {
      ctx.beginPath()
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; ctx.lineWidth = 2; ctx.setLineDash([6, 6])
      ctx.moveTo(mousePos.x, 0); ctx.lineTo(mousePos.x, canvas.height)
      ctx.moveTo(0, mousePos.y); ctx.lineTo(canvas.width, mousePos.y)
      ctx.stroke(); ctx.setLineDash([]); ctx.closePath()
    }

    // Boxes (stored normalized [0,1] -> convert to canvas pixels for drawing)
    boxes.forEach((box, i) => {
      const b = { x: box.x * canvas.width, y: box.y * canvas.height, w: box.w * canvas.width, h: box.h * canvas.height }
      const cls = classes.find(c => c.id === box.class_id)
      const colorHex = cls ? cls.color : "#ffffff"
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "255, 255, 255"
      }

      ctx.fillStyle = `rgba(${hexToRgb(colorHex)}, 0.2)`; ctx.fillRect(b.x, b.y, b.w, b.h)
      ctx.strokeStyle = colorHex; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h)
      const hS = 4; ctx.fillStyle = "#fff"
      ctx.fillRect(b.x - hS, b.y - hS, hS * 2, hS * 2); ctx.fillRect(b.x + b.w - hS, b.y + b.h - hS, hS * 2, hS * 2)
      ctx.fillRect(b.x + b.w - hS, b.y - hS, hS * 2, hS * 2); ctx.fillRect(b.x - hS, b.y + b.h - hS, hS * 2, hS * 2)

      ctx.fillStyle = colorHex; ctx.fillRect(b.x, b.y - 20, 24, 20)
      ctx.fillStyle = "#000"; ctx.font = "bold 12px sans-serif"; ctx.fillText(`${box.class_id}`, b.x + 8, b.y - 6)
    })
  }, [boxes, index, imageLoaded, mousePos, selectedTool, classes])

  // --- 3. LOGIC ---

  const handleSelectModel = async (modelId: string) => {
    setSelectedModel(modelId)
    setShowModelMenu(false)
    setHwWarning(null)

    if (modelId === 'custom') return;

    try {
      const res = await axios.post(`${API_URL}/ai/load`, {
        architecture: modelId
      })
      if (res.data.warning) setHwWarning(res.data.warning)
    } catch (err) {
      console.error("Model load failed", err)
    }
  }

  const handleAutoAnnotate = async () => {
    if (orderedImages.length === 0) return
    setIsAutoAnnotating(true)
    setShowModelMenu(false)

    try {
      const res = await axios.post(`${API_URL}/annotations/auto`, {
        dataset_id: datasetId,
        image_id: orderedImages[index].id,
        model: selectedModel
      })
      const IOU_THRESHOLD = 0.5
      const proposals: Box[] = res.data.boxes || []
      // Drop proposals that overlap an existing box heavily so re-running
      // auto-annotate (or running it after manual edits) doesn't duplicate boxes.
      const newBoxes = proposals.filter(nb => !boxes.some(existing => boxIoU(existing, nb) > IOU_THRESHOLD))

      if (newBoxes.length > 0) {
        setBoxes(prev => [...prev, ...newBoxes])
      } else if (proposals.length > 0) {
        alert(`Model (${selectedModel}) found ${proposals.length} object(s), all already covered by existing boxes.`)
      } else {
        alert(`Model (${selectedModel}) detected 0 objects.`)
      }
    } catch (err: any) {
      console.error("Auto Annotation Failed", err)
      alert(err.response?.data?.error || "AI Engine Failed")
    } finally {
      setIsAutoAnnotating(false)
    }
  }

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append("file", file)
    formData.append("architecture", "custom")
    formData.append("useDefaultWeights", "false")

    setIsUploadingModel(true)
    try {
      await axios.post(`${API_URL}/ai/load`, formData)
      alert("✅ Custom weights uploaded! Select 'Custom' to use them.")
      setSelectedModel("custom")
      setShowModelMenu(false)
    } catch (err: any) {
      alert(`Upload Failed: ${err.response?.data?.error || err.message}`)
    } finally {
      setIsUploadingModel(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleAddClass = () => {
    const nextId = classes.length
    const nextColor = COLOR_PALETTE[nextId % COLOR_PALETTE.length]
    setClasses([...classes, { id: nextId, name: `Class ${nextId}`, color: nextColor }])
    setActiveClassId(nextId)
  }

  const saveAndNext = useCallback(async () => {
    if (orderedImages.length === 0) return
    setSaving(true)
    try {
      await axios.post(`${API_URL}/annotations/save`, {
        dataset_id: Number(datasetId),
        image_id: Number(orderedImages[index].id),
        boxes,
      })
      setTimeout(() => {
        setSaving(false)
        if (index < orderedImages.length - 1) setIndex(prev => prev + 1)
        else alert("Dataset Completed!")
      }, 200)
    } catch (err: any) {
      setSaving(false)
      alert(`Save Failed: ${err.response?.data?.error || err.message}`)
    }
  }, [boxes, datasetId, orderedImages, index])

  // Mouse Handlers
  const onMouseMove = (e: React.MouseEvent) => {
    if (selectedTool !== 'box') return
    const rect = canvasRef.current!.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }
  const onMouseLeave = () => setMousePos(null)

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    if (selectedTool !== "box") return
    const rect = canvasRef.current!.getBoundingClientRect()
    startRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onMouseUp = (e: React.MouseEvent) => {
    if (!startRef.current) return
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const startX = startRef.current.x; const startY = startRef.current.y
    const currX = e.clientX - rect.left; const currY = e.clientY - rect.top
    const wPx = Math.abs(currX - startX); const hPx = Math.abs(currY - startY)
    const xPx = Math.min(startX, currX); const yPx = Math.min(startY, currY)
    if (wPx > 5 && hPx > 5) {
      setBoxes([...boxes, {
        x: xPx / canvas.width, y: yPx / canvas.height,
        w: wPx / canvas.width, h: hPx / canvas.height,
        class_id: activeClassId,
      }])
    }
    startRef.current = null
  }

  const deleteBox = (idx: number) => setBoxes(boxes.filter((_, i) => i !== idx))

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === "Enter") saveAndNext()
      if (e.key === "d" || e.key === "ArrowRight") if (index < orderedImages.length - 1) setIndex(i => i + 1)
      if (e.key === "a" || e.key === "ArrowLeft") if (index > 0) setIndex(i => i - 1)
      if (e.key === "b") setSelectedTool("box")
      if (e.key === "v") setSelectedTool("select")
      if ((e.metaKey || e.ctrlKey) && e.key === "z") setBoxes(b => b.slice(0, -1))
      if (e.key === "m") handleAutoAnnotate()
      const num = parseInt(e.key)
      if (!isNaN(num) && num < classes.length) setActiveClassId(num)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [saveAndNext, index, orderedImages.length, handleAutoAnnotate, classes.length])

  if (loading) return <div className="h-screen w-full bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono animate-pulse">LOADING STUDIO...</div>
  if (images.length === 0) return <div className="p-12 text-white">No images found.</div>

  const progress = Math.round(((index + 1) / orderedImages.length) * 100)
  const isAnnotated = boxes.length > 0
  const activeColor = classes.find(c => c.id === activeClassId)?.color || "#2dd4bf"
  const currentConfidence = orderedImages[index]?.avg_confidence

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-200 flex flex-col overflow-hidden font-sans selection:bg-teal-500/30">
      <input type="file" ref={fileInputRef} className="hidden" accept=".pt" onChange={handleModelUpload} />

      {/* HEADER */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="AnnoTron" className="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
          <div>
            <div className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Dataset #{datasetId}</div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-100">Annotation Studio</span>
              <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded-full border border-zinc-700">v1.4</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 w-1/3">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400"><span>PROGRESS</span><span className="text-white">{progress}%</span></div>
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-teal-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="flex items-center gap-6">
          {currentConfidence !== null && currentConfidence !== undefined && (
            <div className="text-xs font-mono flex items-center gap-2" title="Average AI confidence for this image's boxes">
              <i className="fa fa-wand-magic-sparkles text-zinc-600"></i>
              <span className={confidenceColor(currentConfidence)}>{Math.round(currentConfidence * 100)}% AI confidence</span>
            </div>
          )}
          <button
            onClick={toggleReviewPriority}
            title="Sort images by lowest AI confidence first, so the least certain predictions get reviewed first"
            className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold transition ${reviewPriority ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'}`}
          >
            <i className="fa fa-sort-amount-down"></i>
            <span>Review Priority</span>
          </button>
          <div className="flex items-center gap-3 bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-800">
            <div className="text-sm font-mono text-zinc-400"><span className="text-white font-bold">{index + 1}</span> <span className="mx-1">/</span> {orderedImages.length}</div>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${isAnnotated ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/50' : 'bg-zinc-800 text-zinc-600'}`}><i className="fa fa-check text-[10px]"></i></div>
          </div>
          <Link href={`/projects/${projectId}`} className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-red-500 hover:text-white border border-zinc-700 hover:border-red-500 flex items-center justify-center transition-all duration-300 group">
            <i className="fa fa-xmark text-zinc-400 group-hover:text-white text-lg transition-transform duration-300 group-hover:rotate-90 origin-center"></i>
          </Link>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {hwWarning && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-amber-500/10 backdrop-blur-md border border-amber-500/50 text-amber-200 px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in">
            <i className="fa fa-triangle-exclamation text-amber-500"></i>
            <span className="text-xs font-medium">{hwWarning}</span>
            <button onClick={() => setHwWarning(null)} className="hover:text-white transition"><i className="fa fa-times"></i></button>
          </div>
        )}

        {/* LEFT TOOLBAR */}
        <aside className="w-16 border-r border-zinc-800 bg-zinc-900/30 flex flex-col items-center py-6 gap-4 shrink-0 z-10 relative">
          <ToolBtn icon="mouse-pointer" active={selectedTool === "select"} onClick={() => setSelectedTool("select")} title="Select (V)" />
          <ToolBtn icon="vector-square" active={selectedTool === "box"} onClick={() => setSelectedTool("box")} title="Box Tool (B)" />
          <div className="w-8 h-[1px] bg-zinc-800 my-2"></div>

          <div className="relative group">
            <button
              onClick={handleAutoAnnotate}
              disabled={isAutoAnnotating}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${isAutoAnnotating ? 'bg-purple-600 text-white animate-pulse' : 'text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 border border-purple-500/20'}`}
            >
              {isAutoAnnotating ? <i className="fa fa-circle-notch fa-spin"></i> : <i className="fa fa-wand-magic-sparkles"></i>}
            </button>
            <button onClick={() => setShowModelMenu(!showModelMenu)} className="absolute -bottom-2 -right-2 w-5 h-5 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center text-[8px] text-zinc-400 hover:text-white hover:border-zinc-500">
              <i className="fa fa-chevron-down"></i>
            </button>
            {showModelMenu && (
              <div className="absolute left-14 top-0 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-left-2">
                <div className="text-[10px] font-bold text-zinc-500 uppercase px-2 mb-2 flex justify-between items-center">
                  <span>Select AI Engine</span>
                  <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingModel} className="text-purple-400 hover:text-purple-300 text-[9px] border border-purple-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                    {isUploadingModel ? <i className="fa fa-spinner fa-spin"></i> : <i className="fa fa-upload"></i>}
                    <span>UPLOAD .PT</span>
                  </button>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                  {AI_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectModel(m.id)}
                      className={`w-full text-left p-2 rounded-lg transition-all ${selectedModel === m.id ? 'bg-purple-500/20 border-purple-500/50 border' : 'hover:bg-zinc-800 border-transparent border'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-[11px] font-bold ${selectedModel === m.id ? 'text-purple-300' : 'text-zinc-300'}`}>{m.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-zinc-500">{m.speed}</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 mt-0.5">Accuracy: {m.accuracy}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-8 h-[1px] bg-zinc-800 my-2"></div>
          <ToolBtn icon="undo" onClick={() => setBoxes(b => b.slice(0, -1))} title="Undo (Ctrl+Z)" />
        </aside>

        {/* CENTER CANVAS */}
        <main className="flex-1 bg-[#09090b] relative flex flex-col items-center justify-center p-6 overflow-hidden" ref={containerRef}>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          <div className="relative shadow-2xl shadow-black border border-zinc-800/50 rounded-sm overflow-hidden bg-black select-none" style={{ cursor: (selectedTool === 'box' && mousePos) ? 'none' : 'crosshair' }}>
            <img ref={imgRef} src={orderedImages[index].url} alt="Target" className="max-h-[65vh] max-w-[70vw] block select-none pointer-events-none" onLoad={() => setImageLoaded(true)} />
            <canvas ref={canvasRef} className="absolute inset-0 touch-none select-none" onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} />
          </div>
          <div className="mt-8 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500 z-20">
            <button onClick={() => index > 0 && setIndex(i => i - 1)} className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition flex items-center justify-center"><i className="fa fa-chevron-left"></i></button>
            <button onClick={saveAndNext} disabled={saving} style={{ backgroundColor: activeColor }} className="h-12 px-8 text-black font-bold rounded-xl shadow-lg flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110">
              {saving ? <i className="fa fa-spinner fa-spin"></i> : <span>CONFIRM & NEXT</span>}
              <span className="bg-black/10 px-1.5 py-0.5 rounded text-[10px] font-mono opacity-60">ENTER</span>
            </button>
            <button onClick={() => index < orderedImages.length - 1 && setIndex(i => i + 1)} className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition flex items-center justify-center"><i className="fa fa-chevron-right"></i></button>
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} border-l border-zinc-800 bg-zinc-900/30 transition-all duration-300 flex flex-col shrink-0`}>
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Active Class</div>
              <button onClick={handleAddClass} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded transition">+ Add</button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {classes.map((cls) => (
                <button key={cls.id} onClick={() => setActiveClassId(cls.id)} className={`flex items-center gap-2 p-2 rounded border text-xs font-medium transition-all ${activeClassId === cls.id ? 'bg-zinc-800 border-zinc-600 text-white ring-1 ring-inset ring-white/10' : 'bg-transparent border-zinc-800 text-zinc-500 hover:bg-zinc-800/50'}`}>
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cls.color }}></div><span className="truncate">{cls.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 bg-zinc-900/50">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Objects</span><span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">{boxes.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {boxes.map((box, i) => {
              const cls = classes.find(c => c.id === box.class_id)
              const color = cls ? cls.color : "#fff"
              const canvas = canvasRef.current
              const pxW = canvas ? Math.round(box.w * canvas.width) : 0
              const pxH = canvas ? Math.round(box.h * canvas.height) : 0
              return (
                <div key={i} className="group flex items-center gap-3 bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-600 p-3 rounded-lg transition-all">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold font-mono text-black" style={{ backgroundColor: color }}>{box.class_id}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-zinc-200">Class {box.class_id}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {pxW} x {pxH}
                      {box.confidence !== undefined && box.confidence < 1 && (
                        <span className={`ml-2 ${confidenceColor(box.confidence)}`}>{Math.round(box.confidence * 100)}% AI</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteBox(i)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-400 transition"><i className="fa fa-times"></i></button>
                </div>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}

function ToolBtn({ icon, active, onClick, title }: any) {
  return (
    <button onClick={onClick} title={title} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${active ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}>
      <i className={`fa fa-${icon}`}></i>
    </button>
  )
}