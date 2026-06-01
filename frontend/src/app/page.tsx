"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Sparkles, BookCheck, ShieldAlert, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UploadCenter from "@/components/UploadCenter";
import Dashboard from "@/components/Dashboard";

interface Book {
  id: number;
  title: string;
  author: string;
  total_pages: number;
  language: string;
}

export default function Home() {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [bookList, setBookList] = useState<Book[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [apiBase, setApiBase] = useState("http://127.0.0.1:8000");

  // Fetch previously uploaded documents
  const fetchBooks = async () => {
    try {
      const res = await fetch(`${apiBase}/api/books`);
      if (res.ok) {
        const data = await res.json();
        setBookList(data || []);
      }
    } catch (err) {
      console.warn("API Server not yet reachable. Standard fallback active.", err);
    } finally {
      setLoadingList(false);
    }
  };

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchBooks();
  }, [apiBase]);

  const handleUploadSuccess = (newBook: Book) => {
    setSelectedBook(newBook);
    setBookList((prev) => [newBook, ...prev.filter(b => b.id !== newBook.id)]);
  };

  if (!isMounted) return null;

  return (
    <main className="relative min-h-screen flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden">
      {/* Dynamic Background Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-600/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-900/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-violet-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                StudyCompanion
              </span>
              <span className="text-[10px] block font-semibold text-zinc-500 uppercase tracking-widest leading-none">AI Study Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Server connection status indicator */}
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 text-xs">
              <div className={`w-2 h-2 rounded-full ${bookList.length > 0 || !loadingList ? "bg-emerald-400 animate-pulse" : "bg-yellow-400"}`} />
              <span className="text-zinc-400">{bookList.length > 0 || !loadingList ? "API Connected" : "Local API Sandbox"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col z-10">
        <AnimatePresence mode="wait">
          {!selectedBook ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col gap-12 items-center justify-center py-6"
            >
              {/* Marketing Title */}
              <div className="text-center max-w-3xl">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-4"
                >
                  <Award className="w-3.5 h-3.5" /> High-Performance AI Study Assistant
                </motion.div>
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4">
                  Turn Documents into <br />
                  <span className="text-gradient-purple font-black">Interactive Knowledge</span>
                </h1>
                <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                  Upload textbook chapters, competitive exam manuals, or research papers. Get instant study guides, customizable flashcards, interactive practice tests, and vector-search document chat.
                </p>
              </div>

              {/* Upload Center */}
              <UploadCenter onSuccess={handleUploadSuccess} apiBase={apiBase} />

              {/* Historical Documents (if any uploaded) */}
              {bookList.length > 0 && (
                <div className="w-full max-w-2xl mt-4">
                  <h3 className="text-xs uppercase font-bold text-zinc-500 tracking-wider mb-3">Recently Analyzed Documents</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bookList.map((bk) => (
                      <button
                        key={bk.id}
                        onClick={() => setSelectedBook(bk)}
                        className="flex items-center gap-3 p-4 bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60 rounded-2xl text-left transition-all group"
                      >
                        <div className="w-10 h-10 bg-violet-600/10 rounded-xl flex items-center justify-center border border-violet-500/15 text-violet-400 group-hover:bg-violet-600/20 transition-all">
                          <BookCheck className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate text-zinc-200">{bk.title}</p>
                          <p className="text-xs text-zinc-500 truncate">{bk.total_pages} pages</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <Dashboard 
                book={selectedBook} 
                onReset={() => {
                  setSelectedBook(null);
                  fetchBooks();
                }} 
                apiBase={apiBase}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-900 py-6 bg-zinc-950/20 z-10 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 StudyCompanion. Designed for UPSC, College, and Research preparation.</p>
          <div className="flex gap-4">
            <span className="hover:text-zinc-400 cursor-pointer">Security Policy</span>
            <span className="hover:text-zinc-400 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
