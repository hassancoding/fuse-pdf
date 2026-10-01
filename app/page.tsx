"use client";

import { useState, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { Upload, FileText, X, GripVertical, Download, Loader2, Merge } from "lucide-react";

interface PdfFile {
  id: string;
  file: File;
  name: string;
  pages: number;
  size: string;
}

export default function Home() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getPageCount = async (file: File): Promise<number> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      return pdf.getPageCount();
    } catch {
      return 0;
    }
  };

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const pdfFiles = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );

    const processed: PdfFile[] = [];
    for (const file of pdfFiles) {
      const pages = await getPageCount(file);
      processed.push({
        id: Math.random().toString(36).slice(2),
        file,
        name: file.name,
        pages,
        size: formatSize(file.size),
      });
    }

    setFiles((prev) => [...prev, ...processed]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    setFiles((prev) => {
      const newFiles = [...prev];
      const [removed] = newFiles.splice(draggedIndex, 1);
      newFiles.splice(index, 0, removed);
      return newFiles;
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const mergePdfs = async () => {
    if (files.length < 2) return;
    setIsMerging(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const pdfFile of files) {
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `merged-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Merge failed:", err);
      alert("Failed to merge PDFs. Please try again.");
    } finally {
      setIsMerging(false);
    }
  };

  const totalPages = files.reduce((sum, f) => sum + f.pages, 0);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Merge className="w-5 h-5" />
          </div>
          <span className="font-semibold text-lg tracking-tight">FUSE PDF</span>
        </div>
        <div className="text-sm text-white/50">
          100% Free · No Uploads · Privacy First
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-4 py-12 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-3 tracking-tight">
          Merge PDFs in Your Browser
        </h1>
        <p className="text-white/60 text-center mb-10 max-w-md">
          Drag, drop, reorder, and merge. Files never leave your device.
        </p>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-white/60 bg-white/5"
              : "border-white/20 hover:border-white/40 hover:bg-white/[0.02]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <Upload className="w-10 h-10 mx-auto mb-4 text-white/40" />
          <p className="text-lg font-medium mb-1">Drop PDFs here</p>
          <p className="text-sm text-white/50">or click to browse your files</p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="w-full mt-8 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-white/50">
                {files.length} file{files.length !== 1 ? "s" : ""} · {totalPages} page{totalPages !== 1 ? "s" : ""}
              </p>
              <button
                onClick={() => setFiles([])}
                className="text-sm text-white/40 hover:text-white/70 transition"
              >
                Clear all
              </button>
            </div>

            {files.map((file, index) => (
              <div
                key={file.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 transition ${
                  draggedIndex === index ? "opacity-50" : ""
                }`}
              >
                <GripVertical className="w-4 h-4 text-white/30 cursor-grab shrink-0" />
                <FileText className="w-5 h-5 text-white/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-white/40">
                    {file.pages} page{file.pages !== 1 ? "s" : ""} · {file.size}
                  </p>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>
            ))}

            {/* Merge button */}
            <button
              onClick={mergePdfs}
              disabled={files.length < 2 || isMerging}
              className="w-full mt-6 flex items-center justify-center gap-2 bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Merge {files.length} PDFs
                </>
              )}
            </button>
          </div>
        )}

        {/* Features */}
        {files.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full">
            {[
              {
                title: "Drag & Drop",
                desc: "Upload multiple PDFs instantly. No size limits.",
              },
              {
                title: "Reorder Pages",
                desc: "Arrange files in any order before merging.",
              },
              {
                title: "100% Private",
                desc: "Everything happens in your browser. Zero uploads.",
              },
            ].map((f) => (
              <div key={f.title} className="text-center">
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-white/50">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-sm text-white/40">
        Fuse PDF · Free forever · Built for privacy
      </footer>
    </div>
  );
}