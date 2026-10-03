import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  UserPlus,
  AlertCircle
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

interface SelectedStudent {
  matricula: string;
  nome: string;
  email?: string;
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
  // Modo de visualização: "list" (lista) | "create" (tela inteira de criação) | "edit" (tela inteira de edição)
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit">("list");
  const [editingNotifId, setEditingNotifId] = useState<string | null>(null);

  // Controle de mensagens expandidas na listagem
  const [expandedNotifIds, setExpandedNotifIds] = useState<Record<string, boolean>>({});

  // Lista de notificações
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  // Alerta temporário de 5 segundos no canto da tela
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Formulário de Criação / Edição
  const [isSendToAll, setIsSendToAll] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<SelectedStudent[]>([]);
  const [matriculaInput, setMatriculaInput] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

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

  // Atualizar URL do navegador com histórico pushState
  const updateUrl = (path: string) => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
    }
  };

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

  // Se veio com uma matrícula pré-selecionada (ex: vindo de ocorrência)
  useEffect(() => {
    if (initialTargetMatricula) {
      const student = allUsers.find(
        (u: any) => String(u.matricula || u.id).trim() === initialTargetMatricula.trim()
      );
      setIsSendToAll(false);
      setSelectedStudents([
        {
          matricula: initialTargetMatricula.trim(),
          nome: student ? (student.nome || student.name || "Estudante") : "Estudante",
          email: student?.email || ""
        }
      ]);
      setViewMode("create");
      updateUrl("/notificacoes/nova");
    }
  }, [initialTargetMatricula, allUsers]);

  // Helper para adicionar estudante à lista de selecionados
  const addStudentToList = (student: SelectedStudent) => {
    if (!student.matricula) return;
    const exists = selectedStudents.some(
      (s) => s.matricula.trim().toLowerCase() === student.matricula.trim().toLowerCase()
    );
    if (exists) {
      showToast(`O estudante com matrícula ${student.matricula} já está na lista.`);
      return;
    }
    setSelectedStudents((prev) => [...prev, student]);
  };

  // Remover estudante da lista
  const removeStudentFromList = (matricula: string) => {
    setSelectedStudents((prev) => prev.filter((s) => s.matricula !== matricula));
  };

  // Tratar submissão do Campo 1: Matrícula direta + Enter
  const handleAddByMatricula = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanMat = matriculaInput.trim();
    if (!cleanMat) return;

    // Procurar nos usuários cadastrados
    const found = allUsers.find(
      (u: any) => String(u.matricula || u.id).trim().toLowerCase() === cleanMat.toLowerCase()
    );

    if (found) {
      addStudentToList({
        matricula: String(found.matricula || found.id).trim(),
        nome: found.nome || found.name || "Estudante",
        email: found.email || ""
      });
    } else {
      // Se não encontrou aluno com esse id no mock/banco, permite adicionar como matrícula manual
      addStudentToList({
        matricula: cleanMat,
        nome: `Aluno (${cleanMat})`,
        email: ""
      });
    }
    setMatriculaInput("");
  };

  // Alunos filtrados pela barra de busca de nome, e-mail ou matrícula
  const searchResults = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return allUsers.filter((u: any) => {
      const nome = String(u.nome || u.name || "").toLowerCase();
      const matricula = String(u.matricula || u.id || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();
      return nome.includes(q) || matricula.includes(q) || email.includes(q);
    });
  }, [allUsers, userSearchQuery]);

  // Tratar quando o usuário aperta Enter na barra de pesquisa por nome
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = userSearchQuery.trim().toLowerCase();
      if (!q) return;

      // Verificar se há mais de um aluno com o mesmo nome na lista encontrada
      const exactNameMatches = allUsers.filter((u: any) => {
        const nome = String(u.nome || u.name || "").trim().toLowerCase();
        return nome === q || nome.includes(q);
      });

      if (exactNameMatches.length > 1) {
        showToast("Atenção: Há mais de um estudante com este nome. Por favor, selecione na lista o aluno desejado.");
        return;
      }

      if (exactNameMatches.length === 1) {
        const u = exactNameMatches[0];
        addStudentToList({
          matricula: String(u.matricula || u.id).trim(),
          nome: u.nome || u.name || "Estudante",
          email: u.email || ""
        });
        setUserSearchQuery("");
      } else if (searchResults.length === 1) {
        const u = searchResults[0];
        addStudentToList({
          matricula: String(u.matricula || u.id).trim(),
          nome: u.nome || u.name || "Estudante",
          email: u.email || ""
        });
        setUserSearchQuery("");
      }
    }
  };

  // Abrir Tela de Criação
  const handleOpenCreate = () => {
    setFeedback(null);
    setEditingNotifId(null);
    setTitulo("");
    setMensagem("");
    setTipo("Aviso Geral");
    setCustomTipo("");
    setIsSendToAll(true);
    setSelectedStudents([]);
    setMatriculaInput("");
    setUserSearchQuery("");
    setViewMode("create");
    updateUrl("/notificacoes/nova");
  };

  // Abrir Tela de Edição
  const handleOpenEdit = (notif: NotificacaoItem) => {
    setFeedback(null);
    setEditingNotifId(notif.id);
    setTitulo(notif.titulo || "");
    setMensagem(notif.mensagem || "");

    const notifTipo = notif.tipo || "Aviso Geral";
    const standardTipos = ["Aviso Geral", "Segurança", "Comunicado Oficial", "Suporte"];
    if (standardTipos.includes(notifTipo)) {
      setTipo(notifTipo);
      setCustomTipo("");
    } else {
      setTipo("Outro");
      setCustomTipo(notifTipo);
    }

    const isAll = (notif.destinatarios || "").toLowerCase() === "todos";
    setIsSendToAll(isAll);

    if (!isAll && notif.destinatarios) {
      // Reconstituir lista de estudantes selecionados a partir das matrículas salvas (separadas por vírgula)
      const rawMats = notif.destinatarios.split(",").map((m) => m.trim()).filter(Boolean);
      const reconstructed: SelectedStudent[] = rawMats.map((mat) => {
        const usr = allUsers.find(
          (u: any) => String(u.matricula || u.id).trim().toLowerCase() === mat.toLowerCase()
        );
        return {
          matricula: mat,
          nome: usr ? (usr.nome || usr.name || "Estudante") : `Aluno (${mat})`,
          email: usr?.email || ""
        };
      });
      setSelectedStudents(reconstructed);
    } else {
      setSelectedStudents([]);
    }

    setMatriculaInput("");
    setUserSearchQuery("");
    setViewMode("edit");
    updateUrl(`/notificacoes/editar-${notif.id}`);
  };

  // Alternar expansão da mensagem na lista
  const toggleExpand = (id: string) => {
    setExpandedNotifIds((prev) => {
      const nextState = !prev[id];
      if (nextState) {
        updateUrl(`/notificacoes/visualizar-${id}`);
      } else {
        updateUrl("/notificacoes");
      }
      return { ...prev, [id]: nextState };
    });
  };

  // Voltar para a listagem
  const handleBackToList = () => {
    setFeedback(null);
    setViewMode("list");
    setEditingNotifId(null);
    updateUrl("/notificacoes");
  };

  // Salvar (Criar ou Atualizar) Notificação
  const handleSaveNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setFeedback({ type: "error", text: "Informe o título da notificação." });
      return;
    }
    if (!mensagem.trim()) {
      setFeedback({ type: "error", text: "Escreva a mensagem do comunicado." });
      return;
    }

    let finalDestinatarios = "todos";
    if (!isSendToAll) {
      if (selectedStudents.length === 0) {
        setFeedback({
          type: "error",
          text: "Adicione ao menos um estudante específico para enviar este comunicado."
        });
        return;
      }
      finalDestinatarios = selectedStudents.map((s) => s.matricula.trim()).join(", ");
    }

    const finalTipo = tipo === "Outro" ? customTipo.trim() || "Outro" : tipo.trim();

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (viewMode === "edit" && editingNotifId) {
        // Modo Edição
        const payload = {
          titulo: titulo.trim(),
          mensagem: mensagem.trim(),
          destinatarios: finalDestinatarios,
          tipo: finalTipo
        };

        if (supabase && isSupabaseConfigured) {
          const { error } = await supabase
            .from("notificacoes")
            .update(payload)
            .eq("id", editingNotifId);
          if (error) throw error;
        }

        setNotificacoes((prev) =>
          prev.map((n) => (n.id === editingNotifId ? { ...n, ...payload } : n))
        );
        setFeedback({ type: "success", text: "Notificação atualizada com sucesso!" });
      } else {
        // Modo Criação
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
      }

      // Retornar suavemente para a lista
      setTimeout(() => {
        handleBackToList();
      }, 1200);
    } catch (err: any) {
      console.error("Erro ao salvar notificação:", err);
      setFeedback({
        type: "error",
        text: "Não foi possível salvar a notificação. Verifique sua conexão com o banco de dados."
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

  // Estatísticas (3 cards)
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
    if (t.includes("seguran")) return "bg-red-100 text-red-700 border-red-200";
    if (t.includes("aviso") || t.includes("alerta")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (t.includes("suporte") || t.includes("atendimento")) return "bg-purple-100 text-purple-800 border-purple-200";
    if (t.includes("comunicado")) return "bg-blue-100 text-[#0b439c] border-blue-200";
    return "bg-zinc-100 text-zinc-800 border-zinc-200";
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast flutuante de alerta no canto da tela (5 segundos) */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[999] max-w-md bg-amber-50 border-2 border-amber-300 text-amber-950 p-4 rounded-2xl shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs font-bold leading-relaxed">
            {toastMessage}
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 text-amber-700 hover:text-amber-900 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                onClick={handleOpenCreate}
                className="px-4 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-900/15"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Notificação</span>
              </button>
            </div>
          </div>

          {/* Cards de Métricas (Apenas 3 cards) */}
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
                { id: "individual", label: "Estudantes Específicos" }
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

          {/* Listagem de Notificações com Comecinho + Setinha de Expansão + Lápis de Edição */}
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
                  onClick={handleOpenCreate}
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
                  const isExpanded = !!expandedNotifIds[notif.id];
                  const fullMsg = notif.mensagem || "";
                  const isLongMsg = fullMsg.length > 120 || fullMsg.includes("\n");

                  return (
                    <div
                      key={notif.id}
                      className="p-5 hover:bg-blue-50/20 transition-all space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Cabeçalho do Card: Tipo, Título, Data */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getBadgeStyle(
                                notif.tipo
                              )}`}
                            >
                              {notif.tipo || "Comunicado"}
                            </span>

                            <h3 className="font-bold text-sm text-zinc-900 truncate">
                              {notif.titulo}
                            </h3>

                            <span className="text-[11px] text-zinc-400 font-medium">
                              • {formatDateBR(notif.criado_em)}
                            </span>
                          </div>

                          {/* Destinatários */}
                          <div className="flex items-center gap-2 pt-0.5 text-xs">
                            <span className="text-zinc-400 font-bold">Destino:</span>
                            {isAll ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[11px]">
                                <Users className="w-3 h-3 text-emerald-600" />
                                Todos os Estudantes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 font-mono font-bold text-[11px]">
                                <User className="w-3 h-3 text-zinc-500" />
                                {notif.destinatarios}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botões de Ação: Lápis (Editar) e Lixeira (Excluir) */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                          <button
                            type="button"
                            title="Editar notificação"
                            onClick={() => handleOpenEdit(notif)}
                            className="p-2 text-zinc-500 hover:text-[#0b439c] hover:bg-blue-50 rounded-xl transition-all cursor-pointer border border-zinc-200/80 shadow-2xs"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

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

                      {/* Mensagem: Comecinho + Botão com Setinha para Expandir/Recolher */}
                      <div className="bg-zinc-50/80 border border-zinc-200/60 rounded-xl p-3.5">
                        <p className={`text-xs text-zinc-700 font-medium whitespace-pre-wrap leading-relaxed ${!isExpanded ? "line-clamp-2" : ""}`}>
                          {fullMsg}
                        </p>

                        {isLongMsg && (
                          <div className="pt-2 flex justify-start">
                            <button
                              type="button"
                              onClick={() => toggleExpand(notif.id)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0b439c] hover:text-blue-800 transition-colors cursor-pointer"
                            >
                              <span>{isExpanded ? "Recolher mensagem" : "Ler mensagem completa"}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
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
      {/* TELA B: NOVA NOTIFICAÇÃO / EDIÇÃO (EM TELA INTEIRA - SEM SEGUNDA CAMADA)  */}
      {/* ========================================================================= */}
      {(viewMode === "create" || viewMode === "edit") && (
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden animate-in fade-in duration-150">
          {/* Cabeçalho da Tela de Emissão/Edição (Sem emissor) */}
          <div className="p-6 border-b border-zinc-200 flex items-center justify-between gap-4 bg-zinc-50/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToList}
                className="p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Notificações</span>
              </button>
              <div>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                  {viewMode === "edit" ? "Editar Notificação" : "Emitir Nova Notificação"}
                </h2>
                <p className="text-xs text-zinc-500 font-medium">
                  {viewMode === "edit"
                    ? "Atualize os dados e os estudantes destinatários desta notificação."
                    : "Envie avisos, comunicados oficiais ou alertas diretos aos estudantes."}
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
          <form onSubmit={handleSaveNotification} className="p-6 sm:p-8 space-y-7 max-w-5xl mx-auto">
            {/* 1. Destinatários da Notificação: Todos vs Estudantes Específicos */}
            <div className="bg-zinc-50/70 border border-zinc-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0b439c]" />
                Destinatários da Notificação
              </label>

              {/* Botões de Seleção: Todos vs Estudantes Específicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsSendToAll(true)}
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
                    <strong className="block text-xs font-bold">Transmissão Geral (Todos os Estudantes)</strong>
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
                    <strong className="block text-xs font-bold">Estudantes Específicos</strong>
                    <span className="text-[11px] text-zinc-500">
                      Adicione um ou múltiplos estudantes para receberem a notificação.
                    </span>
                  </div>
                </button>
              </div>

              {/* Seção de Estudantes Específicos: Campo 1 (Matrícula direta) e Campo 2 (Pesquisa) */}
              {!isSendToAll && (
                <div className="pt-3 space-y-4 border-t border-zinc-200/80">
                  {/* Campo 1: Matrícula do Usuário por primeiro */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                      1. Matrícula do Estudante:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={matriculaInput}
                        onChange={(e) => setMatriculaInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddByMatricula();
                          }
                        }}
                        placeholder="Digite a matrícula do estudante e aperte Enter..."
                        className="flex-1 bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:border-[#0b439c] focus:ring-1 focus:ring-[#0b439c]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddByMatricula()}
                        className="px-4 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Adicionar Aluno</span>
                      </button>
                    </div>
                  </div>

                  {/* Campo 2: Pesquisar por Nome, E-mail ou Matrícula por segundo */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                      2. Ou pesquise por Nome, E-mail ou Matrícula:
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Pesquisar por nome, e-mail ou matrícula (aperte Enter ou clique para adicionar)..."
                        className="w-full bg-white border border-zinc-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-[#0b439c] focus:ring-1 focus:ring-[#0b439c]"
                      />
                    </div>

                    {/* Lista suspensa de resultados ao pesquisar */}
                    {searchResults.length > 0 && userSearchQuery.trim() !== "" && (
                      <div className="mt-2 max-h-48 overflow-y-auto divide-y divide-zinc-100 bg-white border border-zinc-200 rounded-xl shadow-md">
                        {searchResults.map((usr: any) => {
                          const mat = String(usr.matricula || usr.id || "");
                          const isAlreadyAdded = selectedStudents.some((s) => s.matricula === mat);
                          return (
                            <button
                              key={mat}
                              type="button"
                              onClick={() => {
                                addStudentToList({
                                  matricula: mat,
                                  nome: usr.nome || usr.name || "Estudante",
                                  email: usr.email || ""
                                });
                                setUserSearchQuery("");
                              }}
                              className={`w-full text-left p-3 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                isAlreadyAdded ? "bg-zinc-50 opacity-60" : "hover:bg-blue-50/70"
                              }`}
                            >
                              <div className="min-w-0 pr-3">
                                <span className="font-bold text-zinc-900 block truncate">
                                  {usr.nome || usr.name || "Aluno"}
                                </span>
                                <span className="text-zinc-500 text-[11px] block truncate">
                                  {usr.email || "Sem e-mail cadastrado"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-[#0b439c] font-black text-xs bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                  {mat}
                                </span>
                                {isAlreadyAdded && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    Adicionado
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Lista de Estudantes Selecionados com botão de lixeira para remover */}
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-700">
                        Estudantes Selecionados ({selectedStudents.length}):
                      </span>
                      {selectedStudents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedStudents([])}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                        >
                          Remover todos
                        </button>
                      )}
                    </div>

                    {selectedStudents.length === 0 ? (
                      <div className="p-4 rounded-xl bg-white border border-dashed border-zinc-300 text-center text-xs text-zinc-400">
                        Nenhum estudante adicionado ainda. Digite a matrícula acima ou pesquise pelo nome para adicionar.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                        {selectedStudents.map((st) => (
                          <div
                            key={st.matricula}
                            className="p-3 bg-white border border-blue-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[#0b439c] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {st.nome ? st.nome.slice(0, 2).toUpperCase() : "AL"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-900 truncate">
                                  {st.nome}
                                </p>
                                <p className="text-[11px] font-mono text-[#0b439c] font-black truncate">
                                  Matrícula: {st.matricula}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeStudentFromList(st.matricula)}
                              title="Remover este estudante"
                              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                onClick={handleBackToList}
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
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{viewMode === "edit" ? "Salvar Alterações" : "Emitir Notificação Agora"}</span>
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
