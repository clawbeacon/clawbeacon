/**
 * @fileoverview Bankr LLM integration hook for Claw Beacon.
 * Provides AI-powered chat, task generation, and summarization.
 */

import { useState, useCallback } from 'react';
import type { Task, Message, Agent } from '../types';

const BANKR_BASE = 'https://llm.bankr.bot/v1';
const BANKR_KEY: string =
  window.__CLAW_CONFIG__?.BANKR_LLM_KEY ??
  (import.meta.env.VITE_BANKR_LLM_KEY as string | undefined) ??
  '';
const MODEL = 'gemini-3-flash';

// ── API response shape ─────────────────────────────────────────────────────
interface BankrLLMResponse {
  choices?: { message?: { content?: string } }[];
}

// ── Core LLM caller ────────────────────────────────────────────────────────
async function callBankrLLM(
  messages: { role: string; content: string }[],
  systemPrompt?: string,
): Promise<string> {
  if (!BANKR_KEY) throw new Error('VITE_BANKR_LLM_KEY is not set in .env');

  const res = await fetch(`${BANKR_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BANKR_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...messages,
      ],
    }),
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
        const reply = await callBankrLLM(
          newHistory,
          systemPrompt,
        );
        setChatHistory([...newHistory, { role: 'assistant', content: reply }]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setChatError(msg);
        setChatHistory([
          ...newHistory,
          { role: 'assistant', content: `❌ ${msg}` },
        ]);
      } finally {
        setChatLoading(false);
      }
    },
    [chatHistory, chatLoading, tasks, messages, agents],
  );

  const clearChat = useCallback(() => {
    setChatHistory([
      {
        role: 'assistant',
        content: 'Chat reset. How can I help you? 🦞',
      },
    ]);
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

  return {
    chatHistory,
    chatLoading,
    chatError,
    sendChat,
    clearChat,
    generatedTasks,
    generateLoading,
    generateError,
    generateTasks,
    clearGeneratedTasks,
    summary,
    summaryLoading,
    summaryError,
    generateSummary,
  };
}
