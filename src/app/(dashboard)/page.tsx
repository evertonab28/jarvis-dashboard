"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { fetchJarvis } from "@/lib/api-client";
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Server,
  Terminal,
  Play,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";

interface Run {
  Id: number;
  Name: string;
  Status: string;
}

interface Task {
  Id: number;
  Name: string;
  Status: string;
}

interface FileInfo {
  run: string;
  name: string;
  path: string;
}

interface Health {
  api: string;
  nocodb: string;
  files: string;
}

export default function DashboardPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Workflow creation state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [workflowType, setWorkflowType] = useState("sistema_existente");
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const loadData = async () => {
    try {
      const [runsRes, tasksRes, filesRes, healthRes] = await Promise.all([
        fetchJarvis("runs"),
        fetchJarvis("tasks"),
        fetchJarvis("files"),
        fetchJarvis("health"),
      ]);

      if (runsRes.success) setRuns(runsRes.data.list || []);
      if (tasksRes.success) setTasks(tasksRes.data.list || []);
      if (filesRes.success) setFiles(filesRes.data || []);
      if (healthRes.success) setHealth(healthRes.data);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleCreateRun = async () => {
    setIsCreating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/jarvis/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow_type: workflowType }),
      });
      const data = await res.json();
      
      if (data.success) {
        setFeedback({ type: 'success', msg: 'Workflow queued successfully!' });
        loadData(); // Refresh list
        setTimeout(() => {
          setIsModalOpen(false);
          setFeedback(null);
        }, 2000);
      } else {
        setFeedback({ type: 'error', msg: `Error: ${data.error || 'Failed to start'}` });
      }
    } catch (error: any) {
      setFeedback({ type: 'error', msg: `Error: ${error.message}` });
    } finally {
      setIsCreating(false);
    }
  };

  const stats = {
    totalRuns: runs.length,
    completedRuns: runs.filter(r => r.Status === 'Completed' || r.Status === 'Success').length,
    inProgressRuns: runs.filter(r => r.Status === 'In Progress' || r.Status === 'Running').length,
    backlogTasks: tasks.filter(t => t.Status === 'Backlog' || t.Status === 'Todo').length,
    blockedTasks: tasks.filter(t => t.Status === 'Blocked').length,
  };

  return (
    <div className="p-4 md:p-8 relative">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex justify-between items-end">
        <div>
          <h1 
            className="text-2xl md:text-3xl font-bold mb-1"
            style={{ 
              fontFamily: 'var(--font-heading)',
              color: 'var(--text-primary)',
              letterSpacing: '-1.5px'
            }}
          >
            🦞 Jarvis Control
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Mission Control for your AI automation runner
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {health && (
            <div className="hidden sm:flex gap-2 mb-1">
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${health.api === 'ok' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                API: {health.api}
              </span>
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${health.nocodb === 'ok' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                DB: {health.nocodb}
              </span>
            </div>
          )}
          
          <button 
            id="run-workflow-btn"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-sm shadow-xl transition-all z-10"
            style={{ backgroundColor: '#3b82f6', border: 'none', cursor: 'pointer' }}
          >
            <Play className="w-4 h-4 fill-current" />
            Rodar Workflow
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 md:mb-8">
        <StatsCard
          title="Total Runs"
          value={stats.totalRuns.toString()}
          icon={<Activity className="w-5 h-5" />}
          iconColor="var(--info)"
        />
        <StatsCard
          title="Completed"
          value={stats.completedRuns.toString()}
          icon={<CheckCircle className="w-5 h-5" />}
          iconColor="var(--success)"
        />
        <StatsCard
          title="In Progress"
          value={stats.inProgressRuns.toString()}
          icon={<Clock className="w-5 h-5" />}
          iconColor="var(--accent)"
        />
        <StatsCard
          title="Backlog Tasks"
          value={stats.backlogTasks.toString()}
          icon={<Terminal className="w-5 h-5" />}
          iconColor="var(--text-muted)"
        />
        <StatsCard
          title="Blocked"
          value={stats.blockedTasks.toString()}
          icon={<AlertTriangle className="w-5 h-5" />}
          iconColor="var(--error)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Files */}
        <div 
          className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div 
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <div className="accent-line" />
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Latest Generated Files
              </h2>
            </div>
            <Link href="/artifacts" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              Explore Output →
            </Link>
          </div>
          <div className="p-0 max-h-[400px] overflow-y-auto">
            {files.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No files generated yet.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead style={{ backgroundColor: 'var(--card-elevated)', color: 'var(--text-secondary)' }}>
                  <tr>
                    <th className="px-5 py-3 font-medium">File Name</th>
                    <th className="px-5 py-3 font-medium">Run ID</th>
                    <th className="px-5 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border">
                  {files.slice(0, 10).map((file, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span className="font-medium">{file.name}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white/70">
                          {file.run}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link href="/artifacts" className="text-xs font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Links / Metadata */}
        <div className="flex flex-col gap-4">
          <div 
            className="rounded-xl p-5"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Server className="w-4 h-4 text-purple-400" />
              Deployment Info
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>Environment</span>
                <span className="font-mono text-green-400">Production</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>Region</span>
                <span className="font-mono">VPS Local</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>Platform</span>
                <span className="font-mono">TenacitOS Core</span>
              </div>
            </div>
          </div>

          <div 
            className="rounded-xl p-5 flex-1"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Quick Navigation
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Link href="/runs" className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5 flex items-center justify-between group">
                <span className="text-sm">Workflow Runs</span>
                <Activity className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              </Link>
              <Link href="/kanban" className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5 flex items-center justify-between group">
                <span className="text-sm">Task Kanban</span>
                <Terminal className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl border border-border bg-card animate-in zoom-in-95 duration-200"
            style={{ backgroundColor: 'var(--card)' }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Play className="w-5 h-5 text-accent fill-current" />
                Novo Workflow
              </h2>
              <button 
                onClick={() => !isCreating && setIsModalOpen(false)}
                className="p-1 hover:bg-white/5 rounded-full transition-colors"
                disabled={isCreating}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold uppercase text-muted mb-2">Selecione o Tipo</label>
                <select 
                  value={workflowType}
                  onChange={(e) => setWorkflowType(e.target.value)}
                  className="w-full bg-card-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={isCreating}
                >
                  <option value="sistema_existente">Sistema Existente (Standard)</option>
                  <option value="audit_security">Security Audit</option>
                  <option value="code_review">Automated Code Review</option>
                </select>
              </div>
              
              <p className="text-xs text-muted leading-relaxed">
                Ao iniciar, o Jarvis criará uma nova fila de execução no NocoDB. O runner local detectará a tarefa e iniciará o processamento automaticamente.
              </p>
            </div>

            {feedback && (
              <div className={`mb-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                feedback.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {feedback.msg}
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-border font-bold text-sm hover:bg-white/5 transition-colors"
                disabled={isCreating}
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateRun}
                className="flex-1 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  'Confirmar Run'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
