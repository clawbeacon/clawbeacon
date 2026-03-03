/**
 * @fileoverview Bankr LLM integration hook for Claw Beacon.
 * Provides AI-powered chat, task generation, summarization,
 * task review, and agent briefing.
 */

import { useState, useCallback } from 'react';
import type { Task, Message, Agent } from '../types';

const API_BASE: string =
  window.__CLAW_CONFIG__?.API_URL ??
  (import.meta.env.VITE_API_URL as string | undefined) ??
  '';

// ── API response shape ─────────────────────────────────────────────────────
interface BankrLLMResponse {
  choices?: { message?: { content?: string } }[];
}

// ── Core LLM caller — calls backend proxy to avoid CORS ───────────────────
async function callBankrLLM(
  messages: { role: string; content: string }[],
  systemPrompt?: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Bankr LLM error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as BankrLLMResponse;
  return data.choices?.[0]?.message?.content ?? '';
}

// ── Exported types ─────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GeneratedTask {
  title: string;
  description: string;
  status: 'todo';
  priority: 'high' | 'medium' | 'low';
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useBankrAI(tasks: Task[], messages: Message[], agents: Agent[]) {
  // Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hello! I'm your Claw Beacon AI assistant powered by Bankr LLM. Ask me anything about your tasks, agents, or project! 🦞",
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Generate task state
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Summary state
  const [summary, setSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Task review state
  const [taskReview, setTaskReview] = useState<string>('');
  const [taskReviewLoading, setTaskReviewLoading] = useState(false);
  const [taskReviewError, setTaskReviewError] = useState<string | null>(null);

  // Agent briefing state
  const [agentBriefing, setAgentBriefing] = useState<string>('');
  const [agentBriefingLoading, setAgentBriefingLoading] = useState(false);
  const [agentBriefingError, setAgentBriefingError] = useState<string | null>(null);

  // ── Feature 1: Chat ──────────────────────────────────────────────────────
  const sendChat = useCallback(
    async (userInput: string) => {
      if (!userInput.trim() || chatLoading) return;

      const userMsg: ChatMessage = { role: 'user', content: userInput };
      const newHistory = [...chatHistory, userMsg];
      setChatHistory(newHistory);
      setChatLoading(true);
      setChatError(null);

      const taskSummary = tasks
        .slice(0, 15)
        .map((t) => `[${t.status}] ${t.title}`)
        .join(', ');
      const agentSummary = agents.map((a) => `${a.name} (${a.status})`).join(', ');
      const recentActivity = messages
        .slice(-8)
        .map((m) => `${m.agentName}: ${m.content.slice(0, 80)}`)
        .join('\n');

      const systemPrompt = [
        'You are an AI assistant for the Claw Beacon dashboard — a Kanban board for AI agent teams.',
        '',
        'Current data:',
        `- Tasks (${tasks.length} total): ${taskSummary}`,
        `- Agents: ${agentSummary}`,
        '- Recent activity:',
        recentActivity,
        '',
        'Be concise, helpful, and use markdown when appropriate.',
      ].join('\n');

      try {
        const reply = await callBankrLLM(newHistory, systemPrompt);
        setChatHistory([...newHistory, { role: 'assistant', content: reply }]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setChatError(msg);
        setChatHistory([...newHistory, { role: 'assistant', content: `❌ ${msg}` }]);
      } finally {
        setChatLoading(false);
      }
    },
    [chatHistory, chatLoading, tasks, messages, agents],
  );

  const clearChat = useCallback(() => {
    setChatHistory([{ role: 'assistant', content: 'Chat reset. How can I help you? 🦞' }]);
    setChatError(null);
  }, []);

  // ── Feature 2: Generate Tasks ────────────────────────────────────────────
  const generateTasks = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || generateLoading) return;
      setGenerateLoading(true);
      setGenerateError(null);
      setGeneratedTasks([]);

      const systemPrompt = [
        'You are a task planner for an AI agent team in Claw Beacon.',
        'From the given description, create 3-5 relevant tasks.',
        '',
        'IMPORTANT: Reply ONLY with a raw JSON array — no markdown, no backticks, no extra text.',
        'Format:',
        '[{"title":"...","description":"...","status":"todo","priority":"high"}]',
        '',
        'priority must be one of: high, medium, low',
      ].join('\n');

      try {
        const raw = await callBankrLLM([{ role: 'user', content: prompt }], systemPrompt);
        const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(clean) as GeneratedTask[];
        if (!Array.isArray(parsed)) throw new Error('Response is not a valid JSON array');
        setGeneratedTasks(parsed);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to parse AI response';
        setGenerateError(msg);
      } finally {
        setGenerateLoading(false);
      }
    },
    [generateLoading],
  );

  const clearGeneratedTasks = useCallback(() => {
    setGeneratedTasks([]);
    setGenerateError(null);
  }, []);

  // ── Feature 3: Daily Summary ─────────────────────────────────────────────
  const generateSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    setSummary('');

    const stats = tasks.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    }, {});

    const recentActivity = messages
      .slice(-15)
      .map((m) => `${m.agentName}: ${m.content.slice(0, 100)}`)
      .join('\n');

    const agentStatuses = agents.map((a) => `${a.name}: ${a.status}`).join(', ');

    const systemPrompt = [
      'You are a daily reporter for an AI agent team in Claw Beacon.',
      'Write a concise summary in English using exactly this format:',
      '',
      '**Team Summary**',
      '- Completed: [count] tasks',
      '- In Progress: [count] tasks',
      '- Todo: [count] tasks',
      '- Backlog: [count] tasks',
      '',
      '**Agent Status**',
      '[list each agent status]',
      '',
      '**Activity Highlights**',
      '[2-3 key highlights from recent activity]',
      '',
      '**Recommendations**',
      '[1-2 actionable recommendations based on the data]',
    ].join('\n');

    try {
      const result = await callBankrLLM(
        [
          {
            role: 'user',
            content: [
              `Task stats: ${JSON.stringify(stats)}`,
              `Total: ${tasks.length}`,
              `Agents: ${agentStatuses}`,
              `Recent activity:\n${recentActivity}`,
            ].join('\n'),
          },
        ],
        systemPrompt,
      );
      setSummary(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setSummaryError(msg);
    } finally {
      setSummaryLoading(false);
    }
  }, [tasks, messages, agents]);

  // ── Feature 4: Task Reviewer ─────────────────────────────────────────────
  const reviewTasks = useCallback(async () => {
    setTaskReviewLoading(true);
    setTaskReviewError(null);
    setTaskReview('');

    const inProgress = tasks.filter((t) => t.status === 'in_progress');
    const review = tasks.filter((t) => t.status === 'review');
    const todo = tasks.filter((t) => t.status === 'todo');

    const taskDetail = (list: Task[]) =>
      list.map((t) => `- "${t.title}"${t.description ? `: ${t.description.slice(0, 100)}` : ''}`).join('\n');

    const recentActivity = messages
      .slice(-10)
      .map((m) => `${m.agentName}: ${m.content.slice(0, 100)}`)
      .join('\n');

    const agentStatuses = agents
      .map((a) => `${a.name} (${a.status})${a.role ? ` — ${a.role}` : ''}`)
      .join(', ');

    const systemPrompt = [
      'You are a senior project manager reviewing an AI agent team\'s work in Claw Beacon.',
      'Analyze the current tasks and identify bottlenecks, risks, and quick wins.',
      'Be direct and actionable. Use markdown formatting.',
      '',
      'Structure your review exactly like this:',
      '',
      '**🔍 Bottlenecks**',
      '[tasks that are stuck or at risk — explain why]',
      '',
      '**⚠️ Risks**',
      '[potential issues if not addressed soon]',
      '',
      '**✅ Quick Wins**',
      '[tasks that can be unblocked or completed quickly]',
      '',
      '**💡 Recommendations**',
      '[3 specific, actionable next steps for the team]',
    ].join('\n');

    const userContent = [
      `In Progress (${inProgress.length} tasks):\n${taskDetail(inProgress) || 'None'}`,
      '',
      `In Review (${review.length} tasks):\n${taskDetail(review) || 'None'}`,
      '',
      `Todo (${todo.length} tasks):\n${taskDetail(todo) || 'None'}`,
      '',
      `Agents: ${agentStatuses}`,
      '',
      `Recent activity:\n${recentActivity || 'No recent activity'}`,
    ].join('\n');

    try {
      const result = await callBankrLLM(
        [{ role: 'user', content: userContent }],
        systemPrompt,
      );
      setTaskReview(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setTaskReviewError(msg);
    } finally {
      setTaskReviewLoading(false);
    }
  }, [tasks, messages, agents]);

  const clearTaskReview = useCallback(() => {
    setTaskReview('');
    setTaskReviewError(null);
  }, []);

  // ── Feature 5: Agent Briefing ────────────────────────────────────────────
  const generateAgentBriefing = useCallback(
    async (agentId: string) => {
      setAgentBriefingLoading(true);
      setAgentBriefingError(null);
      setAgentBriefing('');

      const agent = agents.find((a) => a.id === agentId);
      if (!agent) {
        setAgentBriefingError('Agent not found');
        setAgentBriefingLoading(false);
        return;
      }

      const agentTasks = tasks.filter(
        (t) => t.agentId === agentId && t.status !== 'completed',
      );
      const completedCount = tasks.filter(
        (t) => t.agentId === agentId && t.status === 'completed',
      ).length;

      const taskDetail = agentTasks
        .map(
          (t) =>
            `- [${t.status.toUpperCase()}] "${t.title}"${
              t.description ? `: ${t.description.slice(0, 150)}` : ''
            }`,
        )
        .join('\n');

      const agentActivity = messages
        .filter((m) => m.agentName === agent.name)
        .slice(-5)
        .map((m) => `- ${m.content.slice(0, 120)}`)
        .join('\n');

      const teamContext = tasks
        .filter((t) => t.status === 'in_progress' && t.agentId !== agentId)
        .slice(0, 5)
        .map((t) => `- "${t.title}"`)
        .join('\n');

      const systemPrompt = [
        `You are a technical lead preparing a briefing for an AI agent called "${agent.name}".`,
        'Write a clear, structured briefing that gives the agent full context to start working immediately.',
        'Be specific and actionable. Use markdown formatting.',
        '',
        'Structure the briefing exactly like this:',
        '',
        `# Briefing for ${agent.name}`,
        '',
        '**🎯 Mission**',
        '[1-2 sentences summarizing the agent\'s current focus]',
        '',
        '**📋 Active Tasks**',
        '[list current tasks with clear next steps for each]',
        '',
        '**⚡ Priority Action**',
        '[the single most important thing to work on right now]',
        '',
        '**🔗 Team Context**',
        '[what the rest of the team is working on — for coordination]',
        '',
        '**📌 Notes**',
        '[any important constraints, dependencies, or watch-outs]',
      ].join('\n');

      const userContent = [
        `Agent: ${agent.name}`,
        `Role: ${agent.role ?? 'AI Agent'}`,
        `Status: ${agent.status}`,
        agent.description ? `Description: ${agent.description}` : '',
        '',
        `Assigned tasks (${agentTasks.length} active, ${completedCount} completed):`,
        taskDetail || 'No active tasks assigned',
        '',
        `Recent activity from ${agent.name}:`,
        agentActivity || 'No recent activity',
        '',
        'Other team members currently working on:',
        teamContext || 'No other tasks in progress',
      ]
        .filter(Boolean)
        .join('\n');

      try {
        const result = await callBankrLLM(
          [{ role: 'user', content: userContent }],
          systemPrompt,
        );
        setAgentBriefing(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setAgentBriefingError(msg);
      } finally {
        setAgentBriefingLoading(false);
      }
    },
    [tasks, messages, agents],
  );

  const clearAgentBriefing = useCallback(() => {
    setAgentBriefing('');
    setAgentBriefingError(null);
  }, []);

  return {
    // Chat
    chatHistory,
    chatLoading,
    chatError,
    sendChat,
    clearChat,
    // Generate tasks
    generatedTasks,
    generateLoading,
    generateError,
    generateTasks,
    clearGeneratedTasks,
    // Summary
    summary,
    summaryLoading,
    summaryError,
    generateSummary,
    // Task review
    taskReview,
    taskReviewLoading,
    taskReviewError,
    reviewTasks,
    clearTaskReview,
    // Agent briefing
    agentBriefing,
    agentBriefingLoading,
    agentBriefingError,
    generateAgentBriefing,
    clearAgentBriefing,
  };
}
