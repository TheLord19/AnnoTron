"use client"

import { useParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import axios from "axios"
import Link from "next/link"

// --- TYPES ---
type Dataset = {
  id: number
  name: string
  image_count: number
  annotated_count: number
  created_at: string
}

type Project = {
  id: number
  name: string
  description: string
  created_at: string
}

const API_URL = "http://localhost:5003/api"

export default function ProjectDashboard() {
  const params = useParams()
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId
  const projectIdNum = Number(projectId)

  // --- STATE ---
  const [project, setProject] = useState<Project | null>(null)
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [systemStatus, setSystemStatus] = useState<"online" | "offline" | "checking">("checking")

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalStep, setModalStep] = useState<"name" | "choice" | "upload">("name")

  // Creation/Upload State
  const [newDatasetName, setNewDatasetName] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- 1. HEALTH CHECK ---
  const checkSystemHealth = async () => {
    try {
      await axios.get(`${API_URL}/projects`)
      setSystemStatus("online")
    } catch {
      setSystemStatus("offline")
    }
  }

  useEffect(() => {
    checkSystemHealth()
    const interval = setInterval(checkSystemHealth, 5000)
    return () => clearInterval(interval)
  }, [])

  // --- 2. DATA LOADING ---
  const fetchData = async () => {
    if (!projectIdNum || Number.isNaN(projectIdNum)) return
    try {
      const pRes = await axios.get(`${API_URL}/projects/${projectIdNum}`)
      setProject(pRes.data)

      const dRes = await axios.get(`${API_URL}/datasets/project/${projectIdNum}`)
      setDatasets(dRes.data)
    } catch (err: any) {
      console.error("DASHBOARD LOAD ERROR:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [projectIdNum])

  // --- 3. CREATE & UPLOAD LOGIC ---
  const handleCreateEmpty = async () => {
    if (!newDatasetName.trim()) return
    setIsCreating(true)
    try {
      await axios.post(`${API_URL}/datasets/create`, {
        project_id: projectIdNum,
        name: newDatasetName,
      })
      await fetchData()
      closeModal()
    } catch (err: any) {
      alert("Failed to create empty dataset.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleUploadAndCreate = async () => {
    if (!newDatasetName.trim() || files.length === 0) return
    setIsCreating(true)
    try {
      // 1. Create Dataset
      const dsRes = await axios.post(`${API_URL}/datasets/create`, {
        project_id: projectIdNum,
        name: newDatasetName,
      })
      const datasetId = dsRes.data.id

      // 2. Upload Images
      const formData = new FormData()
      formData.append("dataset_id", datasetId.toString())
      files.forEach(f => formData.append("files", f))

      await axios.post(`${API_URL}/images/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })

      await fetchData()
      closeModal()
    } catch (err: any) {
      alert("Failed during creation/upload sequence.")
    } finally {
      setIsCreating(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setModalStep("name")
    setNewDatasetName("")
    setFiles([])
  }

  // --- STATS ---
  const totalImages = datasets.reduce((acc, d) => acc + (d.image_count || 0), 0)
  const totalAnnotated = datasets.reduce((acc, d) => acc + (d.annotated_count || 0), 0)
  const progress = totalImages > 0 ? Math.round((totalAnnotated / totalImages) * 100) : 0

  if (loading) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono animate-pulse">
        CONNECTING TO MISSION CONTROL...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans overflow-x-hidden p-8">

      {/* --- TOP NAV --- */}
      <nav className="max-w-6xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-6">
          <Link href="/" className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition group shadow-lg">
            <i className="fa fa-arrow-left group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{project?.name || "Project Dashboard"}</h1>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">Status: {systemStatus}</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 shadow-xl shadow-blue-900/20 active:scale-95"
        >
          <i className="fa fa-plus-circle" />
          <span>New Dataset</span>
        </button>
      </nav>

      <main className="max-w-6xl mx-auto">
        {/* STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard label="Total Images" value={totalImages} icon="images" color="text-blue-400" />
          <StatCard label="Annotated" value={totalAnnotated} icon="check-double" color="text-emerald-400" />
          <StatCard label="Overall Progress" value={`${progress}%`} icon="chart-line" color="text-purple-400" />
        </div>

        {/* DATASETS GRID */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <i className="fa fa-database text-zinc-600"></i> Datasets
          </h2>

          {datasets.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-zinc-900 rounded-3xl text-zinc-600 bg-zinc-900/20">
              <i className="fa fa-folder-open text-4xl mb-4 opacity-20"></i>
              <p>No datasets found in this project.</p>
              <button onClick={() => setIsModalOpen(true)} className="text-blue-400 hover:underline mt-2">Create your first one</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {datasets.map(d => {
                const dsProgress = d.image_count > 0 ? Math.round((d.annotated_count / d.image_count) * 100) : 0
                return (
                  <Link key={d.id} href={`/projects/${projectId}/datasets/${d.id}`}>
                    <div className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-500 p-6 rounded-2xl transition-all group cursor-pointer hover:shadow-2xl hover:shadow-black">
                      <div className="flex justify-between items-start mb-6">
                        <div className="text-lg font-bold text-zinc-200 group-hover:text-white transition-colors">{d.name}</div>
                        <i className="fa fa-arrow-right text-zinc-700 group-hover:text-white transition-all transform -rotate-45 group-hover:rotate-0"></i>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] uppercase font-mono text-zinc-500 mb-1">
                          <span>Progress</span>
                          <span>{dsProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${dsProgress}%` }}></div>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">
                        <div className="flex items-center gap-2">
                          <i className="fa fa-images"></i>
                          <span>{d.image_count}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="fa fa-check-circle"></i>
                          <span>{d.annotated_count} Done</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* --- MODAL OVERLAY --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">New Dataset</h3>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white transition">
                <i className="fa fa-xmark" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8">
              {modalStep === "name" && (
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-mono uppercase text-zinc-500 mb-2 block">Dataset Name</label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="e.g. Surveillance Footage"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-blue-500 transition"
                      value={newDatasetName}
                      onChange={e => setNewDatasetName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && newDatasetName.trim() && setModalStep("choice")}
                    />
                  </div>
                  <button
                    disabled={!newDatasetName.trim()}
                    onClick={() => setModalStep("choice")}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition shadow-xl shadow-blue-600/10 active:scale-[0.98] disabled:opacity-30"
                  >
                    Continue
                  </button>
                </div>
              )}

              {modalStep === "choice" && (
                <div className="space-y-4">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                      <i className="fa fa-images text-2xl text-blue-500"></i>
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2">Populate your dataset</h4>
                    <p className="text-sm text-zinc-500">How would you like to start this dataset?</p>
                  </div>

                  <button
                    onClick={() => setModalStep("upload")}
                    className="w-full bg-zinc-800 hover:bg-blue-600 text-white text-left p-4 rounded-2xl transition group flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold">Upload Images Now</div>
                      <div className="text-xs text-zinc-400 group-hover:text-blue-100 italic transition-colors">Start annotating immediately</div>
                    </div>
                    <i className="fa fa-upload text-zinc-500 group-hover:text-white" />
                  </button>

                  <button
                    onClick={handleCreateEmpty}
                    disabled={isCreating}
                    className="w-full bg-zinc-950 border border-zinc-800 hover:border-red-500/50 text-left p-4 rounded-2xl transition group flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-zinc-400 group-hover:text-red-400">Create Empty</div>
                      <div className="text-xs text-zinc-600">A dataset without images isn't helpful.</div>
                    </div>
                    <i className="fa fa-ghost text-zinc-800 group-hover:text-red-900 transition-colors" />
                  </button>
                </div>
              )}

              {modalStep === "upload" && (
                <div className="space-y-6">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      if (e.dataTransfer.files) setFiles(Array.from(e.dataTransfer.files))
                    }}
                    className="border-2 border-dashed border-zinc-800 rounded-3xl p-10 text-center cursor-pointer hover:bg-zinc-800/50 transition group"
                  >
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      ref={fileInputRef}
                      onChange={e => e.target.files && setFiles(Array.from(e.target.files))}
                    />
                    <div className="w-12 h-12 bg-zinc-950 rounded-xl flex items-center justify-center mx-auto mb-4 border border-zinc-800 group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition">
                      <i className="fa fa-cloud-arrow-up text-zinc-600 group-hover:text-blue-400 transition" />
                    </div>
                    <p className="text-sm text-zinc-400">Drag & drop files or <span className="text-blue-400">browse</span></p>
                    {files.length > 0 && (
                      <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-emerald-500 text-xs font-bold">
                        {files.length} images selected
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setModalStep("choice")}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition"
                    >
                      Back
                    </button>
                    <button
                      disabled={files.length === 0 || isCreating}
                      onClick={handleUploadAndCreate}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-30"
                    >
                      {isCreating ? <i className="fa fa-spinner fa-spin"></i> : "Create & Upload"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl flex items-center gap-6 shadow-lg shadow-black/20">
      <div className={`w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center text-2xl ${color} border border-zinc-800/50 shadow-inner`}>
        <i className={`fa fa-${icon}`} />
      </div>
      <div>
        <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest mb-1">{label}</div>
        <div className="text-3xl font-bold text-white font-mono tracking-tighter">{value}</div>
      </div>
    </div>
  )
}