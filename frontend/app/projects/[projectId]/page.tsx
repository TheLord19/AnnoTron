// "use client"

// import { useParams } from "next/navigation"
// import { useEffect, useState, Fragment } from "react"
// import axios from "axios"

// import Sidebar from "@/app/components/layout/Sidebar"
// import SystemPulse from "@/app/components/layout/SystemPulse"

// import { Dialog, Transition } from "@headlessui/react"

// type Dataset = {
//   id: number
//   name: string
//   total: number
//   annotated: number
//   skipped: number
//   unannotated: number
// }


// export default function ProjectPage() {
//   const params = useParams()
//   const projectId = params.projectId as string

//   // ---------------- STATE ----------------
//   const [files, setFiles] = useState<File[]>([])
//   const [datasets, setDatasets] = useState<Dataset[]>([])

//   const [showModal, setShowModal] = useState(false)
//   const [datasetMode, setDatasetMode] = useState<"new" | "existing">("new")
//   const [newDatasetName, setNewDatasetName] = useState("")
//   const [selectedDataset, setSelectedDataset] = useState("")

//   const [uploading, setUploading] = useState(false)
//   const [message, setMessage] = useState("")
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     if (!projectId) return

//     axios
//       .get(`http://localhost:5000/api/projects/${projectId}/overview`)
//       .then((res) => setDatasets(res.data.datasets))
//       .finally(() => setLoading(false))
//   }, [projectId])


//   const fetchOverview = async () => {
//     const res = await axios.get(
//       `http://localhost:5000/api/projects/${projectId}/overview`
//     )
//     setDatasets(res.data.datasets)
//   }

//   // ---------------- UPLOAD FLOW ----------------
//   const startUpload = () => {
//     if (files.length === 0) {
//       alert("Select images first")
//       return
//     }
//     setDatasetMode("new")
//     setShowModal(true)
//   }

//   const confirmUpload = async () => {
//     let datasetId = selectedDataset

//     try {
//       if (datasetMode === "new") {
//       if (!newDatasetName.trim()) {
//         alert("Enter dataset name")
//         return
//       }

//       const res = await axios.post(
//         "http://localhost:5000/api/datasets/",
//         {
//           name: newDatasetName,
//           project_id: projectId,
//         }
//       )

//       datasetId = res.data.id
//     }


//       if (!datasetId) {
//         alert("Dataset creation failed")
//         return
//       }


//       const formData = new FormData()
//       files.forEach((file) => formData.append("images", file))
//       formData.append("dataset_id", datasetId)

//       setUploading(true)
//       setShowModal(false)
//       setMessage("")

//       const res = await axios.post(
//         `http://localhost:5000/api/images/upload/${projectId}`,
//         formData
//       )

//       setMessage(`${res.data.uploaded.length} images uploaded`)

//       setFiles([])
//       setNewDatasetName("")
//       setSelectedDataset("")
//     } catch (err) {
//       console.error(err)
//       setMessage("Upload failed")
//     } finally {
//       setUploading(false)

//     }
//     await fetchOverview()

//   }

//   // ---------------- UI ----------------
//     return (
//     <div className="flex w-full min-h-screen">
//       {/* SIDEBAR */}
//       <Sidebar
//         projectId={projectId}
//         datasets={datasets}
//       />

//       {/* MAIN CONTENT */}
//       <main className="flex-1 p-6">
//         {/* TOP BAR */}
//         <div className="flex justify-between items-center mb-6">
//           <h1 className="text-xl font-semibold text-zinc-100">
//             Project {projectId}
//           </h1>
//           <SystemPulse />
//         </div>

//         {/* ===== YOUR EXISTING UPLOAD UI (UNCHANGED) ===== */}
//         <div>
//           {/* DRAG & DROP */}
//           <div
//             onDragOver={(e) => {
//               e.preventDefault()
//               e.stopPropagation()
//             }}
//             onDrop={(e) => {
//               e.preventDefault()
//               e.stopPropagation()
//               setFiles(Array.from(e.dataTransfer.files))
//             }}
//             onClick={() => document.getElementById("fileInput")?.click()}
//             className="mt-4 p-10 border-2 border-dashed border-zinc-700 rounded-lg text-center cursor-pointer bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
//           >
//             <i className="fa fa-cloud-upload-alt text-2xl" />
//             <p className="mt-2">
//               Drag & drop images here<br />
//               or click to browse
//             </p>

//             {files.length > 0 && (
//               <p className="mt-2 text-sm text-green-400">
//                 <i className="fa fa-check-circle" /> {files.length} files selected
//               </p>
//             )}
//           </div>

