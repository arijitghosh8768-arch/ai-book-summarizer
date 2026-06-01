"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, FileText, HelpCircle, Layers, MessageSquare, Download, Globe, ChevronLeft, ChevronRight, Check, X, RefreshCw, Send, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Book {
  id: number;
  title: string;
  author: string;
  total_pages: number;
  language: string;
}

interface DashboardProps {
  book: Book;
  onReset: () => void;
  apiBase: string;
}

interface SummaryData {
  summary_text: string;
  main_idea: string;
  key_concepts: string;
  definitions: string;
  actionable_insights: string;
}

interface Flashcard {
  id: number;
  front: string;
  back: string;
}

interface QuizQuestion {
  type: string;
  question: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

interface ChatMsg {
  role: string;
  content: string;
}

const SUPPORTED_LANGUAGES = [
  "English", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi", 
  "Spanish", "French", "German", "Arabic", "Chinese", "Japanese", "Russian"
];

export default function Dashboard({ book, onReset, apiBase }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "flashcards" | "quiz" | "chat">("summary");
  
  // Page Range
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(Math.min(10, book.total_pages));
  const [isProcessing, setIsProcessing] = useState(false);

  // Core Data
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  
  // Translation
  const [targetLang, setTargetLang] = useState("English");
  const [translating, setTranslating] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState<SummaryData | null>(null);

  // Flashcard slider index & flip state
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Quiz active answers & scores
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // RAG Chat history & query
  const [chatQuery, setChatQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initial prompt processing on load or page range change
  const processRange = async () => {
    setIsProcessing(true);
    setSummary(null);
    setFlashcards([]);
    setQuizQuestions([]);
    setTranslatedSummary(null);
    setTargetLang("English");
    
    try {
      // 1. Process Summaries
      const sumRes = await fetch(`${apiBase}/api/books/${book.id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_page: startPage, end_page: endPage })
      });
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }

      // 2. Process Flashcards
      const flashRes = await fetch(`${apiBase}/api/books/${book.id}/flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_page: startPage, end_page: endPage })
      });
      if (flashRes.ok) {
        const flashData = await flashRes.json();
        setFlashcards(flashData);
        setCardIndex(0);
        setCardFlipped(false);
      }

      // 3. Process Quiz
      const quizRes = await fetch(`${apiBase}/api/books/${book.id}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_req: { start_page: startPage, end_page: endPage },
          quiz_req: { difficulty: "Medium", num_questions: 5 }
        })
      });
      if (quizRes.ok) {
        const quizData = await quizRes.json();
        setQuizQuestions(quizData.questions || []);
        setQuizAnswers({});
        setQuizSubmitted(false);
      }

    } catch (err) {
      console.error("Error processing range:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Run on mount
  useEffect(() => {
    processRange();
  }, [book.id]);

  // Translate active summary
  const handleTranslation = async (lang: string) => {
    setTargetLang(lang);
    if (lang === "English") {
      setTranslatedSummary(null);
      return;
    }
    if (!summary) return;

    setTranslating(true);
    try {
      const translateField = async (text: string) => {
        const res = await fetch(`${apiBase}/api/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, target_language: lang })
        });
        if (res.ok) {
          const data = await res.json();
          return data.translated;
        }
        return text;
      };

      const translated = {
        summary_text: await translateField(summary.summary_text),
        main_idea: await translateField(summary.main_idea),
        key_concepts: await translateField(summary.key_concepts),
        definitions: await translateField(summary.definitions),
        actionable_insights: await translateField(summary.actionable_insights)
      };

      setTranslatedSummary(translated);
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      setTranslating(false);
    }
  };

  // Send RAG chat message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim() || chatLoading) return;

    const userMsg = { role: "user", content: chatQuery };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatQuery("");
    setChatLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/books/${book.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          history: chatHistory
        })
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory((prev) => [...prev, { role: "assistant", content: data.response }]);
      } else {
        setChatHistory((prev) => [...prev, { role: "assistant", content: "Error communicating with search assistant." }]);
      }
    } catch (err) {
      setChatHistory((prev) => [...prev, { role: "assistant", content: "Could not establish connection to the AI engine." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  // Export Study Guide as Markdown
  const handleExportMarkdown = () => {
    if (!summary) return;
    
    const active = translatedSummary || summary;
    const mdContent = `# Study Guide: ${book.title}
Pages ${startPage} - ${endPage}
Language: ${targetLang}

## 1. Executive Summary
${active.summary_text}

## 2. Main Idea
${active.main_idea}

## 3. Key Concepts
${active.key_concepts}

## 4. Key Definitions
${active.definitions}

## 5. Actionable Insights
${active.actionable_insights}
`;

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${book.title.replace(/\s+/g, "_")}_Study_Notes.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Study Guide as Word Document (.docx)
  const handleExportDocx = async () => {
    if (!summary) return;
    
    const active = translatedSummary || summary;
    
    try {
      const res = await fetch(`${apiBase}/api/export/docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          start_page: startPage,
          end_page: endPage,
          language: targetLang,
          summary_text: active.summary_text,
          main_idea: active.main_idea,
          key_concepts: active.key_concepts,
          definitions: active.definitions,
          actionable_insights: active.actionable_insights
        })
      });

      if (!res.ok) throw new Error("Failed to generate DOCX file");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const cleanTitle = book.title.replace(/\s+/g, "_");
      link.setAttribute("download", `${cleanTitle}_Study_Notes.docx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export Word document:", err);
    }
  };

  // Calculate Quiz score
  const getQuizScore = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()) {
        score++;
      }
    });
    return score;
  };

  const currentSummary = translatedSummary || summary;

  return (
    <div className="w-full flex-1 flex flex-col gap-6">
      {/* Top Banner with book title and page range selector */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-600/10 rounded-xl flex items-center justify-center border border-violet-500/20 text-violet-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{book.title}</h1>
            <p className="text-xs text-zinc-400">Author: {book.author} | Total Pages: {book.total_pages}</p>
          </div>
        </div>

        {/* Page Range Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-xl p-2 px-3 text-sm">
            <span className="text-zinc-400">Pages:</span>
            <input 
              type="number" 
              value={startPage} 
              onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 text-center bg-transparent border-b border-zinc-700 focus:border-violet-500 outline-none"
              min={1}
              max={book.total_pages}
            />
            <span className="text-zinc-500">to</span>
            <input 
              type="number" 
              value={endPage} 
              onChange={(e) => setEndPage(Math.min(book.total_pages, parseInt(e.target.value) || book.total_pages))}
              className="w-12 text-center bg-transparent border-b border-zinc-700 focus:border-violet-500 outline-none"
              min={1}
              max={book.total_pages}
            />
          </div>
          <button
            onClick={processRange}
            disabled={isProcessing}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" /> Re-generate
              </>
            )}
          </button>
          <button 
            onClick={onReset}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl text-sm font-semibold transition-all"
          >
            Change Document
          </button>
        </div>
      </motion.div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-zinc-800 gap-1 overflow-x-auto pb-px">
        {[
          { id: "summary", label: "Study Notes", icon: FileText },
          { id: "flashcards", label: "Flashcards", icon: Layers },
          { id: "quiz", label: "Practice Quiz", icon: HelpCircle },
          { id: "chat", label: "Ask Document", icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2.5 px-6 py-3.5 border-b-2 text-sm font-medium transition-all ${
                isActive 
                  ? "border-violet-500 text-violet-400 bg-violet-500/5 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 min-h-[450px] flex flex-col">
        {isProcessing ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <Loader2 className="w-12 h-12 text-violet-500 animate-spin mb-4" />
            <p className="font-semibold text-lg">AI Companion is reading pages {startPage} - {endPage}...</p>
            <p className="text-zinc-500 text-sm mt-1">Generating study materials, flashcards, and quizzes.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            
            {/* 1. Summary Tab */}
            {activeTab === "summary" && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex-1 flex flex-col gap-6"
              >
                {/* Controls for notes (translate / export) */}
                <div className="flex justify-between items-center bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 px-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm text-zinc-400 mr-2">Language:</span>
                    <select
                      value={targetLang}
                      onChange={(e) => handleTranslation(e.target.value)}
                      disabled={translating}
                      className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-1.5 px-3 text-sm focus:border-violet-500 outline-none"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    {translating && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleExportMarkdown}
                      disabled={!summary}
                      className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-3.5 py-2 rounded-xl transition-all"
                    >
                      <Download className="w-4 h-4" /> Export MD
                    </button>
                    <button
                      onClick={handleExportDocx}
                      disabled={!summary}
                      className="flex items-center gap-2 text-sm text-white bg-violet-600 hover:bg-violet-500 active:bg-violet-750 px-3.5 py-2 rounded-xl transition-all shadow-lg shadow-violet-900/10"
                    >
                      <Download className="w-4 h-4" /> Export Word (.docx)
                    </button>
                  </div>
                </div>

                {currentSummary ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Executive Summary & Main Idea */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                      <div className="glass-panel rounded-2xl p-6 relative">
                        <div className="absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 bg-violet-600/10 text-violet-400 rounded-full border border-violet-500/20">Executive Summary</div>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-violet-400" /> Key Overview
                        </h3>
                        <div className="text-zinc-300 space-y-3 leading-relaxed text-sm whitespace-pre-wrap">
                          {currentSummary.summary_text}
                        </div>
                      </div>

                      <div className="glass-panel rounded-2xl p-6">
                        <h3 className="text-lg font-bold mb-3">Core Takeaway</h3>
                        <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap">
                          {currentSummary.main_idea}
                        </p>
                      </div>
                    </div>

                    {/* Key Concepts, Definitions & Actionable Insights */}
                    <div className="flex flex-col gap-6">
                      <div className="glass-panel rounded-2xl p-6">
                        <h3 className="text-md font-bold mb-3 text-violet-400">Key Concepts</h3>
                        <div className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                          {currentSummary.key_concepts}
                        </div>
                      </div>

                      <div className="glass-panel rounded-2xl p-6">
                        <h3 className="text-md font-bold mb-3 text-pink-400">Important Definitions</h3>
                        <div className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                          {currentSummary.definitions}
                        </div>
                      </div>

                      <div className="glass-panel rounded-2xl p-6">
                        <h3 className="text-md font-bold mb-3 text-emerald-400">Actionable Insights</h3>
                        <div className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                          {currentSummary.actionable_insights}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-12 text-zinc-500">
                    No summary generated yet.
                  </div>
                )}
              </motion.div>
            )}

            {/* 2. Flashcards Tab */}
            {activeTab === "flashcards" && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex-1 flex flex-col items-center justify-center py-8 gap-6 max-w-xl mx-auto w-full"
              >
                {flashcards.length > 0 ? (
                  <>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
                      Card {cardIndex + 1} of {flashcards.length}
                    </p>

                    {/* Flippable Card Container */}
                    <div 
                      onClick={() => setCardFlipped(!cardFlipped)}
                      className="w-full h-80 perspective-1000 cursor-pointer"
                    >
                      <div className={`w-full h-full relative preserve-3d transition-transform duration-500 ${cardFlipped ? 'rotate-y-180' : ''}`}>
                        
                        {/* Front Side */}
                        <div className="absolute inset-0 backface-hidden glass-panel rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl">
                          <span className="text-[10px] uppercase font-semibold text-violet-400 tracking-wider mb-4 border border-violet-500/20 px-2 py-0.5 rounded-full bg-violet-500/5">Question / Concept</span>
                          <h3 className="text-xl font-bold leading-relaxed">{flashcards[cardIndex].front}</h3>
                          <p className="text-xs text-zinc-500 mt-8">Click card to reveal answer</p>
                        </div>

                        {/* Back Side */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 glass-panel border-violet-500/20 bg-zinc-900/90 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl">
                          <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider mb-4 border border-emerald-500/20 px-2 py-0.5 rounded-full bg-emerald-500/5">Answer / Explanation</span>
                          <p className="text-md text-zinc-200 leading-relaxed font-medium">{flashcards[cardIndex].back}</p>
                          <p className="text-xs text-zinc-500 mt-8">Click card to show question</p>
                        </div>

                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => {
                          setCardFlipped(false);
                          setTimeout(() => setCardIndex((prev) => Math.max(0, prev - 1)), 150);
                        }}
                        disabled={cardIndex === 0}
                        className="p-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 rounded-full border border-zinc-800 transition-all"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setCardFlipped(false);
                          setTimeout(() => setCardIndex((prev) => Math.min(flashcards.length - 1, prev + 1)), 150);
                        }}
                        disabled={cardIndex === flashcards.length - 1}
                        className="p-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 rounded-full border border-zinc-800 transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-12 text-zinc-500 text-center">
                    No flashcards generated for this range.
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. Quiz Tab */}
            {activeTab === "quiz" && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex-1 max-w-3xl mx-auto w-full flex flex-col gap-6 py-4"
              >
                {quizQuestions.length > 0 ? (
                  <div className="flex flex-col gap-6">
                    
                    {quizQuestions.map((q, qIdx) => (
                      <div key={qIdx} className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
                            Q{qIdx + 1}: {q.type}
                          </span>
                          {quizSubmitted && (
                            quizAnswers[qIdx]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim() ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                <Check className="w-3.5 h-3.5" /> Correct
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                <X className="w-3.5 h-3.5" /> Incorrect
                              </span>
                            )
                          )}
                        </div>

                        <p className="font-semibold text-lg text-zinc-200">{q.question}</p>

                        {/* Question options */}
                        {q.options && q.options.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                            {q.options.map((opt) => {
                              const isSelected = quizAnswers[qIdx] === opt;
                              const isCorrect = opt === q.correct_answer;
                              
                              let buttonStyle = "border-zinc-800 hover:bg-zinc-800/30 text-zinc-300";
                              if (isSelected) {
                                buttonStyle = "border-violet-500 bg-violet-500/10 text-violet-400 font-semibold";
                              }
                              if (quizSubmitted) {
                                if (isCorrect) {
                                  buttonStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-semibold";
                                } else if (isSelected) {
                                  buttonStyle = "border-red-500 bg-red-500/10 text-red-400 font-semibold";
                                } else {
                                  buttonStyle = "border-zinc-850 opacity-40 text-zinc-500";
                                }
                              }

                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  disabled={quizSubmitted}
                                  onClick={() => setQuizAnswers((prev) => ({ ...prev, [qIdx]: opt }))}
                                  className={`p-3.5 rounded-xl border text-left text-sm transition-all ${buttonStyle}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          // Fill in the blanks free text input
                          <div className="mt-2">
                            <input
                              type="text"
                              disabled={quizSubmitted}
                              placeholder="Type your answer here..."
                              value={quizAnswers[qIdx] || ""}
                              onChange={(e) => setQuizAnswers((prev) => ({ ...prev, [qIdx]: e.target.value }))}
                              className="w-full md:max-w-md bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-xl p-3 text-sm outline-none text-zinc-200"
                            />
                            {quizSubmitted && (
                              <div className="mt-2 text-sm text-zinc-400">
                                Correct answer: <span className="text-emerald-400 font-semibold">{q.correct_answer}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Explanations */}
                        {quizSubmitted && q.explanation && (
                          <div className="mt-2 p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-850 text-xs text-zinc-400 leading-relaxed">
                            <strong className="text-zinc-300 block mb-1">Explanation:</strong>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Quiz Action Submit */}
                    <div className="flex justify-between items-center bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 mt-4">
                      {!quizSubmitted ? (
                        <>
                          <span className="text-xs text-zinc-500">Answer all questions to view score.</span>
                          <button
                            onClick={() => setQuizSubmitted(true)}
                            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg"
                          >
                            Submit Quiz
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-400">Quiz Completed:</span>
                            <span className="font-extrabold text-xl text-violet-400">
                              {getQuizScore()} / {quizQuestions.length}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setQuizAnswers({});
                              setQuizSubmitted(false);
                            }}
                            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-semibold transition-all border border-zinc-750"
                          >
                            Retake Quiz
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-zinc-500 text-center">
                    No quiz questions generated for this range.
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. Chat Tab (RAG Ask Document) */}
            {activeTab === "chat" && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex-1 flex flex-col border border-zinc-800 rounded-2xl overflow-hidden glass-panel h-[500px]"
              >
                {/* Chat Message Window */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 max-w-md mx-auto">
                      <MessageSquare className="w-10 h-10 text-zinc-600 mb-3" />
                      <p className="font-semibold text-zinc-300">Ask your Study Material</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Type questions like "What is the key theory discussed in chapter 2?" or "Define terms on page 5".
                      </p>
                    </div>
                  )}

                  {chatHistory.map((msg, index) => {
                    const isUser = msg.role === "user";
                    return (
                      <div
                        key={index}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                            isUser
                              ? "bg-violet-600 text-white rounded-br-none"
                              : "bg-zinc-800/80 text-zinc-200 border border-zinc-750 rounded-bl-none"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-800/80 text-zinc-400 border border-zinc-750 rounded-2xl rounded-bl-none p-4 text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" /> Searching study guide and generating answer...
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input form */}
                <form onSubmit={handleSendChat} className="border-t border-zinc-800 p-4 flex gap-2 bg-zinc-950/60">
                  <input
                    type="text"
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    placeholder="Ask a question about the document..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm outline-none text-zinc-200 placeholder-zinc-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatQuery.trim() || chatLoading}
                    className="p-3 bg-violet-600 hover:bg-violet-500 active:bg-violet-750 disabled:opacity-40 disabled:hover:bg-violet-600 text-white rounded-xl transition-all shadow-lg"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </motion.div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
