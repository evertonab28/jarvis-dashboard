"use client";

import React, { useEffect, useState } from "react";
import { fetchJarvis } from "@/lib/api-client";
import {
  History,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertCircle,
  ExternalLink,
  Calendar,
} from "lucide-react";

interface Run {
  Id: number;
  Name: string;
  Status: string;
  CurrentStep: string;
  StartedAt: string;
  FinishedAt: string;
  ErrorMessage: string;
}

interface FileInfo {
  run: string;
  name: string;
  path: string;
}

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    try {
      const [runsRes, filesRes] = await Promise.all([
        fetchJarvis("runs"),
        fetchJarvis("files"),
      ]);

      if (runsRes.success) setRuns(runsRes.data.list || []);
      if (filesRes.success) setFiles(filesRes.data || []);
    } catch (error) {
      console.error("Failed to fetch runs data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (id: number) => {
    const next = new Set(expandedRuns);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedRuns(next);
  };

  const statusMap: Record<string, { color: string; icon: any; bg: string }> = {
    Completed: { color: "var(--success)", icon: CheckCircle, bg: "rgba(34,197,94,0.15)" },
    Success: { color: "var(--success)", icon: CheckCircle, bg: "rgba(34,197,94,0.15)" },
    Failed: { color: "var(--error)", icon: XCircle, bg: "rgba(239,68,68,0.15)" },
    Error: { color: "var(--error)", icon: XCircle, bg: "rgba(239,68,68,0.15)" },
    "In Progress": { color: "var(--accent)", icon: Clock, bg: "rgba(168,85,247,0.15)" },
    Running: { color: "var(--accent)", icon: Clock, bg: "rgba(168,85,247,0.15)" },
    Pending: { color: "var(--text-muted)", icon: Clock, bg: "rgba(255,255,255,0.05)" },
  };

  const getStatusStyle = (status: string) => statusMap[status] || statusMap["Pending"];

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "—";
    const date = new Date(timeStr);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
          <History className="w-8 h-8 text-purple-400" />
          Workflow Runs
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Track and audit all your AI automation executions.
        </p>
      </div>

      {/* Table Container */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'var(--card-elevated)', borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}></th>
                <th className="px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>ID</th>
                <th className="px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Current Step</th>
                <th className="px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Started At</th>
                <th className="px-4 py-3 font-semibold text-right" style={{ color: 'var(--text-secondary)' }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const style = getStatusStyle(run.Status);
                const isExpanded = expandedRuns.has(run.Id);
                const runFiles = files.filter(f => f.run === run.Id.toString() || f.run === `run-${run.Id}`);

                return (
                  <React.Fragment key={run.Id}>
                    <tr 
                      className="cursor-pointer transition-colors hover:bg-white/5"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onClick={() => toggleExpand(run.Id)}
                    >
                      <td className="px-4 py-4 w-10">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </td>
                      <td className="px-4 py-4 font-mono font-bold text-xs">#{run.Id}</td>
                      <td className="px-4 py-4">
                        <span 
                          className="px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 w-fit"
                          style={{ backgroundColor: style.bg, color: style.color }}
                        >
                          <style.icon className="w-3 h-3" />
                          {run.Status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {run.CurrentStep || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatTime(run.StartedAt)}
                      </td>
                      <td className="px-4 py-4 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {run.FinishedAt ? "Completed" : "Active"}
                      </td>
                    </tr>

                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <div className="p-6 bg-black/20" style={{ borderBottom: '1px solid var(--border)' }}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Run Info */}
                              <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
                                  <AlertCircle className="w-3 h-3" />
                                  Execution Details
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs pb-2 border-b border-white/5">
                                    <span style={{ color: 'var(--text-secondary)' }}>Finished At</span>
                                    <span style={{ color: 'var(--text-primary)' }}>{formatTime(run.FinishedAt)}</span>
                                  </div>
                                  {run.ErrorMessage && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mt-2">
                                      <span className="text-xs font-bold text-red-500 block mb-1">Error Message</span>
                                      <p className="text-xs text-red-400 font-mono">{run.ErrorMessage}</p>
                                    </div>
                                  )}
                                  {!run.ErrorMessage && run.Status === 'Completed' && (
                                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 mt-2">
                                      <p className="text-xs text-green-400">Execution finished successfully without errors.</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Associated Files */}
                              <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
                                  <FileText className="w-3 h-3" />
                                  Generated Files ({runFiles.length})
                                </h4>
                                {runFiles.length === 0 ? (
                                  <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No files generated for this run.</p>
                                ) : (
                                  <div className="grid grid-cols-1 gap-2">
                                    {runFiles.map((file, i) => (
                                      <div 
                                        key={i}
                                        className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all"
                                      >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                          <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                          <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                            {file.name}
                                          </span>
                                        </div>
                                        <button className="p-1 hover:text-blue-400 transition-colors">
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
