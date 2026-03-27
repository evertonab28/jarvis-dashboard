"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchJarvis } from "@/lib/api-client";
import {
  LayoutGrid,
  Search,
  Filter,
  MoreVertical,
  Plus,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Loader2,
  Calendar,
} from "lucide-react";

interface Task {
  Id: number;
  Title: string;
  Status: "backlog" | "in_progress" | "done" | "blocked";
  Priority: "High" | "Medium" | "Low";
  AssignedTo: string;
  RunId: string;
  CreatedAt: string;
}

const COLUMNS = [
  { id: "backlog", title: "Backlog", icon: Circle, color: "var(--text-muted)" },
  { id: "in_progress", title: "In Progress", icon: Clock, color: "var(--accent)" },
  { id: "done", title: "Done", icon: CheckCircle2, color: "var(--success)" },
  { id: "blocked", title: "Blocked", icon: AlertCircle, color: "var(--error)" },
];

const PRIORITY_ICONS = {
  High: { icon: ArrowUp, color: "var(--error)" },
  Medium: { icon: ArrowRight, color: "var(--warning)" },
  Low: { icon: ArrowDown, color: "var(--success)" },
};

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [filterRun, setFilterRun] = useState<string>("All");
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetchJarvis("tasks");
      if (res.success) {
        // Map NocoDB fields to our interface if they differ
        // For now assuming: Title, Status, Priority, AssignedTo, RunId
        setTasks(res.data.list || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData("taskId", taskId.toString());
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData("taskId"));
    const task = tasks.find((t) => t.Id === taskId);

    if (task && task.Status !== newStatus) {
      // Optimistic update
      const oldTasks = [...tasks];
      setTasks(tasks.map((t) => (t.Id === taskId ? { ...t, Status: newStatus as any } : t)));
      setIsUpdating(taskId);

      try {
        const response = await fetch("/api/jarvis/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: taskId, Status: newStatus }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to update task");
        }
      } catch (error) {
        console.error("Update failed:", error);
        setTasks(oldTasks); // Rollback
        alert("Failed to update task status. Rolling back.");
      } finally {
        setIsUpdating(null);
      }
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.Title?.toLowerCase().includes(filterText.toLowerCase()) || 
                            task.AssignedTo?.toLowerCase().includes(filterText.toLowerCase());
      const matchesPriority = filterPriority === "All" || task.Priority === filterPriority;
      const matchesRun = filterRun === "All" || task.RunId === filterRun;
      return matchesSearch && matchesPriority && matchesRun;
    });
  }, [tasks, filterText, filterPriority, filterRun]);

  const uniqueRuns = useMemo(() => Array.from(new Set(tasks.map(t => t.RunId).filter(Boolean))), [tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 h-full flex flex-col space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            <LayoutGrid className="w-8 h-8 text-accent" />
            Task Kanban
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your agent-generated workflow tasks.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-card border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent w-48"
            />
          </div>
          
          <select 
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select 
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            value={filterRun}
            onChange={(e) => setFilterRun(e.target.value)}
          >
            <option value="All">All Runs</option>
            {uniqueRuns.map(run => <option key={run} value={run}>{run}</option>)}
          </select>

          <button className="p-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex flex-1 gap-6 overflow-x-auto pb-4 scrollbar-thin">
        {COLUMNS.map((column) => (
          <div 
            key={column.id}
            className="flex flex-col w-80 shrink-0 bg-card-elevated rounded-xl border border-border"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="p-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-2">
                <column.icon className="w-4 h-4" style={{ color: column.color }} />
                <h3 className="font-bold text-sm uppercase tracking-wider">{column.title}</h3>
                <span className="text-xs text-muted font-mono">
                  {filteredTasks.filter(t => t.Status === column.id).length}
                </span>
              </div>
              <button className="text-muted hover:text-primary">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Column Body / Cards */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {filteredTasks
                .filter((t) => t.Status === column.id)
                .map((task) => {
                  const PrioIcon = PRIORITY_ICONS[task.Priority]?.icon || ArrowRight;
                  const prioColor = PRIORITY_ICONS[task.Priority]?.color || "var(--text-secondary)";
                  
                  return (
                    <div
                      key={task.Id}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, task.Id)}
                      className={`p-4 bg-card border border-border rounded-xl cursor-grab active:cursor-grabbing hover:border-accent group transition-all relative ${
                        isUpdating === task.Id ? "opacity-50 grayscale" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono font-bold text-muted bg-white/5 px-1.5 py-0.5 rounded">
                          #{task.Id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <PrioIcon className="w-3 h-3" style={{ color: prioColor }} />
                          <span className="text-[10px] font-bold uppercase" style={{ color: prioColor }}>{task.Priority}</span>
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold mb-3 leading-tight group-hover:text-accent transition-colors">
                        {task.Title}
                      </h4>

                      <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                            <User className="w-3 h-3 text-accent" />
                          </div>
                          <span className="text-[10px] text-secondary">{task.AssignedTo || "Unassigned"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted">
                           <Calendar className="w-3 h-3" />
                           <span className="text-[10px]">{task.RunId}</span>
                        </div>
                      </div>

                      {isUpdating === task.Id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-xl">
                          <Loader2 className="w-5 h-5 animate-spin text-accent" />
                        </div>
                      )}
                    </div>
                  );
                })}
              
              {/* Empty state per column */}
              {filteredTasks.filter((t) => t.Status === column.id).length === 0 && (
                <div className="h-32 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-muted text-xs italic">
                  No tasks here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
