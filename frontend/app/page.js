"use client";
import { useState, useRef, useEffect } from "react";
import FileUpload from "@/components/FileUpload";
import ChatWindow from "@/components/ChatWindow";
import DocumentList from "@/components/DocumentList";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFiles = async () => {
    const res = await fetch("http://localhost:8000/documents");
    const data = await res.json();
    setFiles(data.files);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Upload failed");
    await fetchFiles();
    return data.message;
  };

  const handleSend = async (question) => {
    const userMsg = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const assistantMsg = { role: "assistant", content: "", sources: [] };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        // Parse sources marker
        const sourceMarker = "__SOURCES__:";
        let display = fullText;
        let sources = [];
        if (fullText.includes(sourceMarker)) {
          const parts = fullText.split(sourceMarker);
          display = parts[0];
          sources = parts[1] ? parts[1].split(",").filter(Boolean) : [];
        }

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: display,
            sources,
          };
          return updated;
        });
      }
    } catch (e) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "❌ Error connecting to backend.",
          sources: [],
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    await fetch("http://localhost:8000/documents", { method: "DELETE" });
    setFiles([]);
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col p-4 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">📄 RAG Chatbot</h1>
          <p className="text-xs text-gray-400">Powered by Ollama + ChromaDB</p>
        </div>
        <FileUpload onUpload={handleUpload} />
        <DocumentList files={files} onClear={handleClear} />
      </aside>

      {/* Main chat */}
      <main className="flex-1 flex flex-col">
        <ChatWindow
          messages={messages}
          onSend={handleSend}
          isLoading={isLoading}
          hasDocuments={files.length > 0}
        />
      </main>
    </div>
  );
}
