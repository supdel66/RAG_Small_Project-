"use client";

export default function DocumentList({ files, onClear }) {
  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Indexed Files</p>
        {files.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-red-400 hover:text-red-300 transition"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {files.length === 0 ? (
          <p className="text-xs text-gray-600 italic">No files uploaded yet</p>
        ) : (
          files.map((f) => (
            <div key={f} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-sm">
                {f.endsWith(".pdf") ? "📕" : f.endsWith(".docx") ? "📘" : "📄"}
              </span>
              <span className="text-xs text-gray-300 truncate">{f}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
