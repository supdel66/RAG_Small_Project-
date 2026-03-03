"use client";
import { useState, useRef, useEffect } from "react";

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
        ${isUser
          ? "bg-blue-600 text-white rounded-br-sm"
          : "bg-gray-800 text-gray-100 rounded-bl-sm"}`}
      >
        <p className="whitespace-pre-wrap">{msg.content}</p>
        {msg.sources?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <p className="text-xs text-gray-400 font-semibold mb-1">Sources:</p>
            {[...new Set(msg.sources)].map((s) => (
              <span key={s} className="inline-block text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded mr-1 mb-1">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatWindow({ messages, onSend, isLoading, hasDocuments }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const q = input.trim();
    if (!q || isLoading) return;
    setInput("");
    onSend(q);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 opacity-40">
            <p className="text-5xl">🤖</p>
            <p className="text-gray-400 text-lg font-medium">Ask anything about your documents</p>
            <p className="text-gray-500 text-sm">
              {hasDocuments ? "Start chatting below" : "Upload a file from the sidebar first"}
            </p>
          </div>
        ) : (
          messages.map((msg, i) => <Message key={i} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}}
            placeholder={hasDocuments ? "Ask a question about your documents..." : "Upload a document first..."}
            disabled={!hasDocuments || isLoading}
            rows={1}
            className="flex-1 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm
              resize-none outline-none border border-gray-700 focus:border-blue-500 transition
              disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            onClick={send}
            disabled={!input.trim() || isLoading || !hasDocuments}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
              text-white rounded-xl px-4 py-3 text-sm font-semibold transition"
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2 text-center">
          Shift+Enter for new line • Running locally with Ollama llama3.2:3b
        </p>
      </div>
    </div>
  );
}
