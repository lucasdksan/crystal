"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import type { ChatMessage, DashboardData } from "@/frontend/types/dashboard";
import { sendChatMessage, getProactiveInsights } from "@/backend/actions/chat";
import {
  Send,
  Sparkles,
  Bot,
  ArrowRight,
  User,
  RefreshCw,
} from "lucide-react";

interface MentorChatProps {
  data: DashboardData;
}

function formatChatTime(date = new Date()) {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildWelcomeMessage(data: DashboardData, insights: string[]): ChatMessage {
  const insightsText = insights.length > 0
    ? `\n\n**Insights prioritários:**\n\n${insights.join("\n\n")}`
    : "";

  return {
    id: "default",
    sender: "assistant",
    text: `Olá! Sou o **Crystal Copilot**, seu consultor comercial VTEX.

**Health Score:** ${data.healthScore.overall}/100 · **Cancelamento:** ${data.overview.taxaCancelamento.toFixed(1)}% · **Perda:** R$ ${data.overview.perdaEstimada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}${insightsText}

O que você gostaria de explorar?`,
    timestamp: formatChatTime(),
  };
}

export function MentorChat({ data }: MentorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!initialized) {
      getProactiveInsights(data).then((insights) => {
        setMessages([buildWelcomeMessage(data, insights)]);
        setInitialized(true);
      });
    }
  }, [data, initialized]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const quickPrompts = [
    {
      label: "💡 Reduzir cancelamentos",
      query: "Como reduzir cancelamento e recuperar faturamento?",
    },
    {
      label: "📊 Segmentos de clientes",
      query: "Quais são os segmentos de clientes e o que fazer com cada um?",
    },
    {
      label: "❤️ Retenção de clientes",
      query: "Como reter clientes em risco de abandono?",
    },
    {
      label: "📦 Estoque e ruptura",
      query: "Quais produtos estão em risco de ruptura e o que comprar?",
    },
  ];

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: textToSend,
      timestamp: formatChatTime(),
    };

    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setInputVal("");
    setIsLoading(true);

    try {
      const response = await sendChatMessage(updatedMsgs, data);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "assistant",
          text: response.text,
          timestamp: formatChatTime(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "assistant",
          text: "Erro ao processar. Tente novamente.",
          timestamp: formatChatTime(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputVal);
  };

  const handleReset = () => {
    getProactiveInsights(data).then((insights) => {
      setMessages([buildWelcomeMessage(data, insights)]);
    });
  };

  return (
    <div className="flex flex-col h-[600px] bg-white border border-slate-100 rounded-2xl overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Mentor IA Copilot</h3>
            <p className="text-[10px] text-slate-500">Consultor comercial VTEX</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
          title="Reiniciar conversa"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.sender === "user"
                  ? "bg-slate-100 text-slate-600"
                  : "bg-indigo-100 text-indigo-600"
              }`}
            >
              {msg.sender === "user" ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.sender === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-50 text-slate-800 border border-slate-100"
              }`}
            >
              {msg.text.split("\n").map((line, i) => (
                <span key={i}>
                  {line.split("**").map((part, j) =>
                    j % 2 === 1 ? (
                      <strong key={j}>{part}</strong>
                    ) : (
                      part
                    ),
                  )}
                  {i < msg.text.split("\n").length - 1 && <br />}
                </span>
              ))}
              <span className="block text-[10px] opacity-50 mt-1">{msg.timestamp}</span>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-600 animate-pulse" />
            </div>
            <div className="bg-slate-50 rounded-2xl px-4 py-3 text-sm text-slate-400 border border-slate-100">
              Analisando dados...
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-slate-100">
        <div className="flex flex-wrap gap-2 mb-3">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt.label}
              onClick={() => sendMessage(prompt.query)}
              disabled={isLoading}
              className="text-[10px] font-semibold px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-full transition-colors cursor-pointer disabled:opacity-50"
            >
              {prompt.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Pergunte sobre cancelamentos, estoque, clientes..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputVal.trim()}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer"
          >
            {isLoading ? (
              <ArrowRight className="w-5 h-5 animate-pulse" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
