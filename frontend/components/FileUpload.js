"use client";
import { useState, useRef } from "react";

export default function FileUpload({ onUpload }) {
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setStatus(null);
    try {
      const msg = await onUpload(file);
      setStatus({ type: "success", text: msg });
    } catch (e) {
      setStatus({ type: "error", text: e.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upload Document</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
          ${dragOver ? "border-blue-400 bg-blue-900/20" : "border-gray-700 hover:border-gray-500"}
          ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <p className="text-2xl mb-1">📁</p>
        <p className="text-sm text-gray-300">
          {uploading ? "Uploading..." : "Drop file or click"}
        </p>
        <p className="text-xs text-gray-500 mt-1">PDF, DOCX, TXT</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {status && (
        <p className={`text-xs px-2 py-1 rounded ${status.type === "success" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
          {status.text}
        </p>
      )}
    </div>
  );
}
