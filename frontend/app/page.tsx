"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import Link from "next/link"

type Project = {
  id: number
  name: string
  description: string
  created_at: string
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  const API_URL = "http://localhost:5000/api/projects"

  const fetchProjects = async () => {
    try {
      const res = await axios.get(API_URL)
      setProjects(res.data)
    } catch (err: any) {
      // ✅ APPLIED YOUR SOLUTION HERE
      if (err.response && err.response.data && err.response.data.error) {
          console.error("Fetch Error (Server):", err.response.data.error)
          alert(`System Error: ${err.response.data.error}`)
      } else {
          console.error("Fetch Error (Network/Unknown):", err)
      }
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const createProject = async () => {
    if (!name) return
    setLoading(true)
    try {
      await axios.post(`${API_URL}/create`, { name })
      setName("")
      await fetchProjects()
    } catch (err: any) {
      // ✅ APPLIED YOUR SOLUTION HERE TOO
      if (err.response && err.response.data && err.response.data.error) {
          console.error("Create Error (Server):", err.response.data.error)
          alert(`Failed: ${err.response.data.error}`)
      } else {
          console.error("Create Error (Network/Unknown):", err)
          alert("Failed to create project. Check console.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans p-8 selection:bg-cyan-500/30">
      
      <header className="max-w-4xl mx-auto mb-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
            {/* LOGO UPDATE */}
            <img 
                src="/logo.png" 
                alt="AnnoTron" 
                className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
            />
            <h1 className="text-2xl font-bold tracking-tight text-white">AnnoTron</h1>
        </div>
        <div className="text-xs font-mono text-zinc-500">v1.0 • Internship Edition</div>
      </header>

      <main className="max-w-4xl mx-auto">
        
        {/* CREATE SECTION */}
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl mb-12">
            <h2 className="text-lg font-semibold text-white mb-4">New Project</h2>
            <div className="flex gap-4">
                <input
                    type="text"
                    placeholder="Project Name (e.g. Defect Detection)"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-300 focus:outline-none focus:border-cyan-500 transition"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createProject()}
                />
                <button 
                    onClick={createProject}
                    disabled={loading || !name}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8 py-3 rounded-xl transition disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <i className="fa fa-spinner fa-spin"></i> : <i className="fa fa-plus"></i>}
                    <span>Create</span>
                </button>
            </div>
        </div>

        {/* PROJECTS GRID */}
        <h2 className="text-xl font-bold text-zinc-400 mb-6 flex items-center gap-2">
            <i className="fa fa-folder-open"></i> Your Projects
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.length === 0 ? (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-600">
                    No projects found. Create one above!
                </div>
            ) : (
                projects.map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}`}>
                        <div className="group bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 p-6 rounded-2xl transition-all cursor-pointer hover:shadow-2xl hover:shadow-black/50">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-zinc-800 group-hover:bg-cyan-500/10 flex items-center justify-center text-xl text-zinc-500 group-hover:text-cyan-400 transition">
                                    {p.name.substring(0, 2).toUpperCase()}
                                </div>
                                <i className="fa fa-arrow-right text-zinc-700 group-hover:text-white -rotate-45 group-hover:rotate-0 transition-all duration-300"></i>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-300 transition">{p.name}</h3>
                            <div className="text-xs text-zinc-500 font-mono">Created: {new Date(p.created_at).toLocaleDateString()}</div>
                        </div>
                    </Link>
                ))
            )}
        </div>

      </main>
    </div>
  )
}