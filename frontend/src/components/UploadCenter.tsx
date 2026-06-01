"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Book {
  id: number;
  title: string;
  author: string;
  total_pages: number;
  language: string;
}

interface UploadCenterProps {
  onSuccess: (book: Book) => void;
  apiBase: string;
}

export default function UploadCenter({ onSuccess, apiBase }: UploadCenterProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file.type.includes("pdf")) {
      setError("Please upload a PDF file only.");
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadProgress(40);
      const res = await fetch(`${apiBase}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to upload file");
      }

      setUploadProgress(90);
      const data = await res.json();
      setUploadProgress(100);
      
      setTimeout(() => {
        onSuccess(data);
        setLoading(false);
        setUploadProgress(0);
      }, 500);
    } catch (err: any) {
      setError(err.message || "An error occurred during upload.");
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-500 via-pink-500 to-indigo-500" />
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight mb-2">
            Upload Study Material
          </h2>
          <p className="text-zinc-400 text-sm">
            Support PDF textbooks, research articles, exam brochures, or lecture notes.
          </p>
        </div>

        <form
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onSubmit={(e) => e.preventDefault()}
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-300 ${
            dragActive
              ? "border-violet-400 bg-violet-950/20"
              : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/40"
          } ${loading ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
            {loading ? (
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-zinc-400" />
            )}
          </div>

          <p className="font-semibold text-lg mb-1">
            {loading ? "Uploading document..." : "Drag & Drop your PDF file here"}
          </p>
          <p className="text-xs text-zinc-500 mb-6">Or click to browse from device</p>

          {!loading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-violet-900/30 transition-all duration-200"
            >
              Browse Files <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {loading && (
            <div className="w-full max-w-xs mt-4">
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-zinc-400 text-center mt-2 font-mono">
                {uploadProgress}% processed
              </p>
            </div>
          )}
        </form>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-sm text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex justify-around items-center border-t border-zinc-900 pt-6 text-zinc-500 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-violet-400" />
            <span>Up to 1000 Pages supported</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-violet-400" />
            <span>Fast RAG Vector indexing</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
