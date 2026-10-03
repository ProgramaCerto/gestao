import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Mail,
  X,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  Send,
  ArrowLeft
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { scrollToTop } from "../lib/scrollHelper";

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

interface OcorrenciasManagerProps {
  allUsers?: any[];
  currentAdminName?: string;
  currentUserId?: string;
  onNavigateToNotificacoes?: (matricula?: string, nome?: string) => void;
}

export const OcorrenciasManager: React.FC<OcorrenciasManagerProps> = ({
  allUsers = [],
  currentAdminName = "Administrador",
  currentUserId = "",
  onNavigateToNotificacoes
}) => {
  // Modo de visualização: "list" (lista) ou "detail" (tela inteira de laudo da ocorrência)
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<OcorrenciaItem | null>(null);

  // Estados de Ocorrências
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

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

  useEffect(() => {
    loadOcorrencias();
  }, [loadOcorrencias]);

  // Sempre rolar para o topo absoluto ao alternar entre listagem e detalhe da ocorrencia
  useEffect(() => {
    scrollToTop();
  }, [viewMode]);

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

  // Atualizar URL do navegador com histórico pushState
  const updateUrl = (path: string) => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
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
          setViewMode("list");
          setSelectedOcorrencia(null);
          updateUrl("/ocorrencias");
        }
      }
    } catch (err) {
      console.error("Erro ao excluir ocorrência:", err);
    }
  };

  // Abrir laudo de detalhe em tela cheia (sem segunda camada)
  const handleOpenDetail = (ocorrencia: OcorrenciaItem) => {
    setSelectedOcorrencia(ocorrencia);
    setViewMode("detail");
    updateUrl(`/ocorrencias/visualizar-${ocorrencia.id}`);
    scrollToTop();
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedOcorrencia(null);
    updateUrl("/ocorrencias");
    scrollToTop();
  };

  // Redirecionar para emitir notificação para este aluno
  const handleNotifyStudent = (ocorrencia: OcorrenciaItem) => {
    if (onNavigateToNotificacoes) {
      onNavigateToNotificacoes(ocorrencia.matricula_usuario, ocorrencia.nome);
    }
  };

  // Métricas de ocorrências
  const stats = useMemo(() => {
    const total = ocorrencias.length;
    const pendentes = ocorrencias.filter((o) => (o.status || "").toLowerCase().includes("pendente")).length;
    const emAnalise = ocorrencias.filter(
      (o) =>
        (o.status || "").toLowerCase().includes("análise") ||
        (o.status || "").toLowerCase().includes("analise")
    ).length;
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
      if (filterStatus === "analise")
        return (
          (item.status || "").toLowerCase().includes("análise") ||
          (item.status || "").toLowerCase().includes("analise")
        );
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
      {/* ========================================================================= */}
      {/* MODO 1: LISTAGEM DE OCORRÊNCIAS DE SEGURANÇA                              */}
      {/* ========================================================================= */}
      {viewMode === "list" && (
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
                  Monitoramento e auditoria de tentativas de cópia, impressão e infrações durante as aulas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={loadOcorrencias}
                title="Recarregar ocorrências"
                className="p-2.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs font-bold"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#0b439c]" : ""}`} />
                <span>Atualizar</span>
              </button>

              {onNavigateToNotificacoes && (
                <button
                  type="button"
                  onClick={() => onNavigateToNotificacoes()}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4 text-blue-400" />
                  <span>Ir para Notificações</span>
                </button>
              )}
            </div>
          </div>

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

            <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl self-stretch sm:self-auto overflow-x-auto">
              {(["todos", "pendente", "analise", "resolvido"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                    filterStatus === st ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {st === "todos" ? "Todos" : st === "analise" ? "Em Análise" : st}
                </button>
              ))}
            </div>
          </div>

          {/* Tabela de Ocorrências */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden">
            {filteredOcorrencias.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200/60 shadow-2xs">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-800">Nenhuma ocorrência registrada</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  {searchTerm
                    ? `Nenhum resultado para a busca "${searchTerm}".`
                    : "Todas as atividades dos alunos estão em conformidade com as diretrizes de segurança."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {filteredOcorrencias.map((item) => {
                  const statusColor =
                    (item.status || "").toLowerCase().includes("pendente")
                      ? "bg-red-100 text-red-700 border-red-200"
                      : (item.status || "").toLowerCase().includes("análise") ||
                        (item.status || "").toLowerCase().includes("analise")
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-emerald-100 text-emerald-800 border-emerald-200";

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenDetail(item)}
                      className="p-4 sm:p-5 hover:bg-zinc-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-sm text-zinc-900 truncate">{item.nome}</h4>
                            <span className="font-mono text-[11px] font-bold text-[#0b439c] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              Matrícula: {item.matricula_usuario || "—"}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColor}`}
                            >
                              {item.status || "Pendente"}
                            </span>
                          </div>

                          <p className="text-xs text-red-700 font-semibold truncate max-w-xl">
                            {item.acao_detectada}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                            <span>{formatDateBR(item.data_hora)}</span>
                            {item.email && (
                              <>
                                <span>•</span>
                                <span className="truncate">{item.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div
                        className="flex items-center gap-2 shrink-0 self-end sm:self-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-blue-300 text-zinc-700 hover:text-[#0b439c] rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          Ver Laudo
                        </button>

                        {onNavigateToNotificacoes && (
                          <button
                            type="button"
                            onClick={() => handleNotifyStudent(item)}
                            className="px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-[#0b439c] text-[#0b439c] hover:text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                            title="Emitir notificação para este aluno"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Notificar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteOcorrencia(item.id)}
                          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title="Excluir ocorrência"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
      {/* MODO 2: LAUDO DETALHADO DA OCORRÊNCIA (EM TELA INTEIRA)                   */}
      {/* ========================================================================= */}
      {viewMode === "detail" && selectedOcorrencia && (
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="p-6 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToList}
                className="p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Ocorrências</span>
              </button>
              <div>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                  Laudo Pericial de Segurança
                </h2>
                <p className="text-xs text-zinc-500 font-mono">ID: {selectedOcorrencia.id}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onNavigateToNotificacoes && (
                <button
                  type="button"
                  onClick={() => handleNotifyStudent(selectedOcorrencia)}
                  className="px-4 py-2 bg-[#0b439c] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Emitir Notificação a Este Aluno</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Card com Dados do Aluno */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl p-5">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estudante</p>
                <p className="font-bold text-zinc-900 text-sm mt-0.5">{selectedOcorrencia.nome}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{selectedOcorrencia.email || "E-mail não informado"}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Matrícula</p>
                <p className="font-mono font-black text-[#0b439c] text-sm mt-0.5">
                  {selectedOcorrencia.matricula_usuario || "—"}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5">Identificador Oficial</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data & Horário</p>
                <p className="font-bold text-zinc-900 text-xs mt-0.5">
                  {formatDateBR(selectedOcorrencia.data_hora)}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5">Registro Automático</p>
              </div>
            </div>

            {/* Ação Detectada */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 block">
                Infração Detectada pelo Sistema
              </label>
              <div className="p-4 bg-red-50/70 border border-red-200 rounded-2xl flex items-center gap-3 font-bold text-red-900 text-sm">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{selectedOcorrencia.acao_detectada}</span>
              </div>
            </div>

            {/* Explicação Analítica */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 block">
                Relatório Técnico & Detalhes da Tentativa
              </label>
              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-800 text-xs leading-relaxed font-medium whitespace-pre-wrap">
                {selectedOcorrencia.explicacao_ocorrido ||
                  "O estudante efetuou tentativas consecutivas de cópia de conteúdo protegido durante o estudo da aula. A infração foi registrada automaticamente após a detecção contínua pelo módulo de segurança do player."}
              </div>
            </div>

            {/* Alteração de Status */}
            <div className="p-5 bg-zinc-50/80 border border-zinc-200 rounded-2xl space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 block">
                Atualizar Situação do Laudo
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {(["Pendente", "Em Análise", "Resolvido"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOcorrencia.id, st)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      selectedOcorrencia.status === st
                        ? "bg-[#0b439c] text-white border-[#0b439c] shadow-xs"
                        : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Rodapé com botão de voltar */}
            <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackToList}
                className="px-5 py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Voltar à Lista de Ocorrências
              </button>

              <button
                type="button"
                onClick={() => handleDeleteOcorrencia(selectedOcorrencia.id)}
                className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-rose-200 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Registro</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
