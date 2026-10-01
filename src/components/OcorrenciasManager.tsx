import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Bell,
  Send,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Mail,
  ChevronDown,
  X,
  Plus,
  Eye,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  MessageSquare,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface OcorrenciaItem {
  id: string;
  matricula_usuario?: string;
  nome?: string;
  email?: string;
  acao_detectada?: string;
  explicacao_ocorrido?: string;
  status?: "Pendente" | "Em Análise" | "Resolvido" | string;
  data_hora?: string;
}

export interface NotificacaoItem {
  id: string;
  titulo?: string;
  mensagem?: string;
  destinatarios?: string;
  tipo?: string;
  criado_em?: string;
}

interface OcorrenciasManagerProps {
  allUsers?: any[];
  currentAdminName?: string;
  currentUserId?: string;
}

export const OcorrenciasManager: React.FC<OcorrenciasManagerProps> = ({
  allUsers = [],
  currentAdminName = "Administrador",
  currentUserId = ""
}) => {
  // Tabs internas: "ocorrencias" ou "notificacoes"
  const [activeSubTab, setActiveSubTab] = useState<"ocorrencias" | "notificacoes">("ocorrencias");

  // Estados de Ocorrências
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<OcorrenciaItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Estados de Notificações
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const [isNewNotifModalOpen, setIsNewNotifModalOpen] = useState(false);
  const [newNotifTitulo, setNewNotifTitulo] = useState("");
  const [newNotifMensagem, setNewNotifMensagem] = useState("");
  const [newNotifDestinatarios, setNewNotifDestinatarios] = useState("");
  const [newNotifTipo, setNewNotifTipo] = useState("Segurança");
  const [isSendToAll, setIsSendToAll] = useState(false);
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [notifFeedbackMsg, setNotifFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Carregar ocorrências do Supabase
  const loadOcorrencias = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ocorrencias")
        .select("*")
        .order("data_hora", { ascending: false });

      if (!error && Array.isArray(data)) {
        setOcorrencias(
          data.map((row: any) => ({
            id: String(row.id),
            matricula_usuario: row.matricula_usuario || "",
            nome: row.nome || "Estudante",
            email: row.email || "",
            acao_detectada: row.acao_detectada || "Ação Não Autorizada",
            explicacao_ocorrido: row.explicacao_ocorrido || "",
            status: row.status || "Pendente",
            data_hora: row.data_hora || new Date().toISOString()
          }))
        );
      }
    } catch (err) {
      console.error("Erro ao carregar ocorrências:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar notificações do Supabase
  const loadNotificacoes = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingNotifs(true);
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
            tipo: row.tipo || "Geral",
            criado_em: row.criado_em || new Date().toISOString()
          }))
        );
      }
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setIsLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    loadOcorrencias();
    loadNotificacoes();
  }, [loadOcorrencias, loadNotificacoes]);

  // Atualizar status da ocorrência no Supabase
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("ocorrencias")
        .update({ status: newStatus })
        .eq("id", id);

      if (!error) {
        setOcorrencias((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
        );
        if (selectedOcorrencia && selectedOcorrencia.id === id) {
          setSelectedOcorrencia((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err) {
      console.error("Erro ao atualizar status da ocorrência:", err);
    }
  };

  // Excluir ocorrência
  const handleDeleteOcorrencia = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro de ocorrência?")) return;
    if (!supabase) return;
    try {
      const { error } = await supabase.from("ocorrencias").delete().eq("id", id);
      if (!error) {
        setOcorrencias((prev) => prev.filter((o) => o.id !== id));
        if (selectedOcorrencia?.id === id) {
          setIsDetailModalOpen(false);
          setSelectedOcorrencia(null);
        }
      }
    } catch (err) {
      console.error("Erro ao excluir ocorrência:", err);
    }
  };

  // Abrir modal de notificação preenchido com a matrícula do aluno
  const handleOpenNotifForUser = (ocorrencia: OcorrenciaItem) => {
    setNewNotifDestinatarios(ocorrencia.matricula_usuario || "");
    setIsSendToAll(false);
    setNewNotifTipo("Segurança");
    setNewNotifTitulo(`Aviso de Segurança — Ocorrência em Aula`);
    setNewNotifMensagem(
      `Prezado(a) ${ocorrencia.nome || "Estudante"},\n\nIdentificamos uma tentativa de cópia ou impressão de conteúdo protegido durante seus estudos na plataforma. Lembramos que os materiais das aulas são de uso individual e confidencial.\n\nCaso tenha alguma dúvida, entre em contato com a equipe de suporte.`
    );
    setIsNewNotifModalOpen(true);
  };

  // Enviar nova notificação para o Supabase
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotifTitulo.trim() || !newNotifMensagem.trim()) {
      setNotifFeedbackMsg({ type: "error", text: "Preencha o título e a mensagem." });
      return;
    }
    const finalDestinatarios = isSendToAll ? "todos" : newNotifDestinatarios.trim();
    if (!finalDestinatarios) {
      setNotifFeedbackMsg({ type: "error", text: "Informe a matrícula de destino ou selecione 'Todos'." });
      return;
    }

    setIsSendingNotif(true);
    setNotifFeedbackMsg(null);

    try {
      const newId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const payload = {
        id: newId,
        titulo: newNotifTitulo.trim(),
        mensagem: newNotifMensagem.trim(),
        destinatarios: finalDestinatarios,
        tipo: newNotifTipo.trim(),
        criado_em: new Date().toISOString()
      };

      if (supabase) {
        const { error } = await supabase.from("notificacoes").insert([payload]);
        if (error) throw error;
      }

      setNotificacoes((prev) => [payload, ...prev]);
      setNotifFeedbackMsg({ type: "success", text: "Notificação emitida com sucesso!" });

      setTimeout(() => {
        setIsNewNotifModalOpen(false);
        setNewNotifTitulo("");
        setNewNotifMensagem("");
        setNewNotifDestinatarios("");
        setIsSendToAll(false);
        setNotifFeedbackMsg(null);
      }, 1500);
    } catch (err: any) {
      console.error("Erro ao enviar notificação:", err);
      setNotifFeedbackMsg({ type: "error", text: "Erro ao emitir notificação. Verifique o banco de dados." });
    } finally {
      setIsSendingNotif(false);
    }
  };

  // Excluir notificação
  const handleDeleteNotificacao = async (id: string) => {
    if (!confirm("Deseja excluir esta notificação emitida?")) return;
    if (!supabase) return;
    try {
      const { error } = await supabase.from("notificacoes").delete().eq("id", id);
      if (!error) {
        setNotificacoes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error("Erro ao excluir notificação:", err);
    }
  };

  // Métricas de ocorrências
  const stats = useMemo(() => {
    const total = ocorrencias.length;
    const pendentes = ocorrencias.filter((o) => (o.status || "").toLowerCase().includes("pendente")).length;
    const emAnalise = ocorrencias.filter((o) => (o.status || "").toLowerCase().includes("análise") || (o.status || "").toLowerCase().includes("analise")).length;
    const resolvidas = ocorrencias.filter((o) => (o.status || "").toLowerCase().includes("resolvido")).length;
    return { total, pendentes, emAnalise, resolvidas };
  }, [ocorrencias]);

  // Filtragem de ocorrências
  const filteredOcorrencias = useMemo(() => {
    return ocorrencias.filter((item) => {
      const matchesSearch =
        (item.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.matricula_usuario || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.acao_detectada || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.explicacao_ocorrido || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === "todos") return true;
      if (filterStatus === "pendente") return (item.status || "").toLowerCase().includes("pendente");
      if (filterStatus === "analise") return (item.status || "").toLowerCase().includes("análise") || (item.status || "").toLowerCase().includes("analise");
      if (filterStatus === "resolvido") return (item.status || "").toLowerCase().includes("resolvido");
      return true;
    });
  }, [ocorrencias, searchTerm, filterStatus]);

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

  return (
    <div className="space-y-6">
      {/* Barra de Cabeçalho Superior */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-zinc-900 tracking-tight">Ocorrências de Segurança</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700">
                Auditoria & Proteção
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium">
              Monitoramento de tentativas de cópia, impressão e infrações durante as aulas do Programa Certo.
            </p>
          </div>
        </div>

        {/* Alternador de Sub-Abas */}
        <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("ocorrencias")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "ocorrencias"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span>Ocorrências</span>
            {stats.pendentes > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white">
                {stats.pendentes}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("notificacoes")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "notificacoes"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Bell className="w-4 h-4 text-[#0b439c]" />
            <span>Notificações</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700">
              {notificacoes.length}
            </span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Sub-Aba: Ocorrências */}
      {activeSubTab === "ocorrencias" && (
        <div className="space-y-6">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total de Ocorrências</p>
                <p className="text-2xl font-black text-zinc-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-red-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Pendentes</p>
                <p className="text-2xl font-black text-red-600 mt-1">{stats.pendentes}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Em Análise</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{stats.emAnalise}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Resolvidas</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{stats.resolvidas}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
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
                placeholder="Buscar por matrícula, nome ou ação..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-zinc-900 focus:outline-none focus:border-[#0b439c] transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
                {(["todos", "pendente", "analise", "resolvido"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      filterStatus === st ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {st === "todos" ? "Todos" : st === "analise" ? "Em Análise" : st}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={loadOcorrencias}
                title="Recarregar ocorrências"
                className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#0b439c]" : ""}`} />
              </button>
            </div>
          </div>

          {/* Tabela de Ocorrências */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden">
            {filteredOcorrencias.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-sm font-bold text-zinc-800">Nenhuma ocorrência registrada</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  {searchTerm
                    ? "Nenhum resultado corresponde à sua pesquisa."
                    : "Tudo tranquilo! Nenhuma tentativa de cópia ou impressão foi detectada nas aulas até o momento."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-700">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Estudante</th>
                      <th className="py-3.5 px-4">Ação Detectada</th>
                      <th className="py-3.5 px-4">Relatório do Ocorrido</th>
                      <th className="py-3.5 px-4">Data & Horário</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredOcorrencias.map((item) => {
                      const isPendente = (item.status || "").toLowerCase().includes("pendente");
                      const isAnalise = (item.status || "").toLowerCase().includes("análise") || (item.status || "").toLowerCase().includes("analise");
                      const isResolvido = (item.status || "").toLowerCase().includes("resolvido");

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-zinc-50/80 transition-colors group cursor-pointer"
                          onClick={() => {
                            setSelectedOcorrencia(item);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          {/* Coluna: Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                isPendente
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : isAnalise
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isPendente ? "bg-red-600 animate-pulse" : isAnalise ? "bg-amber-500" : "bg-emerald-600"
                                }`}
                              />
                              {item.status || "Pendente"}
                            </span>
                          </td>

                          {/* Coluna: Estudante (Matrícula e Nome) */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <span className="inline-block px-1.5 py-0.5 bg-blue-50 border border-blue-200/80 text-[#0b439c] font-black text-[10px] rounded-md font-mono">
                                {item.matricula_usuario || "Sem Matrícula"}
                              </span>
                              <p className="font-bold text-zinc-900 line-clamp-1">{item.nome || "Estudante"}</p>
                              {item.email && <p className="text-[11px] text-zinc-400 font-normal line-clamp-1">{item.email}</p>}
                            </div>
                          </td>

                          {/* Coluna: Ação Detectada */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 font-bold text-zinc-800 bg-zinc-100 px-2 py-1 rounded-lg text-[11px]">
                              <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              <span className="line-clamp-1">{item.acao_detectada}</span>
                            </span>
                          </td>

                          {/* Coluna: Explicação do Ocorrido */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="text-zinc-600 font-medium line-clamp-2 text-[11px] leading-relaxed">
                              {item.explicacao_ocorrido || "Registro automático de 3 tentativas consecutivas de impressão ou captura de conteúdo durante a aula."}
                            </p>
                          </td>

                          {/* Coluna: Data e Horário */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500 text-[11px] font-medium">
                            {formatDateBR(item.data_hora)}
                          </td>

                          {/* Coluna: Ações Rápidas */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="Enviar notificação direta para o aluno"
                                onClick={() => handleOpenNotifForUser(item)}
                                className="p-1.5 text-[#0b439c] hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                              >
                                <Send className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                title="Ver detalhes completos"
                                onClick={() => {
                                  setSelectedOcorrencia(item);
                                  setIsDetailModalOpen(true);
                                }}
                                className="p-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-all cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                title="Excluir ocorrência"
                                onClick={() => handleDeleteOcorrencia(item.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da Sub-Aba: Notificações */}
      {activeSubTab === "notificacoes" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Comunicados e Avisos para Estudantes</h2>
              <p className="text-xs text-zinc-500">Envie mensagens diretamente para uma matrícula, grupo ou para todos os alunos.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewNotifDestinatarios("");
                setIsSendToAll(false);
                setNewNotifTipo("Aviso");
                setNewNotifTitulo("");
                setNewNotifMensagem("");
                setIsNewNotifModalOpen(true);
              }}
              className="px-4 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Notificação</span>
            </button>
          </div>

          {/* Listagem de Notificações */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden">
            {notificacoes.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0b439c] flex items-center justify-center mx-auto">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-800">Nenhuma notificação emitida</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Crie comunicados para alertar alunos sobre segurança, novidades ou avisos gerais.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {notificacoes.map((notif) => (
                  <div key={notif.id} className="p-4 sm:p-5 hover:bg-zinc-50/80 transition-all flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-[#0b439c]">
                          {notif.tipo || "Geral"}
                        </span>
                        <h4 className="font-bold text-sm text-zinc-900">{notif.titulo}</h4>
                        <span className="text-[11px] text-zinc-400">• {formatDateBR(notif.criado_em)}</span>
                      </div>

                      <p className="text-xs text-zinc-600 font-medium whitespace-pre-wrap leading-relaxed">
                        {notif.mensagem}
                      </p>

                      <div className="flex items-center gap-2 pt-1 text-[11px]">
                        <span className="font-bold text-zinc-500">Destinatários:</span>
                        <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-800 font-bold">
                          {notif.destinatarios === "todos" ? "🌐 Todos os Usuários" : notif.destinatarios}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      title="Excluir notificação"
                      onClick={() => handleDeleteNotificacao(notif.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer shrink-0"
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

      {/* Modal: Detalhes da Ocorrência */}
      <AnimatePresence>
        {isDetailModalOpen && selectedOcorrencia && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Topo do Modal */}
              <div className="p-6 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-zinc-900 text-base">Laudo Pericial da Ocorrência</h3>
                    <p className="text-xs text-zinc-500 font-mono">ID: {selectedOcorrencia.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo com Informações */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-700">
                {/* Dados do Estudante */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estudante</p>
                    <p className="font-bold text-zinc-900 text-sm mt-0.5">{selectedOcorrencia.nome}</p>
                    <p className="text-zinc-500">{selectedOcorrencia.email || "E-mail não informado"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Matrícula</p>
                    <p className="font-mono font-black text-[#0b439c] text-sm mt-0.5">
                      {selectedOcorrencia.matricula_usuario || "—"}
                    </p>
                    <p className="text-zinc-500">Data: {formatDateBR(selectedOcorrencia.data_hora)}</p>
                  </div>
                </div>

                {/* Ação Detectada */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                    Ação Detectada
                  </label>
                  <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl flex items-center gap-2.5 font-bold text-red-900">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{selectedOcorrencia.acao_detectada}</span>
                  </div>
                </div>

                {/* Explicação do Ocorrido */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                    Explicação Analítica do Ocorrido
                  </label>
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-800 leading-relaxed font-medium whitespace-pre-wrap">
                    {selectedOcorrencia.explicacao_ocorrido ||
                      "O estudante realizou 3 tentativas de cópia ou impressão durante o estudo da aula. A ocorrência foi consolidada automaticamente na terceira tentativa conforme a política de segurança."}
                  </div>
                </div>

                {/* Alterar Status */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                    Alterar Status da Ocorrência
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {(["Pendente", "Em Análise", "Resolvido"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateStatus(selectedOcorrencia.id, st)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          selectedOcorrencia.status === st
                            ? "bg-[#0b439c] text-white border-[#0b439c] shadow-xs"
                            : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rodapé do Modal */}
              <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenNotifForUser(selectedOcorrencia);
                  }}
                  className="px-4 py-2.5 bg-blue-50 text-[#0b439c] hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Notificar Este Aluno</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Nova Notificação */}
      <AnimatePresence>
        {isNewNotifModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewNotifModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden z-10 flex flex-col"
            >
              <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0b439c] flex items-center justify-center font-bold">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 text-sm">Emitir Nova Notificação</h3>
                    <p className="text-[11px] text-zinc-500">Envio para a caixa de avisos do estudante</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewNotifModalOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendNotification} className="p-5 space-y-4 text-xs">
                {/* Feedback */}
                {notifFeedbackMsg && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold ${
                      notifFeedbackMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-red-50 text-red-800 border-red-200"
                    }`}
                  >
                    {notifFeedbackMsg.text}
                  </div>
                )}

                {/* Destinatários */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Destinatários</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-[#0b439c]">
                      <input
                        type="checkbox"
                        checked={isSendToAll}
                        onChange={(e) => setIsSendToAll(e.target.checked)}
                        className="rounded accent-[#0b439c]"
                      />
                      <span>Enviar para TODOS</span>
                    </label>
                  </div>

                  {!isSendToAll && (
                    <input
                      type="text"
                      required={!isSendToAll}
                      value={newNotifDestinatarios}
                      onChange={(e) => setNewNotifDestinatarios(e.target.value)}
                      placeholder="Ex: PC-102030 ou PC-102030, PC-204060..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-[#0b439c]"
                    />
                  )}
                  {isSendToAll && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[#0b439c] font-bold text-xs">
                      🌐 Esta mensagem será visível para todos os estudantes da plataforma.
                    </div>
                  )}
                </div>

                {/* Tipo / Categoria */}
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Tipo de Notificação</label>
                  <input
                    type="text"
                    value={newNotifTipo}
                    onChange={(e) => setNewNotifTipo(e.target.value)}
                    placeholder="Ex: Segurança, Aviso, Importante..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-[#0b439c]"
                  />
                </div>

                {/* Título */}
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Título</label>
                  <input
                    type="text"
                    required
                    value={newNotifTitulo}
                    onChange={(e) => setNewNotifTitulo(e.target.value)}
                    placeholder="Assunto da notificação..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-[#0b439c]"
                  />
                </div>

                {/* Mensagem */}
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Mensagem</label>
                  <textarea
                    required
                    rows={4}
                    value={newNotifMensagem}
                    onChange={(e) => setNewNotifMensagem(e.target.value)}
                    placeholder="Conteúdo que o estudante vai ler..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 focus:outline-none focus:border-[#0b439c] resize-none"
                  />
                </div>

                {/* Ações */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewNotifModalOpen(false)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingNotif}
                    className="px-5 py-2 bg-[#0b439c] hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isSendingNotif ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Emitir Notificação</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
