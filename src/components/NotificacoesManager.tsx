import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Bell,
  Send,
  Trash2,
  Search,
  RefreshCw,
  Plus,
  ArrowLeft,
  Users,
  User,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  FileText,
  X,
  Check
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface NotificacaoItem {
  id: string;
  titulo?: string;
  mensagem?: string;
  destinatarios?: string;
  tipo?: string;
  criado_em?: string;
}

interface NotificacoesManagerProps {
  allUsers?: any[];
  currentAdminName?: string;
  currentUserId?: string;
  initialTargetMatricula?: string;
}

export const NotificacoesManager: React.FC<NotificacoesManagerProps> = ({
  allUsers = [],
  currentAdminName = "Administrador",
  currentUserId = "",
  initialTargetMatricula = ""
}) => {
  // Modo de visualização: "list" (lista de notificações) ou "create" (tela inteira de criação)
  const [viewMode, setViewMode] = useState<"list" | "create">(
    initialTargetMatricula ? "create" : "list"
  );

  // Lista de notificações
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  // Formulário de Criação (Tela Inteira)
  const [isSendToAll, setIsSendToAll] = useState(!initialTargetMatricula);
  const [targetMatricula, setTargetMatricula] = useState(initialTargetMatricula || "");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [manualMatriculaInput, setManualMatriculaInput] = useState(initialTargetMatricula || "");

  // Tipos de comunicado: "Aviso Geral" | "Segurança" | "Comunicado Oficial" | "Suporte" | "Outro"
  const [tipo, setTipo] = useState<string>("Aviso Geral");
  const [customTipo, setCustomTipo] = useState<string>("");

  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Confirmação de exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carregar notificações do Supabase
  const loadNotificacoes = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .order("criado_em", { ascending: false });

      if (!error && Array.isArray(data)) {
        setNotificacoes(
          data.map((row: any) => ({
            id: String(row.id),
            titulo: row.titulo || "Comunicado",
            mensagem: row.mensagem || "",
            destinatarios: row.destinatarios || "todos",
            tipo: row.tipo || "Aviso Geral",
            criado_em: row.criado_em || new Date().toISOString()
          }))
        );
      }
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotificacoes();
  }, [loadNotificacoes]);

  // Aluno atualmente selecionado para notificação individual
  const selectedStudent = useMemo(() => {
    if (isSendToAll || !targetMatricula) return null;
    return allUsers.find(
      (u: any) => String(u.matricula || u.id).trim() === targetMatricula.trim()
    ) || null;
  }, [allUsers, isSendToAll, targetMatricula]);

  // Alunos filtrados pela busca
  const matchingStudents = useMemo(() => {
    if (!allUsers || allUsers.length === 0) return [];
    const query = userSearchQuery.trim().toLowerCase();
    if (!query) {
      // Retorna os primeiros 6 para exibição rápida inicial
      return allUsers.slice(0, 6);
    }
    return allUsers
      .filter((u: any) => {
        const nome = String(u.nome || u.name || "").toLowerCase();
        const matricula = String(u.matricula || u.id || "").toLowerCase();
        const email = String(u.email || "").toLowerCase();
        return nome.includes(query) || matricula.includes(query) || email.includes(query);
      })
      .slice(0, 10);
  }, [allUsers, userSearchQuery]);

  // Enviar Notificação (Tela Inteira)
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setFeedback({ type: "error", text: "Informe o título da notificação." });
      return;
    }
    if (!mensagem.trim()) {
      setFeedback({ type: "error", text: "Escreva a mensagem do comunicado." });
      return;
    }

    const finalDestinatarios = isSendToAll
      ? "todos"
      : targetMatricula.trim() || manualMatriculaInput.trim();

    if (!finalDestinatarios) {
      setFeedback({
        type: "error",
        text: "Informe a matrícula do estudante ou selecione um aluno na busca."
      });
      return;
    }

    const finalTipo =
      tipo === "Outro"
        ? customTipo.trim() || "Outro"
        : tipo.trim();

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const newId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const payload: NotificacaoItem = {
        id: newId,
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        destinatarios: finalDestinatarios,
        tipo: finalTipo,
        criado_em: new Date().toISOString()
      };

      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.from("notificacoes").insert([payload]);
        if (error) throw error;
      }

      setNotificacoes((prev) => [payload, ...prev]);
      setFeedback({ type: "success", text: "Notificação emitida com sucesso!" });

      // Retornar suavemente para a lista
      setTimeout(() => {
        setTitulo("");
        setMensagem("");
        setTargetMatricula("");
        setManualMatriculaInput("");
        setUserSearchQuery("");
        setTipo("Aviso Geral");
        setCustomTipo("");
        setIsSendToAll(false);
        setFeedback(null);
        setViewMode("list");
      }, 1200);
    } catch (err: any) {
      console.error("Erro ao emitir notificação:", err);
      setFeedback({
        type: "error",
        text: "Não foi possível emitir a notificação. Verifique sua conexão com o banco de dados."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excluir Notificação
  const handleConfirmDelete = async (id: string) => {
    if (!supabase || !isSupabaseConfigured) {
      setNotificacoes((prev) => prev.filter((n) => n.id !== id));
      setDeleteId(null);
      return;
    }
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("notificacoes").delete().eq("id", id);
      if (!error) {
        setNotificacoes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error("Erro ao excluir notificação:", err);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Formatar data brasileira
  const formatDateBR = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
        " às " +
        d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      );
    } catch {
      return isoString;
    }
  };

  // Estatísticas (Apenas Total, Transmissão Geral e Individuais)
  const stats = useMemo(() => {
    const total = notificacoes.length;
    const paraTodos = notificacoes.filter((n) => (n.destinatarios || "").toLowerCase() === "todos").length;
    const individuais = total - paraTodos;
    return { total, paraTodos, individuais };
  }, [notificacoes]);

  // Lista filtrada
  const filteredNotificacoes = useMemo(() => {
    return notificacoes.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        (item.titulo || "").toLowerCase().includes(q) ||
        (item.mensagem || "").toLowerCase().includes(q) ||
        (item.destinatarios || "").toLowerCase().includes(q) ||
        (item.tipo || "").toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filterTipo === "todos") return true;
      if (filterTipo === "geral") return (item.destinatarios || "").toLowerCase() === "todos";
      if (filterTipo === "individual") return (item.destinatarios || "").toLowerCase() !== "todos";
      return true;
    });
  }, [notificacoes, searchTerm, filterTipo]);

  // Cores por tipo
  const getBadgeStyle = (tp?: string) => {
    const t = (tp || "").toLowerCase();
    if (t.includes("seguran")) {
      return "bg-red-100 text-red-700 border-red-200";
    }
    if (t.includes("aviso") || t.includes("alerta")) {
      return "bg-amber-100 text-amber-800 border-amber-200";
    }
    if (t.includes("suporte") || t.includes("atendimento")) {
      return "bg-purple-100 text-purple-800 border-purple-200";
    }
    if (t.includes("comunicado")) {
      return "bg-blue-100 text-[#0b439c] border-blue-200";
    }
    return "bg-zinc-100 text-zinc-800 border-zinc-200";
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* TELA A: LISTAGEM DE NOTIFICAÇÕES                                          */}
      {/* ========================================================================= */}
      {viewMode === "list" && (
        <div className="space-y-6">
          {/* Cabeçalho da Aba Notificações */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 shadow-2xs">
                <Bell className="w-6 h-6 text-zinc-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-zinc-900 tracking-tight">
                    Central de Notificações
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-[#0b439c]">
                    Comunicados & Avisos
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-medium">
                  Envio e histórico de comunicados oficiais transmitidos para os alunos da plataforma.
                </p>
              </div>
            </div>

            {/* Ação Principal: Botão para abrir Nova Notificação em TELA INTEIRA */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={loadNotificacoes}
                title="Recarregar notificações"
                className="p-2.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-all cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#0b439c]" : ""}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setViewMode("create");
                }}
                className="px-4 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-900/15"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Notificação</span>
              </button>
            </div>
          </div>

          {/* Cards de Métricas (Apenas 3 cards, sem o card de Avisos de Segurança) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total de Envios</p>
                <p className="text-2xl font-black text-zinc-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b439c] flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Transmissão Geral</p>
                <p className="text-2xl font-black text-zinc-900 mt-1">{stats.paraTodos}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Individuais</p>
                <p className="text-2xl font-black text-zinc-900 mt-1">{stats.individuais}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, mensagem ou matrícula..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-zinc-900 focus:outline-none focus:border-[#0b439c] transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl self-stretch sm:self-auto overflow-x-auto">
              {[
                { id: "todos", label: "Todas" },
                { id: "geral", label: "Transmissão Geral" },
                { id: "individual", label: "Individuais" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTipo(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterTipo === tab.id
                      ? "bg-white text-zinc-900 shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listagem de Notificações */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden">
            {filteredNotificacoes.length === 0 ? (
              <div className="p-16 text-center space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto border border-zinc-200/60 shadow-2xs">
                  <Bell className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-zinc-800">
                    {searchTerm ? "Nenhuma notificação encontrada" : "Nenhuma notificação emitida até o momento"}
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    {searchTerm
                      ? `Não encontramos comunicados correspondentes à pesquisa "${searchTerm}".`
                      : "Envie comunicados gerais ou alertas para estudantes específicos sobre materiais, ocorrências e avisos acadêmicos."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode("create")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0b439c] text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Emitir Primeira Notificação</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {filteredNotificacoes.map((notif) => {
                  const isAll = (notif.destinatarios || "").toLowerCase() === "todos";
                  return (
                    <div
                      key={notif.id}
                      className="p-5 hover:bg-blue-50/20 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getBadgeStyle(
                              notif.tipo
                            )}`}
                          >
                            {notif.tipo || "Comunicado"}
                          </span>

                          <h3 className="font-bold text-sm text-zinc-900 truncate">{notif.titulo}</h3>

                          <span className="text-[11px] text-zinc-400 font-medium">
                            • {formatDateBR(notif.criado_em)}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-700 font-medium whitespace-pre-wrap leading-relaxed">
                          {notif.mensagem}
                        </p>

                        <div className="flex items-center gap-2 pt-1 text-xs">
                          <span className="text-zinc-400 font-bold">Destino:</span>
                          {isAll ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[11px]">
                              <Users className="w-3 h-3 text-emerald-600" />
                              Todos os Usuários Cadastrados
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 font-mono font-bold text-[11px]">
                              <User className="w-3 h-3 text-zinc-500" />
                              Matrícula: {notif.destinatarios}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                        {deleteId === notif.id ? (
                          <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-xl border border-rose-200">
                            <span className="text-[11px] font-bold text-rose-700 px-2">Excluir?</span>
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(notif.id)}
                              disabled={isDeleting}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              {isDeleting ? "..." : "Sim"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(null)}
                              className="px-2 py-1 bg-white text-zinc-700 rounded-lg text-[11px] font-bold border border-zinc-200 cursor-pointer"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            title="Excluir notificação"
                            onClick={() => setDeleteId(notif.id)}
                            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TELA B: NOVA NOTIFICAÇÃO (EM TELA INTEIRA - SEM SEGUNDA CAMADA / SEM PREVIEW) */}
      {/* ========================================================================= */}
      {viewMode === "create" && (
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden animate-in fade-in duration-150">
          {/* Cabeçalho da Tela de Emissão (Sem badge de emissor) */}
          <div className="p-6 border-b border-zinc-200 flex items-center justify-between gap-4 bg-zinc-50/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setViewMode("list");
                }}
                className="p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Notificações</span>
              </button>
              <div>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                  Emitir Nova Notificação
                </h2>
                <p className="text-xs text-zinc-500 font-medium">
                  Envie avisos, comunicados oficiais ou alertas diretos aos estudantes.
                </p>
              </div>
            </div>
          </div>

          {/* Feedback de envio */}
          {feedback && (
            <div
              className={`m-6 p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Formulário em Tela Cheia (Layout Amplo e Direto) */}
          <form onSubmit={handleSendNotification} className="p-6 sm:p-8 space-y-7 max-w-5xl mx-auto">
            {/* 1. Destinatários da Notificação */}
            <div className="bg-zinc-50/70 border border-zinc-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0b439c]" />
                Destinatários da Notificação
              </label>

              {/* Seleção rápida: Todos vs Aluno Específico */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSendToAll(true);
                    setTargetMatricula("");
                    setManualMatriculaInput("");
                  }}
                  className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                    isSendToAll
                      ? "bg-blue-50/80 border-[#0b439c] text-blue-900 shadow-xs"
                      : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      isSendToAll ? "border-[#0b439c] bg-[#0b439c]" : "border-zinc-300"
                    }`}
                  >
                    {isSendToAll && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <strong className="block text-xs font-bold">Transmissão Geral (Todos)</strong>
                    <span className="text-[11px] text-zinc-500">
                      Todos os estudantes ativos receberão este comunicado na tela.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSendToAll(false)}
                  className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                    !isSendToAll
                      ? "bg-blue-50/80 border-[#0b439c] text-blue-900 shadow-xs"
                      : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      !isSendToAll ? "border-[#0b439c] bg-[#0b439c]" : "border-zinc-300"
                    }`}
                  >
                    {!isSendToAll && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <strong className="block text-xs font-bold">Estudante Específico</strong>
                    <span className="text-[11px] text-zinc-500">
                      Direcionar a notificação para uma matrícula individual.
                    </span>
                  </div>
                </button>
              </div>

              {/* Painel de Busca do Estudante Específico */}
              {!isSendToAll && (
                <div className="pt-2 space-y-4 border-t border-zinc-200/80">
                  {/* Se um aluno já está selecionado */}
                  {selectedStudent ? (
                    <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#0b439c] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {selectedStudent.nome ? selectedStudent.nome.slice(0, 2).toUpperCase() : "AL"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 truncate">
                            {selectedStudent.nome || selectedStudent.name || "Estudante"}
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {selectedStudent.email}
                          </p>
                          <p className="text-[11px] font-mono text-[#0b439c] font-black">
                            Matrícula: {selectedStudent.matricula || selectedStudent.id}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetMatricula("");
                          setManualMatriculaInput("");
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 rounded-lg text-xs font-bold border border-zinc-200 transition-colors cursor-pointer shrink-0"
                      >
                        Trocar Aluno
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                          Pesquisar por nome, e-mail ou matrícula:
                        </label>
                        <div className="relative">
                          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={userSearchQuery}
                            onChange={(e) => {
                              setUserSearchQuery(e.target.value);
                              setManualMatriculaInput(e.target.value);
                            }}
                            placeholder="Digite o nome, e-mail ou número de matrícula..."
                            className="w-full bg-white border border-zinc-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-[#0b439c] focus:ring-1 focus:ring-[#0b439c]"
                          />
                        </div>
                      </div>

                      {/* Lista de alunos correspondentes */}
                      {matchingStudents.length > 0 && (
                        <div className="max-h-48 overflow-y-auto divide-y divide-zinc-100 bg-white border border-zinc-200 rounded-xl shadow-2xs">
                          {matchingStudents.map((usr: any) => {
                            const matricula = String(usr.matricula || usr.id || "");
                            return (
                              <button
                                key={matricula}
                                type="button"
                                onClick={() => {
                                  setTargetMatricula(matricula);
                                  setManualMatriculaInput(matricula);
                                  setUserSearchQuery("");
                                }}
                                className="w-full text-left p-3 text-xs flex items-center justify-between transition-colors cursor-pointer hover:bg-blue-50/60"
                              >
                                <div className="min-w-0 pr-3">
                                  <span className="font-bold text-zinc-900 block truncate">
                                    {usr.nome || usr.name || "Aluno"}
                                  </span>
                                  <span className="text-zinc-500 text-[11px] block truncate">
                                    {usr.email}
                                  </span>
                                </div>
                                <span className="font-mono text-[#0b439c] font-black text-xs shrink-0 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                  {matricula}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Opção alternativa de digitar matrícula manual caso o aluno não esteja na lista inicial */}
                      <div className="pt-1 flex items-center gap-2">
                        <span className="text-[11px] text-zinc-400">Ou informe a matrícula direta:</span>
                        <input
                          type="text"
                          value={manualMatriculaInput}
                          onChange={(e) => {
                            setManualMatriculaInput(e.target.value);
                            setTargetMatricula(e.target.value);
                          }}
                          placeholder="Ex: 20261012"
                          className="w-36 bg-white border border-zinc-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:border-[#0b439c]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Tipo de Comunicado (com opção 'Outro' e campo de preenchimento) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-black uppercase tracking-wider text-zinc-700">
                Tipo do Comunicado
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { id: "Aviso Geral", label: "Aviso Geral" },
                  { id: "Segurança", label: "Segurança" },
                  { id: "Comunicado Oficial", label: "Comunicado Oficial" },
                  { id: "Suporte", label: "Suporte" },
                  { id: "Outro", label: "Outro" }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTipo(item.id);
                      if (item.id !== "Outro") setCustomTipo("");
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      tipo === item.id
                        ? "bg-[#0b439c] text-white border-[#0b439c] shadow-xs"
                        : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Caixinha quando selecionar 'Outro' */}
              {tipo === "Outro" && (
                <div className="pt-2 animate-in fade-in duration-150 space-y-1">
                  <label className="block text-xs font-bold text-zinc-700">
                    Especifique o tipo ou assunto personalizado: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customTipo}
                    onChange={(e) => setCustomTipo(e.target.value)}
                    placeholder="Ex: Evento Especial, Cronograma Acadêmico, Parceria..."
                    className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#0b439c] focus:ring-1 focus:ring-[#0b439c]"
                    required={tipo === "Outro"}
                  />
                </div>
              )}
            </div>

            {/* 3. Título da Notificação */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-zinc-700">
                Título da Notificação <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Atualização Importante sobre as Aulas e Avaliações"
                className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none focus:border-[#0b439c] focus:ring-1 focus:ring-[#0b439c]"
                required
              />
            </div>

            {/* 4. Mensagem / Conteúdo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-700">
                  Mensagem / Conteúdo <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {mensagem.length} caracteres
                </span>
              </div>
              <textarea
                rows={9}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Digite detalhadamente a mensagem que os alunos lerão..."
                className="w-full bg-white border border-zinc-300 rounded-2xl p-4 text-xs font-medium text-zinc-900 leading-relaxed focus:outline-none focus:border-[#0b439c] focus:ring-1 focus:ring-[#0b439c]"
                required
              />
            </div>

            {/* Barra de Rodapé com Ações */}
            <div className="pt-6 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setViewMode("list");
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs transition-all shadow-md shadow-blue-900/15 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transmitindo...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Emitir Notificação Agora</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
