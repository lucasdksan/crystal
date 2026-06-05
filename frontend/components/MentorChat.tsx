"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, DashboardData } from "@/frontend/types/dashboard";
import { sendChatMessage } from "@/backend/actions/chat";
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

function buildWelcomeMessage(data: DashboardData): ChatMessage {
  const hasChurn = data.churnScores.length > 0;
  const hasClv = data.clvEstimates.length > 0;
  const mlSummary = [
    `**${data.overview.totalClientes} clientes** em **${data.overview.totalClusters} clusters** (K-Means)`,
    `CLV total estimado: **R$ ${data.overview.clvTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**`,
    hasChurn
      ? `receita em risco: **R$ ${data.overview.receitaEmRisco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**`
      : null,
    hasClv && data.affinityRules.length > 0
      ? `**${data.affinityRules.length} regras de afinidade** detectadas`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: "default",
    sender: "assistant",
    text: `Olá! Sou o **Crystal Copilot**, seu consultor de e-commerce. Tenho acesso aos resultados dos modelos de ML desta análise — K-Means, SOM, churn, CLV, afinidade e mais.\n\n${mlSummary}\n\nTaxa de cancelamento: **${data.overview.taxaCancelamento.toFixed(1)}%** · **${data.overview.totalPedidos} pedidos** analisados.\n\nO que você gostaria de explorar? Pode perguntar livremente ou usar os atalhos abaixo!`,
    timestamp: formatChatTime(),
  };
}

