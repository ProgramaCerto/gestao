import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  FileText, 
  Download,
  MessageSquare,
  User,
  Printer,
  ExternalLink,
  Search,
  AlertCircle,
  Send,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AtendimentoItem } from "../App";
import {
  openTicketPdfInBrowser,
  printTicketsInBrowser,
  extractMatricula
} from "../lib/generateTicketPdf";

export interface TicketDetailViewProps {
  ticket: AtendimentoItem;
  onBack: () => void;
  onViewPdf: (ticket: AtendimentoItem) => void;
  onDownloadPdf: (ticket: AtendimentoItem) => void;
  isAdmin?: boolean;
  adminName?: string;
  allUsers?: any[];
  allTickets?: AtendimentoItem[];
  onSaveResponse?: (ticketId: string, responseText: string, shouldUnblockUser?: boolean) => Promise<void>;
  onSelectOtherTicket?: (ticket: AtendimentoItem) => void;
  onToggleUserBlock?: (userIdOrEmail: string, newStatus: "Liberado" | "Bloqueado", motivo?: string) => Promise<void>;
  onNavigateToUser?: (userTarget: any) => void;
  backButtonLabel?: string;
  showBottomBackButton?: boolean;
}

export const TicketDetailView: React.FC<TicketDetailViewProps> = ({
  ticket,
  onBack,
  onViewPdf,
  onDownloadPdf,
  isAdmin = false,
  adminName = "Equipe Programa Certo",
  allUsers = [],
  allTickets = [],
  onSaveResponse,
  onSelectOtherTicket,
  onNavigateToUser,
  backButtonLabel,
  showBottomBackButton = true
}) => {
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [responseText, setResponseText] = useState(ticket.resposta || ticket.mensagem_respondida || "");
  const [unblockStudentWithReply, setUnblockStudentWithReply] = useState(ticket.tipo === "Bloqueio de Conta");
  const [isSavingReply, setIsSavingReply] = useState(false);
  const [replySuccessMsg, setReplySuccessMsg] = useState<string | null>(null);
  const [replyErrorMsg, setReplyErrorMsg] = useState<string | null>(null);

  // Painel de Consulta de Chamados e Usuário
  const [isStudentDossierOpen, setIsStudentDossierOpen] = useState(false);

  useEffect(() => {
    setResponseText(ticket.resposta || ticket.mensagem_respondida || "");
    setUnblockStudentWithReply(ticket.tipo === "Bloqueio de Conta");
    setIsEditingResponse(false);
    setReplySuccessMsg(null);
    setReplyErrorMsg(null);
  }, [ticket.id, ticket.tipo, ticket.resposta, ticket.mensagem_respondida]);

  // Format dates
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

  // Find associated user in allUsers
  const studentUser = allUsers.find(u => {
    const tMat = (ticket.matricula_usuario || ticket.user_id || ticket.id_do_usuario || "").trim();
    const uMat = String(u.matricula || u.id || "").trim();
    if (tMat && uMat && (uMat === tMat || extractMatricula(uMat) === extractMatricula(tMat))) return true;
    const tEmail = (ticket.email || "").toLowerCase().trim();
    if (tEmail && u.email && String(u.email).toLowerCase().trim() === tEmail) return true;
    const tName = (ticket.nome || "").toLowerCase().trim();
    if (tName && tName !== "usuário" && tName !== "estudante" && (u.nome || u.name) && String(u.nome || u.name).toLowerCase().trim() === tName) return true;
    return false;
  });

  const rawUserId = (ticket.matricula_usuario || ticket.user_id || ticket.id_do_usuario || studentUser?.matricula || studentUser?.id || "").trim();
  const effectiveMatricula = rawUserId && rawUserId !== "Não informada" && rawUserId !== "ID não registrado"
    ? extractMatricula(rawUserId, allUsers)
    : "Não informada";
  const effectiveEmail = (ticket.email || studentUser?.email || "").trim() || "E-mail não informado";
  const effectiveName = (ticket.nome || studentUser?.nome || studentUser?.name || "").trim() || "Solicitante";
  const isAccountBlocked = (studentUser?.acesso === "Bloqueado" || studentUser?.status === "Bloqueado");

  // Histórico estrito de chamados SOMENTE deste usuário (sem misturar chamados de outros usuários)
  const studentTicketsHistory = allTickets.filter(t => {
    if (t.id === ticket.id) return true;

    const targetMat = effectiveMatricula !== "Não informada" ? effectiveMatricula : "";
    const itemRawMat = String(t.matricula_usuario || t.user_id || t.id_do_usuario || "").trim();
    const itemMat = itemRawMat && itemRawMat !== "Não informada" && itemRawMat !== "ID não registrado"
      ? extractMatricula(itemRawMat, allUsers)
      : "";

    // Se ambos têm matrícula registrada, compara estritamente pela matrícula
    if (targetMat && itemMat) {
      return itemMat === targetMat;
    }

    // Caso contrário, compara estritamente pelo e-mail válido do solicitante
    const targetEmail = effectiveEmail.toLowerCase();
    const itemEmail = String(t.email || "").trim().toLowerCase();
    if (
      targetEmail &&
      targetEmail !== "e-mail não informado" &&
      targetEmail.includes("@") &&
      itemEmail &&
      itemEmail.includes("@")
    ) {
      return itemEmail === targetEmail;
    }

    return false;
  });

  const blockComplaintsCount = studentTicketsHistory.filter(t => t.tipo === "Bloqueio de Conta").length;

  // Scroll utility to return to top of page
  const scrollPageToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainEl = document.getElementById("main-scroll-container") || document.querySelector("main");
      if (mainEl) {
        mainEl.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        mainEl.scrollTop = 0;
      }
    }
  };

  // Handle print using dedicated isolated print iframe
  const handleBackWithScroll = () => {
    scrollPageToTop();
    onBack();
  };

  const enrichedTicketForPdf: AtendimentoItem = {
    ...ticket,
    matricula_usuario: rawUserId ? effectiveMatricula : ticket.matricula_usuario,
    user_id: rawUserId ? effectiveMatricula : ticket.user_id,
    email: effectiveEmail,
    nome: effectiveName,
    respondido_por: ticket.respondido_por || adminName
  };

  const handlePrint = () => {
    printTicketsInBrowser([enrichedTicketForPdf], adminName, allUsers);
  };

  // Handle submit response inline
  const handleSubmitInlineResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseText.trim()) {
      setReplyErrorMsg("Por favor, digite o conteúdo da resposta oficial.");
      return;
    }

    setIsSavingReply(true);
    setReplyErrorMsg(null);
    setReplySuccessMsg(null);

    try {
      if (onSaveResponse) {
        await onSaveResponse(ticket.id, responseText.trim(), unblockStudentWithReply);
      }
      setReplySuccessMsg("Resposta enviada com sucesso! O atendimento foi concluído automaticamente.");
      setIsEditingResponse(false);
      // Voltar para o topo da página após enviar e concluir o chamado
      scrollPageToTop();
    } catch (err: any) {
      setReplyErrorMsg(err?.message || "Erro ao salvar resposta oficial.");
    } finally {
      setIsSavingReply(false);
    }
  };

  // Badge styles by ticket type
  let typeBadgeStyle = "bg-zinc-100 text-zinc-700 border-zinc-200";
  if (ticket.tipo === "Sugestão") typeBadgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
  else if (ticket.tipo === "Dúvida") typeBadgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
  else if (ticket.tipo === "Bloqueio de Conta") typeBadgeStyle = "bg-zinc-100 text-zinc-800 border-zinc-300 font-bold";
  else if (ticket.tipo === "Problema Técnico") typeBadgeStyle = "bg-orange-50 text-orange-700 border-orange-200";
  else if (ticket.tipo === "Reclamação") typeBadgeStyle = "bg-amber-50 text-amber-800 border-amber-200";

  const officialReplyText = ticket.resposta || ticket.mensagem_respondida || "";

  return (
    <motion.div
      id="ticket-screen-view"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Barra Superior de Navegação e Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <button
          onClick={handleBackWithScroll}
          className="px-4 py-2.5 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-2xl text-xs sm:text-sm font-bold text-zinc-700 hover:text-zinc-900 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-500" />
          <span>{backButtonLabel || "Voltar para os atendimentos"}</span>
        </button>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          {/* Botão Responder (abre a caixa de resposta) */}
          {isAdmin && !isEditingResponse && (
            <button
              type="button"
              onClick={() => {
                setIsEditingResponse(true);
                setTimeout(() => {
                  const el = document.getElementById("ticket-inline-response-box");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }, 80);
              }}
              className="px-4 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-blue-900/15"
              title="Redigir parecer e resposta oficial"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{officialReplyText ? "Editar Resposta" : "Responder"}</span>
            </button>
          )}

          {/* Botão Imprimir */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200/80 hover:border-zinc-300 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Abrir painel de impressão deste atendimento"
          >
            <Printer className="w-4 h-4 text-zinc-600" />
            <span>Imprimir</span>
          </button>

          {/* Visualizar em PDF (100% no navegador via Blob local, acessível para qualquer usuário sem bloqueio do Google AI Studio) */}
          <button
            type="button"
            onClick={() => {
              openTicketPdfInBrowser(enrichedTicketForPdf);
            }}
            className="px-4 py-2.5 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200/80 hover:border-blue-300 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Visualizar comprovante em PDF em nova guia"
          >
            <FileText className="w-4 h-4 text-[#0b439c]" />
            <span>Visualizar em PDF</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {/* Baixar em PDF */}
          <button
            type="button"
            onClick={() => onDownloadPdf(enrichedTicketForPdf)}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-900 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Baixar arquivo em PDF"
          >
            <Download className="w-4 h-4" />
            <span>Baixar em PDF</span>
          </button>
        </div>
      </div>

      {/* Cartão Principal do Atendimento */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm p-6 sm:p-9 space-y-7">
        {/* Cabeçalho Único: Tipo, Protocolo, Status e Data */}
        <div className="border-b border-zinc-100 pb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`px-3.5 py-1 rounded-full text-xs font-black border ${typeBadgeStyle}`}>
                {ticket.tipo}
              </span>
              <span className="font-mono text-xs font-bold text-zinc-700 bg-zinc-100/90 px-3 py-1 rounded-xl border border-zinc-200/80">
                #{ticket.id}
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                • Registrado em {formatDate(ticket.criado_em)}
              </span>
            </div>

            <div>
              {ticket.status === "Concluído" ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Concluído
                </span>
              ) : ticket.status === "Em Andamento" ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-800 border border-blue-200">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  Em Andamento
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Aguardando Análise
                </span>
              )}
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
              Chamado #{ticket.id.replace(/^#/, '')}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Ficha administrativa de suporte • {ticket.tipo}
            </p>
          </div>
        </div>

        {/* Dados do Solicitante (Nome, E-mail, Matrícula e Botão Consultar Chamados) */}
        <div className="bg-zinc-50/80 rounded-2xl p-5 border border-zinc-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs flex-1">
              {/* Solicitante */}
              <div className="space-y-1">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block">
                  Solicitante
                </span>
                <p className="font-bold text-zinc-900 text-sm">{effectiveName}</p>
              </div>

              {/* E-mail */}
              <div className="space-y-1">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block">
                  E-mail
                </span>
                <p className="text-zinc-800 font-medium text-xs truncate">{effectiveEmail}</p>
              </div>

              {/* Matrícula do Usuário */}
              <div className="space-y-1">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block">
                  Matrícula
                </span>
                <p
                  className="text-[#0b439c] font-mono font-black text-xs truncate bg-white px-3 py-1 rounded-lg border border-blue-200/80 inline-block max-w-full shadow-2xs"
                  title={`Matrícula: ${effectiveMatricula}`}
                >
                  {effectiveMatricula}
                </p>
              </div>
            </div>

            {/* Botão Consultar Chamados (abre o histórico do usuário onde fica o botão Ver Usuário) */}
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0 flex-wrap no-print">
                <button
                  type="button"
                  onClick={() => setIsStudentDossierOpen(!isStudentDossierOpen)}
                  className="px-4 py-2.5 bg-white hover:bg-blue-50 border border-blue-200 text-[#0b439c] font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isStudentDossierOpen ? "Ocultar Histórico" : "Consultar Chamados"}</span>
                  {isStudentDossierOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Painel de Consulta de Chamados deste Usuário (Com o botão Ver Usuário aqui dentro!) */}
          <AnimatePresence>
            {isStudentDossierOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-zinc-200 space-y-4 overflow-hidden"
              >
                <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0b439c] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        {effectiveName.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "US"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm text-zinc-900">{effectiveName}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isAccountBlocked 
                              ? "bg-red-50 text-red-700 border-red-200" 
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {isAccountBlocked ? "Conta Bloqueada" : "Acesso Liberado"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">{effectiveEmail}</p>
                      </div>
                    </div>

                    {/* Botão Ver Usuário (Abre diretamente a ficha completa de edição do usuário com botão Voltar para Atendimento) */}
                    {onNavigateToUser && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToUser(
                            studentUser || {
                              id: effectiveMatricula !== "Não informada" ? effectiveMatricula : rawUserId,
                              matricula: effectiveMatricula !== "Não informada" ? effectiveMatricula : rawUserId,
                              name: effectiveName,
                              email: effectiveEmail !== "E-mail não informado" ? effectiveEmail : "",
                              account_type: "estudante",
                              acesso: isAccountBlocked ? "Bloqueado" : "Liberado",
                              status: isAccountBlocked ? "Bloqueado" : "Liberado",
                              motivo: ""
                            }
                          )
                        }
                        className="px-4 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                        title="Abrir ficha completa deste usuário"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Ver Usuário</span>
                      </button>
                    )}
                  </div>

                  {/* Estatísticas de Chamados do Usuário */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Total de Chamados Deste Usuário
                      </span>
                      <p className="text-lg font-black text-zinc-900 mt-0.5">
                        {studentTicketsHistory.length}
                      </p>
                    </div>

                    <div className="p-3 bg-red-50/60 rounded-xl border border-red-200/70">
                      <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
                        Queixas de Bloqueio
                      </span>
                      <p className="text-lg font-black text-red-900 mt-0.5">
                        {blockComplaintsCount}
                      </p>
                    </div>

                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Status Atual no Sistema
                      </span>
                      <p className="text-xs font-bold text-zinc-800 mt-1">
                        {isAccountBlocked ? "Bloqueado" : "Regular / Liberado"}
                      </p>
                    </div>
                  </div>

                  {/* Histórico Completo de Atendimentos deste Usuário */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <h5 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                      Histórico de Chamados deste Usuário ({studentTicketsHistory.length})
                    </h5>

                    {studentTicketsHistory.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">Nenhum chamado encontrado para este usuário.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {studentTicketsHistory.map((histTicket) => (
                          <div
                            key={histTicket.id}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                              histTicket.id === ticket.id
                                ? "bg-blue-50/80 border-blue-200 ring-1 ring-blue-300"
                                : "bg-zinc-50/60 border-zinc-200 hover:bg-zinc-100 transition-colors"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-zinc-800">#{histTicket.id}</span>
                                <span className="font-semibold text-zinc-600">• {histTicket.tipo}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  histTicket.status === "Concluído"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : histTicket.status === "Em Andamento"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}>
                                  {histTicket.status}
                                </span>
                                {histTicket.id === ticket.id && (
                                  <span className="text-[10px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded">
                                    Este Atendimento
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                {histTicket.mensagem}
                              </p>
                            </div>

                            {histTicket.id !== ticket.id && onSelectOtherTicket && (
                              <button
                                type="button"
                                onClick={() => onSelectOtherTicket(histTicket)}
                                className="px-2.5 py-1 bg-white hover:bg-zinc-200 border border-zinc-200 rounded-lg text-[11px] font-bold text-zinc-700 cursor-pointer shrink-0"
                              >
                                Ver
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mensagem enviada pelo Usuário */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
            Mensagem enviada
          </label>
          <div className="text-sm sm:text-base text-zinc-800 leading-relaxed font-normal whitespace-pre-wrap bg-zinc-50/50 p-5 sm:p-6 rounded-2xl border border-zinc-200/80 shadow-2xs">
            {ticket.mensagem}
          </div>
        </div>

        {/* Seção de Resposta Oficial */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
              Resposta Oficial da Equipe Programa Certo
            </label>

            {isAdmin && officialReplyText && !isEditingResponse && (
              <button
                type="button"
                onClick={() => setIsEditingResponse(true)}
                className="text-xs font-bold text-[#0b439c] hover:underline flex items-center gap-1 cursor-pointer no-print"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Editar Resposta</span>
              </button>
            )}
          </div>

          {/* Sucesso inline */}
          {replySuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 no-print">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{replySuccessMsg}</span>
            </div>
          )}

          {/* Erro inline */}
          {replyErrorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-800 flex items-center gap-2 no-print">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{replyErrorMsg}</span>
            </div>
          )}

          {/* Visualização de Resposta já gravada (quando não estiver em modo de edição) */}
          {officialReplyText && !isEditingResponse ? (
            <div className="p-6 sm:p-7 bg-blue-50/70 border border-blue-200/90 rounded-2xl space-y-4 shadow-2xs">
              <div className="flex items-center justify-between gap-3 flex-wrap border-b border-blue-200/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
                  <span className="text-sm font-black text-blue-950">
                    {ticket.respondido_por ? `Atendido por: ${ticket.respondido_por}` : "Equipe Oficial Programa Certo"}
                  </span>
                </div>
                {ticket.respondido_em && (
                  <span className="text-xs font-semibold text-blue-800">
                    Respondido em {formatDate(ticket.respondido_em)}
                  </span>
                )}
              </div>
              <div className="text-sm sm:text-base text-blue-950 leading-relaxed whitespace-pre-wrap pl-4 border-l-2 border-blue-400">
                {officialReplyText}
              </div>
            </div>
          ) : null}

          {/* Se ainda não foi respondido e NÃO está editando: mostra botão Responder Atendimento */}
          {!officialReplyText && !isEditingResponse && isAdmin && (
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b439c] flex items-center justify-center font-bold shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-900">Atendimento aguardando parecer oficial</h4>
                  <p className="text-xs text-zinc-500">Clique no botão ao lado para redigir a resposta e concluir a solicitação.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingResponse(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Responder Atendimento</span>
              </button>
            </div>
          )}

          {/* Formulário de Resposta Direto na Tela (Inline - Aberto ao clicar no botão Responder) */}
          {isAdmin && isEditingResponse && (
            <form id="ticket-inline-response-box" onSubmit={handleSubmitInlineResponse} className="bg-white rounded-2xl p-6 border-2 border-[#0b439c] shadow-sm space-y-4 no-print scroll-mt-6">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2 text-zinc-900 font-extrabold text-sm">
                  <ShieldCheck className="w-4 h-4 text-[#0b439c]" />
                  <span>Escrever Resposta Oficial</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Conclusão Automática ao Enviar
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Mensagem de Parecer / Solução *
                </label>
                <textarea
                  rows={6}
                  required
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Digite aqui o parecer oficial... Ao enviar, o chamado será marcado como Concluído automaticamente."
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#0b439c] focus:ring-2 focus:ring-blue-100 transition-all resize-y leading-relaxed font-medium"
                />
                <p className="text-[11px] text-zinc-400">
                  O solicitante receberá esta resposta no painel dele e no comprovante oficial em PDF.
                </p>
              </div>

              {/* Opção Rápida: Desbloquear Conta se for caso de Bloqueio */}
              {ticket.tipo === "Bloqueio de Conta" && (
                <label className="flex items-center gap-3 p-3 bg-red-50/70 border border-red-200/80 rounded-xl cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={unblockStudentWithReply}
                    onChange={(e) => setUnblockStudentWithReply(e.target.checked)}
                    className="w-4 h-4 text-[#0b439c] rounded border-zinc-300 focus:ring-[#0b439c]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-red-950 block">Desbloquear e Liberar a Conta</span>
                    <span className="text-red-700 font-medium">
                      Atualiza o acesso do usuário na tabela de usuários para "Liberado" imediatamente ao enviar esta resposta.
                    </span>
                  </div>
                </label>
              )}

              {/* Botões do Formulário Inline */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  disabled={isSavingReply}
                  onClick={() => {
                    setResponseText(officialReplyText);
                    setIsEditingResponse(false);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSavingReply || !responseText.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#0b439c] hover:bg-blue-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-900/15"
                >
                  {isSavingReply ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enviando Resposta...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Resposta e Concluir Chamado</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Botão de Rodapé para voltar */}
      {showBottomBackButton && (
        <div className="pt-2 flex justify-start no-print">
          <button
            onClick={handleBackWithScroll}
            className="px-4 py-2.5 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-2xl text-xs font-bold text-zinc-700 hover:text-zinc-900 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-500" />
            <span>Voltar para os atendimentos</span>
          </button>
        </div>
      )}
    </motion.div>
  );
};