//           <input
//             id="fileInput"
//             type="file"
//             multiple
//             accept="image/*"
//             className="hidden"
//             onChange={(e) => {
//               if (e.target.files) {
//                 setFiles(Array.from(e.target.files))
//               }
//             }}
//           />

//           {/* UPLOAD BUTTON */}
//           <button
//             onClick={startUpload}
//             disabled={uploading}
//             className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded hover:bg-zinc-700"
//           >
//             <i className="fa fa-upload mr-2" />
//             Upload Images
//           </button>

//           {message && (
//             <p className="mt-3 text-zinc-400">
//               <i className="fa fa-info-circle mr-1" />
//               {message}
//             </p>
//           )}

//           {/* ---------------- MODAL ---------------- */}
//           <Transition appear show={showModal} as={Fragment}>
//             <Dialog
//               as="div"
//               className="relative z-50"
//               onClose={() => setShowModal(false)}
//             >
//               <Transition.Child
//                 as={Fragment}
//                 enter="ease-out duration-200"
//                 enterFrom="opacity-0"
//                 enterTo="opacity-100"
//                 leave="ease-in duration-150"
//                 leaveFrom="opacity-100"
//                 leaveTo="opacity-0"
//               >
//                 <div className="fixed inset-0 bg-black/60" />
//               </Transition.Child>

//               <div className="fixed inset-0 flex items-center justify-center p-4">
//                 <Transition.Child
//                   as={Fragment}
//                   enter="ease-out duration-200"
//                   enterFrom="opacity-0 scale-95"
//                   enterTo="opacity-100 scale-100"
//                   leave="ease-in duration-150"
//                   leaveFrom="opacity-100 scale-100"
//                   leaveTo="opacity-0 scale-95"
//                 >
//                   <Dialog.Panel className="w-full max-w-md rounded-lg bg-zinc-900 p-6 text-white shadow-xl">
//                     <Dialog.Title className="text-lg font-semibold mb-4">
//                       Save images to dataset
//                     </Dialog.Title>

//                     {/* CREATE NEW */}
//                     <label className="flex items-center gap-2">
//                       <input
//                         type="radio"
//                         checked={datasetMode === "new"}
//                         onChange={() => setDatasetMode("new")}
//                       />
//                       Create new dataset
//                     </label>

//                     {datasetMode === "new" && (
//                       <input
//                         className="w-full mt-2 rounded bg-zinc-800 border border-zinc-700 p-2"
//                         placeholder="Dataset name"
//                         value={newDatasetName}
//                         onChange={(e) => setNewDatasetName(e.target.value)}
//                       />
//                     )}

//                     {/* EXISTING */}
//                     {datasets.length > 0 && (
//                       <>
//                         <label className="flex items-center gap-2 mt-4">
//                           <input
//                             type="radio"
//                             checked={datasetMode === "existing"}
//                             onChange={() => setDatasetMode("existing")}
//                           />
//                           Use existing dataset
//                         </label>

//                         {datasetMode === "existing" && (
//                           <select
//                             className="w-full mt-2 rounded bg-zinc-800 border border-zinc-700 p-2"
//                             value={selectedDataset}
//                             onChange={(e) => setSelectedDataset(e.target.value)}
//                           >
//                             <option value="">Select dataset</option>
//                             {datasets.map((d) => (
//                               <option key={d.id} value={d.id}>
//                                 {d.name}
//                               </option>
//                             ))}
//                           </select>
//                         )}
//                       </>
//                     )}

//                     {/* ACTIONS */}
//                     <div className="mt-6 flex justify-end gap-3">
//                       <button
//                         onClick={() => setShowModal(false)}
//                         className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600"
//                       >
//                         Cancel
//                       </button>
//                       <button
//                         onClick={confirmUpload}
//                         className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700"
//                       >
//                         Confirm
//                       </button>
//                     </div>
//                   </Dialog.Panel>
//                 </Transition.Child>
//               </div>
//             </Dialog>
//           </Transition>
//         </div>
//         {/* ================= PROJECT OVERVIEW ================= */}
//         <div className="mt-10">
//           <h2 className="text-lg font-semibold mb-4 text-zinc-100">
//             Datasets Overview
//           </h2>