export function MentorChat({ data }: MentorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildWelcomeMessage(data),
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const quickPrompts = [
    {
      label: "📊 Clusters K-Means",
      query: "Me explica de forma simples os clusters e o que eles significam para minha loja",
    },
    {
      label: "🛡️ Churn Risk",
      query: "Quais clientes estão em risco de churn e o que devo fazer para retê-los?",
    },
    {
      label: "👑 CLV",
      query: "Quem são meus clientes mais valiosos e como proteger o CLV da minha base?",
    },
    {
      label: "🔗 Afinidade",
      query: "Quais produtos são comprados juntos e como montar kits de cross-sell?",
    },
    {
      label: "🗺️ Mapa SOM",
      query: "O que é o mapa de comportamento SOM e como interpretar os quadrantes?",
    },
    {
      label: "💰 Oportunidades",
      query: "Quais oportunidades de receita incremental e recuperável o modelo identificou?",
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
      const resData = await sendChatMessage(updatedMsgs, data);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "assistant",
        text:
          resData.text ||
          "Entendi sua pergunta, mas tive dificuldade em processar a resposta. Recomendo desabilitar Nota Promissória e focar em PIX!",
        timestamp: formatChatTime(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "assistant",
        text: `⚠️ **Ocorreu um erro de comunicação.**\n\nParece que nossa central de inteligência está temporariamente indisponível. Dica tática imediata: ofereça um desconto para incentivar o uso do **Pix** no lugar do Boleto Bancário!`,
        timestamp: formatChatTime(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const markdownComponents = {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-base font-extrabold text-slate-900 mt-3 mb-1">
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-sm font-extrabold text-slate-800 mt-2.5 mb-1">
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-sm font-bold text-slate-800 mt-2 mb-0.5">
        {children}
      </h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-sans mb-1.5">
        {children}
      </p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc ml-4 space-y-0.5 mb-1.5">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal ml-4 space-y-0.5 mb-1.5">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="text-xs md:text-sm text-slate-700 leading-relaxed font-sans">
        {children}
      </li>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-bold text-slate-900">{children}</strong>
    ),
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage(inputVal);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px] animate-fade-in">
      <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 flex flex-col justify-between space-y-6">
        <div className="space-y-4">
          <div className="badge inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] uppercase font-mono px-3 py-1 rounded-full border border-indigo-100">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Inteligência de
            Negócios
          </div>
          <div>
            <h3 className="text-lg font-sans font-extrabold text-slate-900 leading-snug">
              Seu Consultor de bolso em Customer Intelligence
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              O <strong>Crystal Copilot</strong> acessa os resultados dos modelos
              de ML — K-Means, SOM, churn, CLV, afinidade e migração — e traduz
              tudo em recomendações comerciais práticas.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex gap-2.5 items-start text-xs text-slate-600">
              <span className="w-5 h-5 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-bold font-mono">
                1
              </span>
              <p>
                Pergunte sobre clusters, churn, CLV, afinidade de produtos ou o
                mapa SOM — com números reais da sua loja.
              </p>
            </div>
            <div className="flex gap-2.5 items-start text-xs text-slate-600">
              <span className="w-5 h-5 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-bold font-mono">
                2
              </span>
              <p>
                Peça planos de retenção para clientes em risco ou cross-sell via
                regras de afinidade.
              </p>
            </div>
            <div className="flex gap-2.5 items-start text-xs text-slate-600">
              <span className="w-5 h-5 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-bold font-mono">
                3
              </span>
              <p>
                Explore oportunidades de receita incremental e migração entre
                segmentos de clientes.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-200/60 text-[10px] text-amber-900 leading-snug font-sans flex gap-2">
          <Bot className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
          <p>
            O algoritmo aprende com seus padrões. Quanto mais realista for a
            meta de simulação, melhores serão os insights.
          </p>
        </div>
      </div>

      <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs flex flex-col justify-between h-full">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center border border-indigo-700 shadow-sm relative">
              <Sparkles className="w-4 h-4 absolute -top-1 -right-1 text-emerald-300 transform scale-75 animate-bounce" />
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-800 block">
                Crystal Copilot
              </span>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                Ativo & Analisando Loja
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              const welcome = buildWelcomeMessage(data);
              welcome.timestamp = formatChatTime();
              setMessages([welcome]);
            }}
            className="p-1 px-2.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs text-slate-500 font-sans flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Limpar Histórico
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-slate-50/40"
        >
          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs flex-shrink-0 border ${isUser ? "bg-indigo-50 border-indigo-100 text-indigo-700" : "bg-white border-slate-200 text-slate-700"}`}
                >
                  {isUser ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                </div>

                <div
                  className={`space-y-1 ${isUser ? "text-right" : "text-left"}`}
                >
                  <div
                    className={`rounded-2xl p-4 text-slate-800 shadow-xs ${isUser ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white rounded-tl-none border border-slate-100"}`}
                  >
                    <div className="space-y-2">
                      {isUser ? (
                        <p className="text-xs md:text-sm font-sans whitespace-pre-wrap leading-relaxed text-white">
                          {msg.text}
                        </p>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 max-w-[80%]"
            >
              <div className="w-8 h-8 rounded-lg bg-white border-slate-200 flex items-center justify-center text-xs border">
                <Bot className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              </div>
              <div className="bg-slate-100/80 rounded-2xl p-3.5 rounded-tl-none border border-slate-200/50 flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
                <span className="text-xs text-slate-500 font-sans ml-1">
                  Analisando dados do lote...
                </span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="px-6 py-2 bg-slate-50/50 border-t border-slate-100">
          <div className="flex gap-2 overflow-x-auto scroll-smooth py-1.5">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => sendMessage(prompt.query)}
                className="whitespace-nowrap flex-shrink-0 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 p-1.5 px-3 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {prompt.label}
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
          <input
            type="text"
            disabled={isLoading}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isLoading
                ? "Enviando para o Gemini..."
                : "Digite sua pergunta comercial em português..."
            }
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-800 font-sans outline-none focus:border-indigo-400 focus:bg-white transition-colors disabled:opacity-70"
          />
          <button
            disabled={!inputVal.trim() || isLoading}
            onClick={() => sendMessage(inputVal)}
            className="h-10 w-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center border border-indigo-700 shadow-xs cursor-pointer transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
