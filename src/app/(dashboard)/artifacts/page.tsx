"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchJarvis } from "@/lib/api-client";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import {
  FolderOpen,
  FileText,
  Copy,
  Download,
  Link as LinkIcon,
  X,
  ChevronRight,
  ChevronDown,
  Search,
  Loader2,
  Check,
} from "lucide-react";

interface FileInfo {
  run: string;
  name: string;
  path: string;
}

interface GroupedFiles {
  [runId: string]: FileInfo[];
}

export default function ArtifactsPage() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "content" | "path">("idle");

  const fetchData = async () => {
    try {
      const res = await fetchJarvis("files");
      if (res.success) {
        setFiles(res.data || []);
        // Expand the first run by default if available
        if (res.data.length > 0) {
          setExpandedRuns(new Set([res.data[0].run]));
        }
      }
    } catch (error) {
      console.error("Failed to fetch artifacts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const groupedFiles = useMemo(() => {
    return files.reduce((acc: GroupedFiles, file) => {
      if (!acc[file.run]) acc[file.run] = [];
      acc[file.run].push(file);
      return acc;
    }, {});
  }, [files]);

  const toggleRun = (runId: string) => {
    const next = new Set(expandedRuns);
    if (next.has(runId)) next.delete(runId);
    else next.add(runId);
    setExpandedRuns(next);
  };

  const handleFileSelect = async (file: FileInfo) => {
    setSelectedFile(file);
    setContentLoading(true);
    setFileContent("");
    try {
      const res = await fetch(`/api/jarvis/files/content?path=${encodeURIComponent(file.path)}`);
      const data = await res.json();
      if (data.success) {
        setFileContent(data.data.content);
      } else {
        setFileContent(`Error loading file: ${data.error}`);
      }
    } catch (error) {
      setFileContent("Failed to connect to the internal API route.");
    } finally {
      setContentLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "content" | "path") => {
    navigator.clipboard.writeText(text);
    setCopyStatus(type);
    setTimeout(() => setCopyStatus("idle"), 2000);
  };

  const downloadFile = (file: FileInfo, content: string) => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>
      {/* File List Pane */}
      <div className="w-80 border-r border-border flex flex-col bg-card shrink-0 h-full">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2 mb-2">
            <FolderOpen className="w-5 h-5 text-accent" />
            Artifacts
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="Filter by run or file..." 
              className="w-full bg-card-elevated border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {Object.keys(groupedFiles).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">
              No artifacts found.
            </div>
          ) : (
            Object.entries(groupedFiles).reverse().map(([runId, runFiles]) => (
              <div key={runId} className="space-y-1">
                <button 
                  onClick={() => toggleRun(runId)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm font-semibold"
                >
                  {expandedRuns.has(runId) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <FolderOpen className="w-4 h-4 text-yellow-500/80" />
                  <span className="truncate">{runId.startsWith('run-') ? runId : `Run #${runId}`}</span>
                  <span className="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-muted">
                    {runFiles.length}
                  </span>
                </button>
                {expandedRuns.has(runId) && (
                  <div className="pl-6 space-y-0.5">
                    {runFiles.map((file) => (
                      <button
                        key={file.path}
                        onClick={() => handleFileSelect(file)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                          selectedFile?.path === file.path 
                          ? "bg-accent text-white font-medium" 
                          : "text-secondary hover:bg-white/5"
                        }`}
                      >
                        <FileText className={`w-3.5 h-3.5 ${selectedFile?.path === file.path ? "text-white" : "text-blue-400"}`} />
                        <span className="truncate">{file.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Content Pane */}
      <div className="flex-1 flex flex-col bg-background min-w-0 h-full relative">
        {selectedFile ? (
          <>
            {/* Header / Toolbar */}
            <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted mb-1">
                  <span>Artifacts</span>
                  <span>/</span>
                  <span>{selectedFile.run}</span>
                </div>
                <h2 className="text-lg font-bold truncate flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  {selectedFile.name}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => copyToClipboard(fileContent, "content")}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2 text-xs font-medium"
                  title="Copy Content"
                >
                  {copyStatus === "content" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">Copy Content</span>
                </button>
                <button 
                  onClick={() => copyToClipboard(selectedFile.path, "path")}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2 text-xs font-medium"
                  title="Copy Path"
                >
                   {copyStatus === "path" ? <Check className="w-4 h-4 text-green-500" /> : <LinkIcon className="w-4 h-4" />}
                   <span className="hidden sm:inline">Copy Path</span>
                </button>
                <button 
                  onClick={() => downloadFile(selectedFile, fileContent)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2 text-xs font-medium"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Markdown Content */}
            <div className="flex-1 overflow-auto">
              {contentLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : (
                <MarkdownPreview content={fileContent} />
              ) }
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted">
            <div className="w-16 h-16 bg-card-elevated rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-sm">Select an artifact to preview its content.</p>
          </div>
        )}
      </div>
    </div>
  );
}
