/**
 * @fileoverview BankrAIPanel — AI sidebar panel for Claw Beacon.
 * Tabs: Chat AI, Generate Tasks, Daily Summary, Task Reviewer, Agent Briefing.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Sparkles,
  ClipboardList,
  Send,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Bot,
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  BookOpen,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Task, Message, Agent } from '../types';
import { useBankrAI, type GeneratedTask, type ChatMessage } from '../hooks/useBankrAI';

const API_BASE: string =
  window.__CLAW_CONFIG__?.API_URL ??
  (import.meta.env.VITE_API_URL as string | undefined) ??
  '';

// ── Types ──────────────────────────────────────────────────────────────────
interface BankrAIPanelProps {
  tasks: Task[];
  messages: Message[];
  agents: Agent[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onTasksCreated?: () => void;
}

type TabId = 'chat' | 'generate' | 'summary' | 'review' | 'briefing';

const TABS: { id: TabId; icon: typeof MessageSquare; label: string }[] = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'generate', icon: Sparkles, label: 'Generate' },
  { id: 'summary', icon: ClipboardList, label: 'Summary' },
  { id: 'review', icon: Search, label: 'Review' },
  { id: 'briefing', icon: BookOpen, label: 'Briefing' },
];

// ── Priority badge ─────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${
        PRIORITY_COLORS[priority] ?? 'bg-white/10 text-white/60 border-white/10'
      }`}
    >
      {priority}
    </span>
  );
}

// ── Markdown result block ──────────────────────────────────────────────────
function MarkdownResult({ content }: { content: string }) {
  return (
    <div className="bg-white/5 border border-red-500/15 rounded-lg p-3">
      <div className="prose prose-invert prose-sm max-w-none text-gray-300 prose-p:my-1 prose-p:leading-relaxed prose-strong:text-white prose-headings:text-white prose-headings:text-sm prose-ul:my-1 prose-li:my-0.5 prose-code:text-red-400 prose-code:bg-red-500/10 prose-code:px-1 prose-code:rounded prose-code:text-[10px] prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

// ── Save tasks to Claw Beacon API ──────────────────────────────────────────
async function saveTasksToApi(tasks: GeneratedTask[]): Promise<number> {
  let saved = 0;
  for (const task of tasks) {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (res.ok) saved++;
    } catch {
      // continue on individual failure
    }
  }
  return saved;
}

// ── Tab: Chat ──────────────────────────────────────────────────────────────
interface ChatTabProps {
  chatHistory: ChatMessage[];
  chatLoading: boolean;
  chatError: string | null;
  sendChat: (input: string) => void;
  clearChat: () => void;
}

function ChatTab({ chatHistory, chatLoading, chatError, sendChat, clearChat }: ChatTabProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    sendChat(input.trim());
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [input, sendChat]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-3 space-y-3 min-h-0">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 px-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs ${
              msg.role === 'assistant'
                ? 'bg-red-500/20 border border-red-500/30'
                : 'bg-white/10 border border-white/10'
            }`}>
              {msg.role === 'assistant' ? '🦞' : '👤'}
            </div>
            <div className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed max-w-[85%] ${
              msg.role === 'assistant'
                ? 'bg-white/5 border border-white/5 text-gray-200 rounded-tl-sm'
                : 'bg-red-500/10 border border-red-500/20 text-white rounded-tr-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm max-w-none prose-p:my-0.5 prose-p:leading-relaxed prose-strong:text-white prose-code:text-red-400 prose-code:bg-red-500/10 prose-code:px-1 prose-code:rounded prose-code:text-[10px] prose-code:before:content-none prose-code:after:content-none prose-ul:my-1 prose-li:my-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="flex gap-2.5 px-3">
            <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center bg-red-500/20 border border-red-500/30 text-xs">🦞</div>
            <div className="bg-white/5 border border-white/5 rounded-xl rounded-tl-sm px-3 py-2.5">
              <div className="flex gap-1 items-center">
                {([0, 1, 2] as const).map((n) => (
                  <div key={n} className="w-1.5 h-1.5 rounded-full bg-red-400/60 animate-bounce" style={{ animationDelay: `${n * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {chatError && (
          <div className="mx-3 flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{chatError}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 border-t border-white/5 p-3 space-y-2">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your tasks or team..."
            rows={2}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 resize-none focus:outline-none focus:border-red-500/40 transition-colors"
          />
          <div className="flex flex-col gap-1.5">
            <button onClick={handleSend} disabled={chatLoading || !input.trim()} className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center hover:bg-red-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              <Send className="w-3.5 h-3.5 text-red-400" />
            </button>
            <button onClick={clearChat} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all" title="Reset chat">
              <Trash2 className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-gray-600">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ── Tab: Generate Tasks ────────────────────────────────────────────────────
interface GenerateTabProps {
  generatedTasks: GeneratedTask[];
  generateLoading: boolean;
  generateError: string | null;
  generateTasks: (prompt: string) => void;
  clearGeneratedTasks: () => void;
  onTasksCreated?: () => void;
}

function GenerateTab({ generatedTasks, generateLoading, generateError, generateTasks, clearGeneratedTasks, onTasksCreated }: GenerateTabProps) {
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const handleGenerate = () => { setSavedCount(null); generateTasks(prompt); };

  const handleSave = async () => {
    if (generatedTasks.length === 0) return;
    setSaving(true);
    const count = await saveTasksToApi(generatedTasks);
    setSavedCount(count);
    setSaving(false);
    clearGeneratedTasks();
    setPrompt('');
    onTasksCreated?.();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 space-y-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Project Description</label>
          <textarea
            value={prompt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
            placeholder='Example: "Build an authentication feature with Google login and JWT tokens"'
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 resize-none focus:outline-none focus:border-red-500/40 transition-colors"
          />
        </div>

        <button onClick={handleGenerate} disabled={generateLoading || !prompt.trim()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          {generateLoading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating...</>) : (<><Sparkles className="w-3.5 h-3.5" />Generate Tasks</>)}
        </button>

        {generateError && (
          <div className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{generateError}</span>
          </div>
        )}

        {savedCount !== null && (
          <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /><span>{savedCount} tasks saved to Kanban!</span>
          </div>
        )}

        {generatedTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Preview ({generatedTasks.length} tasks)</span>
              <button onClick={clearGeneratedTasks} className="text-[10px] text-gray-500 hover:text-white transition-colors flex items-center gap-1">
                <RotateCcw className="w-2.5 h-2.5" /> Reset
              </button>
            </div>
            {generatedTasks.map((task, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-white leading-snug">{task.title}</span>
                  <PriorityBadge priority={task.priority} />
                </div>
                {task.description && <p className="text-[10px] text-gray-500 leading-relaxed">{task.description}</p>}
              </div>
            ))}
            <button onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-all disabled:opacity-40">
              {saving ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</>) : (<><Plus className="w-3.5 h-3.5" />Save to Kanban Board</>)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Summary ───────────────────────────────────────────────────────────
interface SummaryTabProps {
  tasks: Task[];
  summary: string;
  summaryLoading: boolean;
  summaryError: string | null;
  generateSummary: () => void;
}

function SummaryTab({ tasks, summary, summaryLoading, summaryError, generateSummary }: SummaryTabProps) {
  const stats = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  const STAT_CARDS = [
    { key: 'backlog', label: 'Backlog', color: 'text-gray-400', border: 'border-white/10', bg: 'bg-white/5' },
    { key: 'todo', label: 'Todo', color: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5' },
    { key: 'in_progress', label: 'In Progress', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5' },
    { key: 'completed', label: 'Done', color: 'text-green-400', border: 'border-green-500/20', bg: 'bg-green-500/5' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {STAT_CARDS.map((s) => (
            <div key={s.key} className={`${s.bg} border ${s.border} rounded-lg p-2.5 text-center`}>
              <div className={`text-xl font-bold font-mono ${s.color}`}>{stats[s.key] ?? 0}</div>
              <div className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        <button onClick={generateSummary} disabled={summaryLoading} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          {summaryLoading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing...</>) : (<><ClipboardList className="w-3.5 h-3.5" />Generate AI Summary</>)}
        </button>

        {summaryError && (
          <div className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{summaryError}</span>
          </div>
        )}

        {summary && (
          <div className="bg-white/5 border border-red-500/15 rounded-lg p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-red-400/70 mb-2 flex items-center gap-1.5">
              <Bot className="w-3 h-3" /> Bankr AI Report
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-gray-300 prose-p:my-1 prose-p:leading-relaxed prose-strong:text-white prose-headings:text-white prose-ul:my-1 prose-li:my-0.5">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Task Reviewer ─────────────────────────────────────────────────────
interface ReviewTabProps {
  tasks: Task[];
  taskReview: string;
  taskReviewLoading: boolean;
  taskReviewError: string | null;
  reviewTasks: () => void;
  clearTaskReview: () => void;
}

function ReviewTab({ tasks, taskReview, taskReviewLoading, taskReviewError, reviewTasks, clearTaskReview }: ReviewTabProps) {
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const reviewCount = tasks.filter((t) => t.status === 'review').length;
  const todoCount = tasks.filter((t) => t.status === 'todo').length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 space-y-3">
        {/* Context cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold font-mono text-blue-400">{inProgressCount}</div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wider">In Progress</div>
          </div>
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold font-mono text-purple-400">{reviewCount}</div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wider">In Review</div>
          </div>
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold font-mono text-yellow-400">{todoCount}</div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wider">Todo</div>
          </div>
        </div>

        <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-gray-400 leading-relaxed">
          AI will analyze your active tasks, detect bottlenecks, identify risks, and suggest quick wins.
        </div>

        <button
          onClick={reviewTasks}
          disabled={taskReviewLoading || (inProgressCount + reviewCount + todoCount === 0)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {taskReviewLoading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Reviewing...</>
          ) : (
            <><Search className="w-3.5 h-3.5" />Review Active Tasks</>
          )}
        </button>

        {taskReviewError && (
          <div className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{taskReviewError}</span>
          </div>
        )}

        {taskReview && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Bot className="w-3 h-3 text-red-400" /> AI Review
              </span>
              <button onClick={clearTaskReview} className="text-[10px] text-gray-500 hover:text-white transition-colors flex items-center gap-1">
                <RotateCcw className="w-2.5 h-2.5" /> Clear
              </button>
            </div>
            <MarkdownResult content={taskReview} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Agent Briefing ────────────────────────────────────────────────────
interface BriefingTabProps {
  agents: Agent[];
  tasks: Task[];
  agentBriefing: string;
  agentBriefingLoading: boolean;
  agentBriefingError: string | null;
  generateAgentBriefing: (agentId: string) => void;
  clearAgentBriefing: () => void;
}

function BriefingTab({ agents, tasks, agentBriefing, agentBriefingLoading, agentBriefingError, generateAgentBriefing, clearAgentBriefing }: BriefingTabProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const handleGenerate = () => {
    if (!selectedAgentId) return;
    generateAgentBriefing(selectedAgentId);
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const agentTaskCount = selectedAgentId
    ? tasks.filter((t) => t.agentId === selectedAgentId && t.status !== 'completed').length
    : 0;

  const STATUS_COLORS: Record<string, string> = {
    working: 'bg-green-500/20 text-green-400 border-green-500/30',
    idle: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    offline: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 space-y-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Select Agent
          </label>

          {agents.length === 0 ? (
            <p className="text-[10px] text-gray-500 italic">No agents available</p>
          ) : (
            <div className="space-y-1.5">
              {agents.map((agent) => {
                const taskCount = tasks.filter((t) => t.agentId === agent.id && t.status !== 'completed').length;
                const isSelected = selectedAgentId === agent.id;
                return (
                  <button
                    key={agent.id}
                    onClick={() => { setSelectedAgentId(agent.id); clearAgentBriefing(); }}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-sm flex-shrink-0">
                      {agent.avatar ?? '🤖'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white truncate">{agent.name}</span>
                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded border uppercase tracking-wider flex-shrink-0 ${STATUS_COLORS[agent.status] ?? STATUS_COLORS['offline']}`}>
                          {agent.status}
                        </span>
                      </div>
                      <p className="text-[9px] text-gray-500 mt-0.5">
                        {taskCount} active task{taskCount !== 1 ? 's' : ''}
                        {agent.role ? ` · ${agent.role}` : ''}
                      </p>
                    </div>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedAgent && (
          <button
            onClick={handleGenerate}
            disabled={agentBriefingLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {agentBriefingLoading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating briefing...</>
            ) : (
              <><BookOpen className="w-3.5 h-3.5" />Generate Briefing for {selectedAgent.name}</>
            )}
          </button>
        )}

        {selectedAgent && agentTaskCount === 0 && !agentBriefing && !agentBriefingLoading && (
          <div className="flex items-start gap-2 p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{selectedAgent.name} has no active tasks assigned. Briefing will be based on team context.</span>
          </div>
        )}

        {agentBriefingError && (
          <div className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{agentBriefingError}</span>
          </div>
        )}

        {agentBriefing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Bot className="w-3 h-3 text-red-400" /> Agent Briefing
              </span>
              <button onClick={clearAgentBriefing} className="text-[10px] text-gray-500 hover:text-white transition-colors flex items-center gap-1">
                <RotateCcw className="w-2.5 h-2.5" /> Clear
              </button>
            </div>
            <MarkdownResult content={agentBriefing} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────
export function BankrAIPanel({
  tasks,
  messages,
  agents,
  collapsed,
  onToggleCollapse,
  onTasksCreated,
}: BankrAIPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const ai = useBankrAI(tasks, messages, agents);

  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4 bg-white/[0.02] gap-3">
        <button onClick={onToggleCollapse} className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-all hover:scale-105" title="Expand Bankr AI">
          <ChevronLeft className="w-4 h-4 text-red-400" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-lg">🦞</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-white/5 bg-white/[0.02] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <button onClick={onToggleCollapse} className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-all hover:scale-105" title="Collapse Bankr AI">
            <ChevronRight className="w-3.5 h-3.5 text-red-400" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
              🦞 Bankr AI
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
              </span>
            </h2>
            <p className="text-[9px] text-gray-500 tracking-wider">Powered by Bankr LLM</p>
          </div>
        </div>
      </div>

      {/* Tabs — 5 tabs, compact */}
      <div className="flex border-b border-white/5 flex-shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[8px] font-semibold uppercase tracking-wider transition-all border-b-2 ${
                isActive
                  ? 'text-red-400 border-red-400 bg-red-500/5'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <ChatTab chatHistory={ai.chatHistory} chatLoading={ai.chatLoading} chatError={ai.chatError} sendChat={ai.sendChat} clearChat={ai.clearChat} />
        )}
        {activeTab === 'generate' && (
          <GenerateTab generatedTasks={ai.generatedTasks} generateLoading={ai.generateLoading} generateError={ai.generateError} generateTasks={ai.generateTasks} clearGeneratedTasks={ai.clearGeneratedTasks} onTasksCreated={onTasksCreated} />
        )}
        {activeTab === 'summary' && (
          <SummaryTab tasks={tasks} summary={ai.summary} summaryLoading={ai.summaryLoading} summaryError={ai.summaryError} generateSummary={ai.generateSummary} />
        )}
        {activeTab === 'review' && (
          <ReviewTab tasks={tasks} taskReview={ai.taskReview} taskReviewLoading={ai.taskReviewLoading} taskReviewError={ai.taskReviewError} reviewTasks={ai.reviewTasks} clearTaskReview={ai.clearTaskReview} />
        )}
        {activeTab === 'briefing' && (
          <BriefingTab agents={agents} tasks={tasks} agentBriefing={ai.agentBriefing} agentBriefingLoading={ai.agentBriefingLoading} agentBriefingError={ai.agentBriefingError} generateAgentBriefing={ai.generateAgentBriefing} clearAgentBriefing={ai.clearAgentBriefing} />
        )}
      </div>
    </div>
  );
}
