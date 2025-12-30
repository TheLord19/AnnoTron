"use client"

import Link from "next/link"

type Dataset = {
  id: number
  name: string
  total: number
  annotated: number
}

export default function Sidebar({
  projectId,
  datasets,
  activeDatasetId,
}: {
  projectId: string
  datasets: Dataset[]
  activeDatasetId?: number
}) {
  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 p-4">
      <h2 className="text-sm text-zinc-400 mb-4">Datasets</h2>

      <div className="space-y-2">
        {datasets.map((d) => {
          const active = d.id === activeDatasetId

          return (
            <Link
              key={d.id}
              href={`/projects/${projectId}/datasets/${d.id}`}
              className={`block rounded px-3 py-2 text-sm ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              <div className="flex justify-between">
                <span>{d.name}</span>
                <span className="text-xs">
                  {d.annotated}/{d.total}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
