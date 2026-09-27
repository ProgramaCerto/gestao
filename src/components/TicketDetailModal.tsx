import React from "react";
import { 
  X, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  FileText, 
  ExternalLink,
  MessageSquare,
  User,
  Calendar,
  Tag
} from "lucide-react";
import { motion } from "motion/react";
import { AtendimentoItem } from "../App";
import { openTicketPdfInBrowser, printTicketsInBrowser } from "../lib/generateTicketPdf";

interface TicketDetailModalProps {
  ticket: AtendimentoItem | null;
  onClose: () => void;
  onOpenPdf: (ticket: AtendimentoItem) => void;
  isAdmin?: boolean;
  onAdminRespond?: (ticket: AtendimentoItem) => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
  onOpenPdf,
  isAdmin = false,
  onAdminRespond
}) => {
  if (!ticket) return null;

  // Format dates nicely
  const formatDate = (isoDate?: string | null) => {
    if (!isoDate) return "Não informado";
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoDate;
    }
  };

  // Badge styles by ticket type
  let typeBadgeStyle = "bg-zinc-100 text-zinc-700 border-zinc-200";
  if (ticket.tipo === "Sugestão") typeBadgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
  else if (ticket.tipo === "Dúvida") typeBadgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
  else if (ticket.tipo === "Bloqueio de Conta") typeBadgeStyle = "bg-red-50 text-red-700 border-red-200";
  else if (ticket.tipo === "Problema Técnico") typeBadgeStyle = "bg-orange-50 text-orange-700 border-orange-200";
  else if (ticket.tipo === "Reclamação") typeBadgeStyle = "bg-amber-50 text-amber-800 border-amber-200";

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-zinc-200/80 space-y-6 my-8 overscroll-contain"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${typeBadgeStyle}`}>
                {ticket.tipo}
              </span>
              <span className="font-mono text-xs font-bold text-zinc-600 bg-zinc-100 px-2.5 py-0.5 rounded-lg border border-zinc-200">
                #{ticket.id}
              </span>
              {ticket.status === "Concluído" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Concluído
                </span>
              ) : ticket.status === "Em Andamento" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  Em Andamento
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Aguardando Análise
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              Detalhes do Atendimento
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
            title="Fechar detalhes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações Gerais do Usuário e Data */}
        <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/70 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block">
              Aluno / Solicitante
            </span>
            <p className="font-bold text-zinc-900 text-sm">{ticket.nome || "Não informado"}</p>
            <p className="text-zinc-600 font-mono text-xs">{ticket.email || "E-mail não informado"}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block">
              Registrado em
            </span>
            <p className="font-medium text-zinc-800 text-xs">{formatDate(ticket.criado_em)}</p>
            {ticket.atualizado_em && ticket.atualizado_em !== ticket.criado_em && (
              <p className="text-[11px] text-zinc-400">Atualizado em: {formatDate(ticket.atualizado_em)}</p>
            )}
          </div>
        </div>

        {/* Mensagem / O que a pessoa digitou */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
            Descrição da Solicitação
          </label>
          <div className="text-sm sm:text-base text-zinc-800 leading-relaxed font-normal whitespace-pre-wrap bg-zinc-50/70 p-5 rounded-2xl border border-zinc-200/80 max-h-60 overflow-y-auto">
            {ticket.mensagem}
          </div>
        </div>

        {/* Resposta Oficial do Programa Certo */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
            Resposta Oficial da Equipe Programa Certo
          </label>

          {ticket.resposta ? (
            <div className="p-5 bg-blue-50/70 border border-blue-200/90 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
                  <span className="text-xs sm:text-sm font-black text-blue-950">
                    {ticket.respondido_por ? `Atendido por: ${ticket.respondido_por}` : "Equipe Programa Certo"}
                  </span>
                </div>
                {ticket.respondido_em && (
                  <span className="text-[11px] font-semibold text-blue-700">
                    Respondido em: {formatDate(ticket.respondido_em)}
                  </span>
                )}
              </div>
              <div className="text-xs sm:text-sm text-blue-950/95 leading-relaxed whitespace-pre-wrap pl-5 border-l-2 border-blue-400">
                {ticket.resposta}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl text-xs text-zinc-500 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>Solicitação registrada. Nossa equipe técnica responderá neste mesmo canal.</span>
            </div>
          )}
        </div>

        {/* Rodapé e Ações do Modal */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Visualizar em PDF (Abre em nova aba via Blob local) */}
            <button
              type="button"
              onClick={() => {
                openTicketPdfInBrowser(ticket);
                onOpenPdf(ticket);
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
            >
              <FileText className="w-4 h-4 text-[#0b439c]" />
              <span>Visualizar em PDF</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isAdmin && onAdminRespond && (
              <button
                onClick={() => {
                  onClose();
                  onAdminRespond(ticket);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0b439c] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{ticket.resposta ? "Editar Resposta" : "Responder ao Aluno"}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
