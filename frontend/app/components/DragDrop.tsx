"use client"

type Props = {
  files: FileList | null
  setFiles: (files: FileList) => void
}

export default function DragDropUpload({ files, setFiles }: Props) {
  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setFiles(e.dataTransfer.files)
        }}
        onClick={() => document.getElementById("fileInput")?.click()}
        style={{
          maxWidth: 500,
          marginTop: 24,
          padding: 24,
          border: "2px dashed #555",
          borderRadius: 10,
          textAlign: "center",
          cursor: "pointer",
          backgroundColor: "#1e1e1e",
          color: "#e0e0e0",
        }}
      >
        <i className="fa fa-cloud-upload-alt fa-2x" />
        <p style={{ marginTop: 12, fontSize: 14 }}>
          Drag & drop images here<br />
          or click to browse
        </p>

        {files && (
          <p style={{ marginTop: 10, fontSize: 13, color: "#9be29b" }}>
            <i className="fa fa-check-circle" /> {files.length} files selected
          </p>
        )}
      </div>

      <input
        id="fileInput"
        type="file"
        multiple
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files) setFiles(e.target.files)
        }}
      />
    </>
  )
}