//           {datasets.length === 0 ? (
//             <p className="text-zinc-400 text-sm">
//               No datasets yet. Upload images to create one.
//             </p>
//           ) : (
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {datasets.map((d) => {
//                 const progress =
//                   d.total > 0 ? Math.round((d.annotated / d.total) * 100) : 0

//                 return (
//                   <div
//                     key={d.id}
//                     className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
//                   >
//                     <div className="flex justify-between items-center mb-2">
//                       <h3 className="font-medium text-zinc-100">{d.name}</h3>
//                       <span className="text-xs text-zinc-400">
//                         {d.annotated}/{d.total}
//                       </span>
//                     </div>

//                     {/* Progress bar */}
//                     <div className="w-full h-2 bg-zinc-800 rounded overflow-hidden mb-3">
//                       <div
//                         className="h-full bg-green-500 transition-all"
//                         style={{ width: `${progress}%` }}
//                       />
//                     </div>

//                     <div className="flex justify-between items-center text-xs text-zinc-400">
//                       <span>{progress}% annotated</span>

//                       <a
//                         href={`/projects/${projectId}/datasets/${d.id}`}
//                         className="text-zinc-200 hover:text-white"
//                       >
//                         Open →
//                       </a>
//                     </div>
//                   </div>
//                 )
//               })}
//             </div>
//           )}
//         </div>
//         {/* =============== END PROJECT OVERVIEW =============== */}

//         {/* ===== END UNCHANGED UPLOAD UI ===== */}
//       </main>
//     </div>
//   )
// }








"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
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

export default function ProjectDashboard() {
  const params = useParams()
  const projectId = params.projectId 
  
  const API_URL = "http://localhost:5000/api"

  // State
  const [project, setProject] = useState<Project | null>(null)
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [systemStatus, setSystemStatus] = useState<"online" | "offline" | "checking">("checking")
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false)
  const [newDatasetName, setNewDatasetName] = useState("")

  // --- 1. HEALTH CHECK ---
  const checkSystemHealth = async () => {
    try {
      await axios.get(`${API_URL}/projects`)
      setSystemStatus("online")
    } catch (e) {
      setSystemStatus("offline")
    }
  }

  useEffect(() => {
    checkSystemHealth()
    const interval = setInterval(checkSystemHealth, 5000)
    return () => clearInterval(interval)
  }, [])

  // --- 2. DATA LOADING ---
  useEffect(() => {
    if (!projectId) return

    const fetchData = async () => {
      try {
        console.log(`Fetching project ${projectId}...`)
        const pRes = await axios.get(`${API_URL}/projects/${projectId}`)
        setProject(pRes.data)

        const dRes = await axios.get(`${API_URL}/datasets/project/${projectId}`)
        const dsData = Array.isArray(dRes.data) ? dRes.data : (dRes.data.datasets || [])
        setDatasets(dsData)

      } catch (err: any) {
        console.error("DASHBOARD LOAD ERROR:", err)
        if (err.response && err.response.status === 404) {
            alert("Project not found.")
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [projectId])

  // --- 3. CREATE DATASET HANDLER ---
  const handleCreateDataset = async () => {
    if (!newDatasetName.trim()) return
    setIsUploading(true)
    
    try {
        await axios.post(`${API_URL}/datasets/create`, {
            project_id: Number(projectId),
            name: newDatasetName
        })
        setNewDatasetName("")
        const dRes = await axios.get(`${API_URL}/datasets/project/${projectId}`)
        const dsData = Array.isArray(dRes.data) ? dRes.data : (dRes.data.datasets || [])
        setDatasets(dsData)
        
    } catch (err: any) {
        console.error("CREATE ERROR:", err)
        const msg = err.response?.data?.error || "Check backend logs"
        alert(`Failed to create dataset: ${msg}`)
    } finally {
        setIsUploading(false)
    }
  }

  // --- STATS ---
  const totalImages = datasets.reduce((acc, d) => acc + (d.image_count || 0), 0)
  const totalAnnotated = datasets.reduce((acc, d) => acc + (d.annotated_count || 0), 0)
  const progress = totalImages > 0 ? Math.round((totalAnnotated / totalImages) * 100) : 0

  if (loading) return (
    <div className="h-screen w-full bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono animate-pulse">
        CONNECTING TO MISSION CONTROL...
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* === TOP NAVIGATION === */}
      <nav className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
            <Link href="/" className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition">
                <i className="fa fa-arrow-left"></i>
            </Link>
            <div className="h-6 w-[1px] bg-zinc-800"></div>
            
            {/* ✅ NEW LOGO IMPLEMENTATION */}
            <div className="flex items-center gap-3">
                 <img 
                    src="/logo.png" 
                    alt="AnnoTron" 
                    className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" 
                 />
                 <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Project Dashboard</span>
                    <span className="font-bold text-zinc-100 leading-none">{project?.name || "Loading..."}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                systemStatus === 'online' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}>
                <div className={`w-2 h-2 rounded-full ${systemStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-xs font-mono font-bold uppercase">{systemStatus === 'online' ? 'System Online' : 'System Offline'}</span>
            </div>
        </div>
      </nav>

      {/* === HERO STATS (FULL WIDTH) === */}
      <div className="w-full px-6 py-8 border-b border-zinc-900 bg-zinc-900/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
            <StatCard 
                label="Total Datasets" 
                value={datasets.length} 
                icon="database" 
                color="text-cyan-400"  // Changed to Cyan
            />
            <StatCard 
                label="Total Images" 
                value={totalImages} 
                icon="images" 
                color="text-sky-400" // Changed to Sky
            />
            <StatCard 
                label="Annotations" 
                value={totalAnnotated} 
                icon="vector-square" 
                color="text-teal-400" 
            />
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-center">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-zinc-500 text-xs font-mono uppercase">Global Progress</span>
                    <span className="text-xl font-bold text-white">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    {/* Changed Gradient to Cyan -> Teal */}
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </div>
      </div>

      {/* === MAIN CONTENT (FULL WIDTH) === */}
      <main className="w-full px-6 py-8">
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa fa-folder-open text-zinc-600"></i>
                Active Datasets
            </h2>

            {/* Quick Add Input */}
            <div className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="New Dataset Name..." 
                    className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg focus:outline-none focus:border-cyan-500 w-64 transition"
                    value={newDatasetName}
                    onChange={(e) => setNewDatasetName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateDataset()}
                />
                <button 
                    onClick={handleCreateDataset}
                    disabled={isUploading || !newDatasetName}
                    // Changed to Cyan Button
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
                >
                    {isUploading ? <i className="fa fa-spinner fa-spin"></i> : <i className="fa fa-plus"></i>}
                </button>
            </div>
        </div>

        {/* Dataset Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
            
            {datasets.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-600">
                        <i className="fa fa-box-open text-2xl"></i>
                    </div>
                    <h3 className="text-zinc-400 font-medium">No Datasets Yet</h3>
                    <p className="text-zinc-600 text-sm mt-1">Create one above to start uploading images.</p>
                </div>
            ) : (
                datasets.map((ds) => (
                    <div key={ds.id} className="group bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 rounded-xl overflow-hidden transition-all hover:shadow-2xl hover:shadow-black/50 flex flex-col">
                        
                        {/* Card Header */}
                        <div className="p-5 flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                {/* Changed Badge to Cyan */}
                                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-cyan-400 font-bold text-lg border border-zinc-700 group-hover:bg-cyan-500/10 group-hover:text-cyan-300 transition">
                                    {ds.name.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-200 group-hover:text-white transition truncate max-w-[120px]" title={ds.name}>{ds.name}</h3>
                                    <div className="text-xs text-zinc-500 font-mono">ID: {ds.id}</div>
                                </div>
                            </div>
                            <button className="text-zinc-600 hover:text-red-400 transition">
                                <i className="fa fa-ellipsis-v"></i>
                            </button>
                        </div>

                        {/* Card Stats */}
                        <div className="px-5 py-3 grid grid-cols-2 gap-4 border-y border-zinc-800/50 bg-black/20">
                            <div>
                                <div className="text-[10px] uppercase text-zinc-500 font-bold">Images</div>
                                <div className="text-sm font-mono text-zinc-300">{ds.image_count || 0}</div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-zinc-500 font-bold">Progress</div>
                                <div className="text-sm font-mono text-zinc-300">
                                    {Math.round(((ds.annotated_count || 0) / (ds.image_count || 1)) * 100)}%
                                </div>
                            </div>
                        </div>

                        {/* Card Actions */}
                        <div className="p-4 mt-auto flex gap-2">
                             <Link 
                                href={`/projects/${projectId}/datasets/${ds.id}/upload`}
                                className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold flex items-center justify-center gap-2 transition border border-zinc-700"
                             >
                                <i className="fa fa-upload"></i> Upload
                             </Link>

                             {/* Primary Action Button -> Cyan */}
                             <Link 
                                href={`/projects/${projectId}/datasets/${ds.id}`}
                                className="flex-[2] py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition group-hover:scale-[1.02]"
                             >
                                <i className="fa fa-pen-nib"></i> LABEL
                             </Link>
                        </div>
                    </div>
                ))
            )}
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, icon, color }: any) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg bg-zinc-950 flex items-center justify-center text-xl ${color} border border-zinc-800`}>
                <i className={`fa fa-${icon}`}></i>
            </div>
            <div>
                <div className="text-zinc-500 text-xs font-mono uppercase">{label}</div>
                <div className="text-2xl font-bold text-white font-mono">{value}</div>
            </div>
        </div>
    )
}