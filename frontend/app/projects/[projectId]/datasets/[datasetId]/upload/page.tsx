"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useRef } from "react"
import axios from "axios"
import Link from "next/link"

export default function UploadPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId
  const datasetId = params.datasetId
  const API_URL = "http://localhost:5000/api"

  // State
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ [key: string]: number }>({}) // Track % per file
  const [completed, setCompleted] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- HANDLERS ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Convert FileList to Array
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const startUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setCompleted(0)

    // Upload files sequentially (or you could do Promise.all for parallel)
    for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("dataset_id", datasetId as string)

        try {
            await axios.post(`${API_URL}/images/upload`, formData, {
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
                    setProgress(prev => ({ ...prev, [file.name]: percent }))
                }
            })
            setCompleted(prev => prev + 1)
        } catch (err) {
            console.error(`Failed to upload ${file.name}`, err)
            setProgress(prev => ({ ...prev, [file.name]: -1 })) // -1 indicates error
        }
    }
    
    setUploading(false)
    alert("Upload Complete!")
    router.push(`/projects/${projectId}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-cyan-500/30">
      
      {/* HEADER */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
             <Link href={`/projects/${projectId}`} className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition">
                <i className="fa fa-arrow-left"></i>
            </Link>
            <div className="h-6 w-[1px] bg-zinc-800"></div>
            <div className="flex items-center gap-3">
                 <img 
                    src="/logo.png" 
                    alt="AnnoTron" 
                    className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" 
                 />
                 <span className="font-bold text-zinc-100">Upload Center</span>
            </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-4xl mx-auto p-8">
        
        {/* DROP ZONE */}
        <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-900/50 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all group mb-8"
        >
            <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect} 
            />
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-600 group-hover:text-cyan-400 group-hover:scale-110 transition mb-4">
                <i className="fa fa-cloud-arrow-up text-3xl"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Click or Drag Images Here</h3>
            <p className="text-zinc-500">Supports JPG, PNG</p>
        </div>

        {/* FILE LIST */}
        {files.length > 0 && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <span className="font-bold text-zinc-400 text-sm uppercase tracking-wider">Queue ({files.length})</span>
                    <button 
                        onClick={startUpload}
                        disabled={uploading}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {uploading ? <i className="fa fa-spinner fa-spin"></i> : <i className="fa fa-upload"></i>}
                        <span>Start Upload</span>
                    </button>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto">
                    {files.map((file, i) => {
                        const p = progress[file.name]
                        let statusColor = "text-zinc-500"
                        let statusIcon = "fa-circle"
                        
                        if (p === 100) { statusColor = "text-emerald-500"; statusIcon = "fa-check-circle" }
                        else if (p === -1) { statusColor = "text-red-500"; statusIcon = "fa-exclamation-circle" }
                        else if (p > 0) { statusColor = "text-cyan-500"; statusIcon = "fa-spinner fa-spin" }

                        return (
                            <div key={i} className="flex items-center justify-between p-3 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-black rounded flex items-center justify-center border border-zinc-800 text-zinc-600">
                                        <i className="fa fa-image"></i>
                                    </div>
                                    <div className="text-sm text-zinc-300 truncate max-w-[300px]">{file.name}</div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    {/* Progress Bar */}
                                    {uploading && p !== undefined && p !== -1 && (
                                        <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${p}%` }}></div>
                                        </div>
                                    )}
                                    
                                    <i className={`fa ${statusIcon} ${statusColor}`}></i>
                                    
                                    {!uploading && (
                                        <button onClick={() => removeFile(i)} className="text-zinc-600 hover:text-red-500 px-2">
                                            <i className="fa fa-times"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}

      </main>
    </div>
  )
}