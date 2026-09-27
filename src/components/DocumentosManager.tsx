import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Folder,
  FolderPlus,
  FilePlus,
  Search,
  Printer,
  Trash2,
  ChevronRight,
  FolderOpen,
  ArrowLeft,
  X,
  Move,
  Copy,
  ExternalLink,
  CheckSquare,
  Square,
  ShieldCheck,
  PenTool,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Check,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { LOGO_PROGRAMA_CERTO_BASE64 } from "../lib/logoBase64";
import { openDocumentPdfInBrowser } from "../lib/generateDocumentPdf";

export interface DocFolder {
  id: string;
  id_usuario?: string;
  nome: string;
  criado_em: string;
}

export interface DocumentItem {
  id: string;
  id_usuario?: string;
  pasta_id: string | null; // null = sem pasta / fora de pasta
  titulo: string;
  tamanho_titulo?: "pequeno" | "medio" | "grande";
  estilo_titulo?: "negrito" | "normal";
  alinhamento_titulo?: "center" | "left" | "right";
  conteudo: string;
  tamanho_conteudo?: "pequeno" | "medio" | "grande";
  alinhamento_conteudo?: "justify" | "left" | "center";
  estilo_conteudo?: string; // Palavras em negrito separadas por vírgula ou 'tudo'
  incluir_assinatura_programa_certo: boolean;
  incluir_assinatura_cordenacao: boolean;
  incluir_campo_assinatura_aluno: boolean;
  status: "rascunho" | "emitido" | "arquivado";
  criado_em: string;
  atualizado_em: string;
}

function escapeHtml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatContentWithBoldHtml(content: string, estiloConteudo?: string): string {
  if (!content) return "";
  const trimmed = (estiloConteudo || "").trim().toLowerCase();
  if (trimmed === "tudo" || trimmed === "todo") {
    return `<strong>${escapeHtml(content)}</strong>`;
  }
  let safeHtml = escapeHtml(content);
  if (!trimmed) return safeHtml;

  const words = trimmed
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

  if (words.length === 0) return safeHtml;

  for (const word of words) {
    const escaped = escapeRegExp(escapeHtml(word));
    const regex = new RegExp(`(${escaped})`, "gi");
    safeHtml = safeHtml.replace(regex, "<strong>$1</strong>");
  }
  return safeHtml;
}

export function RenderFormattedContent({
  content,
  estiloConteudo,
  className,
}: {
  content: string;
  estiloConteudo?: string;
  className?: string;
}) {
  const isAllBold = (estiloConteudo || "").trim().toLowerCase() === "tudo" || (estiloConteudo || "").trim().toLowerCase() === "todo";
  if (isAllBold) {
    return <span className={`font-black ${className || ""}`}>{content}</span>;
  }
  const trimmed = (estiloConteudo || "").trim().toLowerCase();
  const words = trimmed
    ? trimmed
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean)
    : [];

  if (words.length === 0) {
    return <span className={className}>{content}</span>;
  }

  const regexPattern = words.map(escapeRegExp).join("|");
  const regex = new RegExp(`(${regexPattern})`, "gi");
  const parts = content.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = words.some((w) => w.toLowerCase() === part.toLowerCase());
        if (isMatch) {
          return (
            <strong key={index} className="font-black text-zinc-950">
              {part}
            </strong>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}

function DocumentTitleEditor({
  docTitulo,
  setDocTitulo,
  docTamanhoTitulo,
  setDocTamanhoTitulo,
  docEstiloTitulo,
  setDocEstiloTitulo,
  docAlinhamentoTitulo,
  setDocAlinhamentoTitulo,
}: {
  docTitulo: string;
  setDocTitulo: (val: string) => void;
  docTamanhoTitulo: "pequeno" | "medio" | "grande";
  setDocTamanhoTitulo: (val: "pequeno" | "medio" | "grande") => void;
  docEstiloTitulo: "negrito" | "normal";
  setDocEstiloTitulo: (val: "negrito" | "normal") => void;
  docAlinhamentoTitulo: "center" | "left" | "right";
  setDocAlinhamentoTitulo: (val: "center" | "left" | "right") => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label className="block font-bold text-sm text-zinc-800">
          Título do Documento:
        </label>

        {/* Barra de Ferramentas do Título */}
        <div className="flex items-center gap-2 flex-wrap bg-zinc-100/90 p-1.5 rounded-xl border border-zinc-200 text-xs">
          {/* Seletor de Tamanho */}
          <span className="text-[10px] font-bold text-zinc-500 uppercase px-1">Tamanho:</span>
          <div className="inline-flex rounded-lg bg-white p-0.5 border border-zinc-200 shadow-2xs">
            {(["pequeno", "medio", "grande"] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setDocTamanhoTitulo(sz)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold capitalize transition-all cursor-pointer ${
                  docTamanhoTitulo === sz
                    ? "bg-[#0b439c] text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                {sz === "medio" ? "Médio" : sz === "pequeno" ? "Pequeno" : "Grande"}
              </button>
            ))}
          </div>

          {/* Alternador Negrito / Letra grossinha */}
          <button
            type="button"
            onClick={() => setDocEstiloTitulo(docEstiloTitulo === "negrito" ? "normal" : "negrito")}
            title="Alternar título em negrito (letra grossinha) ou normal (letra fina)"
            className={`px-2.5 py-1 rounded-lg font-black text-xs flex items-center gap-1 border transition-all cursor-pointer ${
              docEstiloTitulo === "negrito"
                ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <Bold className="w-3.5 h-3.5 stroke-[3]" />
            <span>{docEstiloTitulo === "negrito" ? "Grossinha (Negrito)" : "Fina (Normal)"}</span>
          </button>

          {/* Alinhamento do Título */}
          <span className="text-[10px] font-bold text-zinc-500 uppercase px-1">Alinhar:</span>
          <div className="inline-flex rounded-lg bg-white p-0.5 border border-zinc-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setDocAlinhamentoTitulo("left")}
              title="Alinhar à esquerda"
              className={`p-1 rounded-md transition-all cursor-pointer ${
                docAlinhamentoTitulo === "left" ? "bg-[#0b439c] text-white" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDocAlinhamentoTitulo("center")}
              title="Centralizado no meio"
              className={`p-1 rounded-md transition-all cursor-pointer ${
                docAlinhamentoTitulo === "center" ? "bg-[#0b439c] text-white" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDocAlinhamentoTitulo("right")}
              title="Alinhar à direita"
              className={`p-1 rounded-md transition-all cursor-pointer ${
                docAlinhamentoTitulo === "right" ? "bg-[#0b439c] text-white" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <input
        type="text"
        value={docTitulo}
        onChange={(e) => setDocTitulo(e.target.value)}
        placeholder="Ex: DECLARAÇÃO DE CONCLUSÃO DE CURSO"
        className={`w-full px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-900 focus:outline-none focus:border-[#0b439c] transition-all bg-white ${
          docEstiloTitulo === "negrito" ? "font-black" : "font-normal"
        } ${
          docTamanhoTitulo === "pequeno" ? "text-sm" : docTamanhoTitulo === "grande" ? "text-xl" : "text-base"
        } ${
          docAlinhamentoTitulo === "left" ? "text-left" : docAlinhamentoTitulo === "right" ? "text-right" : "text-center"
        }`}
        required
      />
    </div>
  );
}

function DocumentContentEditor({
  docConteudo,
  setDocConteudo,
  docTamanhoConteudo,
  setDocTamanhoConteudo,
  docAlinhamentoConteudo,
  setDocAlinhamentoConteudo,
  docEstiloConteudo,
  setDocEstiloConteudo,
  docTitulo,
  docTamanhoTitulo,
  docEstiloTitulo,
  docAlinhamentoTitulo,
  textareaRef,
  onToggleBoldSelection,
  onRemoveBoldWord,
  onToggleAllBold,
}: {
  docConteudo: string;
  setDocConteudo: (val: string) => void;
  docTamanhoConteudo: "pequeno" | "medio" | "grande";
  setDocTamanhoConteudo: (val: "pequeno" | "medio" | "grande") => void;
  docAlinhamentoConteudo: "justify" | "left" | "center";
  setDocAlinhamentoConteudo: (val: "justify" | "left" | "center") => void;
  docEstiloConteudo: string;
  setDocEstiloConteudo: (val: string) => void;
  docTitulo: string;
  docTamanhoTitulo: "pequeno" | "medio" | "grande";
  docEstiloTitulo: "negrito" | "normal";
  docAlinhamentoTitulo: "center" | "left" | "right";
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onToggleBoldSelection: () => void;
  onRemoveBoldWord: (word: string) => void;
  onToggleAllBold: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <label className="block font-bold text-sm text-zinc-800">
            Conteúdo do Documento:
          </label>

          {/* Barra de Ferramentas do Conteúdo */}
          <div className="flex items-center gap-2 flex-wrap bg-zinc-100/90 p-1.5 rounded-xl border border-zinc-200 text-xs">
            {/* Botão para aplicar Negrito no texto selecionado */}
            <button
              type="button"
              onClick={onToggleBoldSelection}
              title="Selecione com o mouse qualquer palavra no texto e clique aqui para marcar em negrito"
              className="px-2.5 py-1 rounded-lg bg-white border border-zinc-300 text-zinc-900 font-extrabold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-blue-50 hover:border-blue-300 hover:text-[#0b439c] transition-all cursor-pointer"
            >
              <Bold className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Negrito na Seleção</span>
            </button>

            {/* Botão Todo o texto em negrito */}
            <button
              type="button"
              onClick={onToggleAllBold}
              title="Alternar se o texto inteiro fica em negrito"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                docEstiloConteudo.trim().toLowerCase() === "tudo"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <span>Todo o texto em negrito</span>
            </button>

            {/* Tamanho da Fonte */}
            <span className="text-[10px] font-bold text-zinc-500 uppercase px-1">Tamanho:</span>
            <div className="inline-flex rounded-lg bg-white p-0.5 border border-zinc-200 shadow-2xs">
              {(["pequeno", "medio", "grande"] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setDocTamanhoConteudo(sz)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold capitalize transition-all cursor-pointer ${
                    docTamanhoConteudo === sz
                      ? "bg-[#0b439c] text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                  }`}
                >
                  {sz === "medio" ? "Médio" : sz === "pequeno" ? "Pequeno" : "Grande"}
                </button>
              ))}
            </div>

            {/* Alinhamento */}
            <span className="text-[10px] font-bold text-zinc-500 uppercase px-1">Alinhar:</span>
            <div className="inline-flex rounded-lg bg-white p-0.5 border border-zinc-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setDocAlinhamentoConteudo("justify")}
                title="Justificado (alinhado dos dois lados)"
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  docAlinhamentoConteudo === "justify" ? "bg-[#0b439c] text-white" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDocAlinhamentoConteudo("left")}
                title="Alinhar à esquerda"
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  docAlinhamentoConteudo === "left" ? "bg-[#0b439c] text-white" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDocAlinhamentoConteudo("center")}
                title="Centralizado no meio"
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  docAlinhamentoConteudo === "center" ? "bg-[#0b439c] text-white" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          rows={10}
          value={docConteudo}
          onChange={(e) => setDocConteudo(e.target.value)}
          className={`w-full p-4 rounded-xl border border-zinc-300 text-zinc-900 focus:outline-none focus:border-[#0b439c] font-sans leading-relaxed resize-y ${
            docTamanhoConteudo === "pequeno" ? "text-xs" : docTamanhoConteudo === "grande" ? "text-base" : "text-sm"
          } bg-zinc-50/40 focus:bg-white`}
          placeholder="Digite o texto do documento..."
          required
        />

        {/* Gerenciador de Palavras em Negrito (estilo_conteudo) */}
        <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/90 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
              <Bold className="w-3.5 h-3.5 text-[#0b439c]" />
              <span>Palavras configuradas em Negrito (estilo_conteudo):</span>
            </div>
            <span className="text-[11px] text-zinc-500">
              Selecione o texto e clique no botão acima ou digite separando por vírgula.
            </span>
          </div>

          {docEstiloConteudo.trim().toLowerCase() === "tudo" ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-zinc-900 text-white font-bold text-xs flex items-center gap-2">
                <span>O texto inteiro está configurado em Negrito</span>
                <button
                  type="button"
                  onClick={() => setDocEstiloConteudo("")}
                  className="hover:text-red-400 cursor-pointer"
                  title="Desmarcar negrito total"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          ) : (
            <>
              {/* Chips de palavras marcadas */}
              {docEstiloConteudo
                .split(",")
                .map((w) => w.trim())
                .filter(Boolean).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {docEstiloConteudo
                    .split(",")
                    .map((w) => w.trim())
                    .filter(Boolean)
                    .map((word, wIdx) => (
                      <span
                        key={wIdx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-zinc-300 rounded-lg text-xs font-black text-zinc-900 shadow-2xs"
                      >
                        <span>{word}</span>
                        <button
                          type="button"
                          onClick={() => onRemoveBoldWord(word)}
                          className="text-zinc-400 hover:text-red-600 cursor-pointer p-0.5"
                          title={`Remover negrito de "${word}"`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>
              )}

              <input
                type="text"
                value={docEstiloConteudo}
                onChange={(e) => setDocEstiloConteudo(e.target.value)}
                placeholder="Ex: clima, ensolarado (ou 'tudo' para o texto todo)"
                className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:outline-none focus:border-[#0b439c] text-zinc-900 font-mono shadow-2xs"
              />
            </>
          )}
        </div>

        {/* Pré-visualização Ao Vivo do Documento */}
        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0b439c]" />
              Pré-visualização Ao Vivo do Documento
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">
              Exatamente como aparecerá na impressão e no PDF
            </span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-2xs space-y-4">
            {/* Título com alinhamento, tamanho e estilo */}
            <h3
              className={`tracking-tight uppercase ${
                docEstiloTitulo === "negrito" ? "font-black" : "font-medium"
              } ${
                docTamanhoTitulo === "pequeno" ? "text-sm" : docTamanhoTitulo === "grande" ? "text-xl" : "text-base"
              } ${
                docAlinhamentoTitulo === "left" ? "text-left" : docAlinhamentoTitulo === "right" ? "text-right" : "text-center"
              } text-zinc-900`}
            >
              {docTitulo || "(Título do Documento)"}
            </h3>

            {/* Conteúdo com as palavras em negrito e alinhamento aplicados */}
            <div
              className={`leading-relaxed whitespace-pre-wrap text-zinc-800 ${
                docTamanhoConteudo === "pequeno" ? "text-xs" : docTamanhoConteudo === "grande" ? "text-base" : "text-sm"
              } ${
                docAlinhamentoConteudo === "left" ? "text-left" : docAlinhamentoConteudo === "center" ? "text-center" : "text-justify"
              }`}
            >
              <RenderFormattedContent
                content={docConteudo || "Nenhum conteúdo inserido ainda."}
                estiloConteudo={docEstiloConteudo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STORAGE_KEY_DOCS = "pc_gestao_documentos_v1";
const STORAGE_KEY_FOLDERS = "pc_gestao_doc_folders_v1";

interface DocumentosManagerProps {
  allUsers?: any[];
  currentAdminName?: string;
  currentUserId?: string;
}

export function DocumentosManager({ allUsers = [], currentAdminName = "Administrador", currentUserId }: DocumentosManagerProps) {
  // Pastas e Documentos
  const [folders, setFolders] = useState<DocFolder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FOLDERS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DOCS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Estados de carregamento e sincronização com Supabase
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Função para rolar até o topo da tela
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Carregar dados reais do Supabase (tabelas: pastas e documentos)
  const fetchSupabaseData = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) return;

    try {
      setIsLoading(true);

      // 1. Buscar Pastas da API Central (projeto principal / usuarios)
      const { data: dbFolders, error: foldersErr } = await supabase
        .from("pastas")
        .select("*")
        .order("criado_em", { ascending: false });

      if (foldersErr) {
        console.warn("Aviso ao carregar pastas do Supabase:", foldersErr.message || foldersErr);
      } else if (dbFolders) {
        setFolders(dbFolders);
        try {
          localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(dbFolders));
        } catch {}
      }

      // 2. Buscar Documentos da API Central (projeto principal / usuarios)
      const { data: dbDocs, error: docsErr } = await supabase
        .from("documentos")
        .select("*")
        .order("criado_em", { ascending: false });

      if (docsErr) {
        console.warn("Aviso ao carregar documentos do Supabase:", docsErr.message || docsErr);
      } else if (dbDocs) {
        setDocuments(dbDocs);
        try {
          localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(dbDocs));
        } catch {}
      }
    } catch (err) {
      console.warn("Exceção ao buscar documentos no Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Executar busca ao montar o componente
  useEffect(() => {
    fetchSupabaseData();
  }, [fetchSupabaseData]);

  // Modo de exibição: "list" | "create_doc" | "create_folder" | "view_doc"
  const [viewMode, setViewMode] = useState<"list" | "create_doc" | "create_folder" | "view_doc">("list");
  
  // Pasta em que o usuário está navegando (null = fora das pastas / visão principal)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Formulário: Novo / Editar Documento
  const [docTitulo, setDocTitulo] = useState("");
  const [docTamanhoTitulo, setDocTamanhoTitulo] = useState<"pequeno" | "medio" | "grande">("medio");
  const [docEstiloTitulo, setDocEstiloTitulo] = useState<"negrito" | "normal">("negrito");
  const [docAlinhamentoTitulo, setDocAlinhamentoTitulo] = useState<"center" | "left" | "right">("center");

  const [docPastaId, setDocPastaId] = useState<string | null>(null);
  const [folderInputText, setFolderInputText] = useState("");
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);

  const [docConteudo, setDocConteudo] = useState("");
  const [docTamanhoConteudo, setDocTamanhoConteudo] = useState<"pequeno" | "medio" | "grande">("medio");
  const [docAlinhamentoConteudo, setDocAlinhamentoConteudo] = useState<"justify" | "left" | "center">("justify");
  const [docEstiloConteudo, setDocEstiloConteudo] = useState<string>("");

  const textareaCreateRef = useRef<HTMLTextAreaElement>(null);
  const textareaViewRef = useRef<HTMLTextAreaElement>(null);

  // Manipulação de palavras em negrito no conteúdo
  const handleToggleBoldSelection = (ref: React.RefObject<HTMLTextAreaElement | null>) => {
    if (!ref.current) return;
    const start = ref.current.selectionStart;
    const end = ref.current.selectionEnd;
    const selectedText = ref.current.value.substring(start, end).trim();

    if (!selectedText) {
      setSyncFeedback("Selecione primeiro uma palavra ou frase com o cursor para aplicar o negrito.");
      setTimeout(() => setSyncFeedback(null), 3500);
      return;
    }

    if (docEstiloConteudo.trim().toLowerCase() === "tudo") {
      setDocEstiloConteudo(selectedText);
      return;
    }

    const currentWords = docEstiloConteudo
      ? docEstiloConteudo.split(",").map((w) => w.trim()).filter(Boolean)
      : [];

    const existingIndex = currentWords.findIndex((w) => w.toLowerCase() === selectedText.toLowerCase());
    let nextWords: string[];
    if (existingIndex >= 0) {
      nextWords = currentWords.filter((_, idx) => idx !== existingIndex);
    } else {
      nextWords = [...currentWords, selectedText];
    }
    setDocEstiloConteudo(nextWords.join(", "));
  };

  const handleRemoveBoldWord = (wordToRemove: string) => {
    const currentWords = docEstiloConteudo
      ? docEstiloConteudo.split(",").map((w) => w.trim()).filter(Boolean)
      : [];
    const updated = currentWords.filter((w) => w.toLowerCase() !== wordToRemove.toLowerCase());
    setDocEstiloConteudo(updated.join(", "));
  };

  const handleToggleAllBold = () => {
    if (docEstiloConteudo.trim().toLowerCase() === "tudo") {
      setDocEstiloConteudo("");
    } else {
      setDocEstiloConteudo("tudo");
    }
  };

  const [incluirAssinaturaProgramaCerto, setIncluirAssinaturaProgramaCerto] = useState(true);
  const [incluirAssinaturaCordenacao, setIncluirAssinaturaCordenacao] = useState(true);
  const [incluirCampoAssinaturaAluno, setIncluirCampoAssinaturaAluno] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  // Formulário: Nova Pasta
  const [newFolderName, setNewFolderName] = useState("");

  // Seleções de checkbox
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Modais de ação rápida sobre os selecionados
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetMoveFolder, setTargetMoveFolder] = useState<string | null>(null);

  // Modal de confirmação de exclusão
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: "document" | "multiple" | "folder";
    targetId?: string;
    title?: string;
  }>({ isOpen: false, type: "document" });

  // Pasta selecionada atualmente
  const currentFolder = useMemo(() => {
    return folders.find((f) => f.id === currentFolderId) || null;
  }, [folders, currentFolderId]);

  // Documentos a exibir:
  // Se está dentro de uma pasta (currentFolderId !== null): mostra apenas os documentos daquela pasta
  // Se está fora de pasta (currentFolderId === null): mostra SOMENTE os documentos que estão FORA de pasta (pasta_id === null)
  const displayedDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (currentFolderId === null) {
        if (doc.pasta_id !== null && doc.pasta_id !== "") return false;
      } else {
        if (doc.pasta_id !== currentFolderId) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (doc.titulo || "").toLowerCase().includes(q);
        const matchContent = (doc.conteudo || "").toLowerCase().includes(q);
        if (!matchTitle && !matchContent) return false;
      }
      return true;
    });
  }, [documents, currentFolderId, searchQuery]);

  // Pastas filtradas pela busca geral
  const filteredFolders = useMemo(() => {
    if (currentFolderId !== null) return [];
    if (!searchQuery.trim()) return folders;
    const q = searchQuery.toLowerCase().trim();
    return folders.filter((f) => (f.nome || "").toLowerCase().includes(q));
  }, [folders, currentFolderId, searchQuery]);

  // Pastas sugeridas no input de pasta digitável
  const matchedFoldersForInput = useMemo(() => {
    const q = folderInputText.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter((f) => f.nome.toLowerCase().includes(q));
  }, [folders, folderInputText]);

  // Verifica se o texto digitado coincide exatamente com alguma pasta existente
  const hasExactFolderMatch = useMemo(() => {
    const q = folderInputText.trim().toLowerCase();
    if (!q) return false;
    return folders.some((f) => f.nome.toLowerCase() === q);
  }, [folders, folderInputText]);

  const getFolderCount = (fId: string) => {
    return documents.filter((d) => d.pasta_id === fId).length;
  };

  // Abrir tela de criação de documento
  const handleOpenCreateDoc = () => {
    setEditingDocId(null);
    setDocTitulo("");
    setDocPastaId(currentFolderId);

    const initialFolder = folders.find((f) => f.id === currentFolderId);
    setFolderInputText(initialFolder ? initialFolder.nome : "");
    setIsFolderDropdownOpen(false);

    setDocConteudo("Declaramos para os devidos fins que o(a) estudante encontra-se regularmente matriculado(a) e ativo(a) na instituição Programa Certo.\n\nPor ser expressão da verdade, firmamos o presente documento.");
    setDocTamanhoTitulo("medio");
    setDocEstiloTitulo("negrito");
    setDocAlinhamentoTitulo("center");
    setDocTamanhoConteudo("medio");
    setDocAlinhamentoConteudo("justify");
    setDocEstiloConteudo("");
    setIncluirAssinaturaProgramaCerto(true);
    setIncluirAssinaturaCordenacao(true);
    setIncluirCampoAssinaturaAluno(false);
    setViewMode("create_doc");
    scrollToTop();
  };

  // Abrir tela de criação de pasta
  const handleOpenCreateFolder = () => {
    setNewFolderName("");
    setViewMode("create_folder");
    scrollToTop();
  };

  // Criar pasta direto a partir do texto digitado no campo de pasta
  const handleCreateFolderFromInput = async () => {
    const nomeLimpo = folderInputText.trim();
    if (!nomeLimpo) return;

    setIsSaving(true);
    const now = new Date().toISOString();
    let newFolderId = `f_${Date.now()}`;

    try {
      if (supabase && isSupabaseConfigured) {
        // Tenta primeiro inserir com id_usuario (se autenticado no auth do supabase)
        let insertErr: any = null;
        let inserted: any = null;

        if (currentUserId) {
          const res = await supabase
            .from("pastas")
            .insert({ nome: nomeLimpo, id_usuario: currentUserId })
            .select()
            .single();
          insertErr = res.error;
          inserted = res.data;
        }

        // Se falhou (por exemplo violação de FK auth.users ou sem sessão de auth), insere sem id_usuario
        if (!inserted || insertErr) {
          const resFallback = await supabase
            .from("pastas")
            .insert({ nome: nomeLimpo })
            .select()
            .single();
          if (!resFallback.error && resFallback.data) {
            inserted = resFallback.data;
            insertErr = null;
          }
        }

        if (inserted?.id) {
          newFolderId = inserted.id;
        }
      }

      const newFolder: DocFolder = {
        id: newFolderId,
        id_usuario: currentUserId,
        nome: nomeLimpo,
        criado_em: now,
      };

      const updated = [newFolder, ...folders];
      setFolders(updated);
      try {
        localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(updated));
      } catch {}

      setDocPastaId(newFolderId);
      setFolderInputText(nomeLimpo);
      setIsFolderDropdownOpen(false);
      setSyncFeedback(`Pasta "${nomeLimpo}" criada com sucesso!`);
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err) {
      console.error("Erro ao criar pasta rápida:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Documento no Supabase + Local
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitulo.trim()) return;

    setIsSaving(true);
    const now = new Date().toISOString();

    try {
      if (editingDocId) {
        // Atualizar no Supabase
        if (supabase && isSupabaseConfigured) {
          const { error: updateErr } = await supabase
            .from("documentos")
            .update({
              titulo: docTitulo.trim(),
              tamanho_titulo: docTamanhoTitulo,
              estilo_titulo: docEstiloTitulo,
              alinhamento_titulo: docAlinhamentoTitulo,
              pasta_id: docPastaId || null,
              conteudo: docConteudo.trim(),
              tamanho_conteudo: docTamanhoConteudo,
              alinhamento_conteudo: docAlinhamentoConteudo,
              estilo_conteudo: docEstiloConteudo.trim(),
              incluir_assinatura_programa_certo: incluirAssinaturaProgramaCerto,
              incluir_assinatura_cordenacao: incluirAssinaturaCordenacao,
              incluir_campo_assinatura_aluno: incluirCampoAssinaturaAluno,
              atualizado_em: now,
            })
            .eq("id", editingDocId);

          if (updateErr) {
            console.error("Erro ao atualizar documento no Supabase:", updateErr);
          }
        }

        const updated = documents.map((d) =>
          d.id === editingDocId
            ? {
                ...d,
                titulo: docTitulo.trim(),
                tamanho_titulo: docTamanhoTitulo,
                estilo_titulo: docEstiloTitulo,
                alinhamento_titulo: docAlinhamentoTitulo,
                pasta_id: docPastaId,
                conteudo: docConteudo.trim(),
                tamanho_conteudo: docTamanhoConteudo,
                alinhamento_conteudo: docAlinhamentoConteudo,
                estilo_conteudo: docEstiloConteudo.trim(),
                incluir_assinatura_programa_certo: incluirAssinaturaProgramaCerto,
                incluir_assinatura_cordenacao: incluirAssinaturaCordenacao,
                incluir_campo_assinatura_aluno: incluirCampoAssinaturaAluno,
                atualizado_em: now,
              }
            : d
        );
        setDocuments(updated);
        try {
          localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updated));
        } catch {}
      } else {
        // Inserir no Supabase
        let newDocId = `doc_${Date.now()}`;
        
        if (supabase && isSupabaseConfigured) {
          const payloadWithUser: any = {
            titulo: docTitulo.trim(),
            tamanho_titulo: docTamanhoTitulo,
            estilo_titulo: docEstiloTitulo,
            alinhamento_titulo: docAlinhamentoTitulo,
            pasta_id: docPastaId || null,
            conteudo: docConteudo.trim(),
            tamanho_conteudo: docTamanhoConteudo,
            alinhamento_conteudo: docAlinhamentoConteudo,
            estilo_conteudo: docEstiloConteudo.trim(),
            incluir_assinatura_programa_certo: incluirAssinaturaProgramaCerto,
            incluir_assinatura_cordenacao: incluirAssinaturaCordenacao,
            incluir_campo_assinatura_aluno: incluirCampoAssinaturaAluno,
            status: "emitido",
          };
          if (currentUserId) {
            payloadWithUser.id_usuario = currentUserId;
          }

          let inserted: any = null;
          let insertErr: any = null;

          if (currentUserId) {
            const res = await supabase
              .from("documentos")
              .insert(payloadWithUser)
              .select()
              .single();
            insertErr = res.error;
            inserted = res.data;
          }

          // Se der erro (ex: FK com auth.users), tenta inserir sem id_usuario
          if (!inserted || insertErr) {
            const payloadNoUser = {
              titulo: docTitulo.trim(),
              tamanho_titulo: docTamanhoTitulo,
              estilo_titulo: docEstiloTitulo,
              alinhamento_titulo: docAlinhamentoTitulo,
              pasta_id: docPastaId || null,
              conteudo: docConteudo.trim(),
              tamanho_conteudo: docTamanhoConteudo,
              alinhamento_conteudo: docAlinhamentoConteudo,
              estilo_conteudo: docEstiloConteudo.trim(),
              incluir_assinatura_programa_certo: incluirAssinaturaProgramaCerto,
              incluir_assinatura_cordenacao: incluirAssinaturaCordenacao,
              incluir_campo_assinatura_aluno: incluirCampoAssinaturaAluno,
              status: "emitido",
            };
            const resFallback = await supabase
              .from("documentos")
              .insert(payloadNoUser)
              .select()
              .single();
            if (!resFallback.error && resFallback.data) {
              inserted = resFallback.data;
              insertErr = null;
            } else if (resFallback.error) {
              console.error("Erro fatal ao inserir documento no Supabase:", resFallback.error);
            }
          }

          if (inserted?.id) {
            newDocId = inserted.id;
          }
        }

        const newDoc: DocumentItem = {
          id: newDocId,
          id_usuario: currentUserId,
          titulo: docTitulo.trim(),
          tamanho_titulo: docTamanhoTitulo,
          estilo_titulo: docEstiloTitulo,
          alinhamento_titulo: docAlinhamentoTitulo,
          pasta_id: docPastaId,
          conteudo: docConteudo.trim(),
          tamanho_conteudo: docTamanhoConteudo,
          alinhamento_conteudo: docAlinhamentoConteudo,
          estilo_conteudo: docEstiloConteudo.trim(),
          incluir_assinatura_programa_certo: incluirAssinaturaProgramaCerto,
          incluir_assinatura_cordenacao: incluirAssinaturaCordenacao,
          incluir_campo_assinatura_aluno: incluirCampoAssinaturaAluno,
          status: "emitido",
          criado_em: now,
          atualizado_em: now,
        };

        const updated = [newDoc, ...documents];
        setDocuments(updated);
        try {
          localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updated));
        } catch {}
      }

      setViewMode("list");
      scrollToTop();
      setSyncFeedback("Documento salvo e armazenado no Supabase!");
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err) {
      console.error("Erro ao salvar documento:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Pasta no Supabase + Local
  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsSaving(true);
    const now = new Date().toISOString();
    let newFolderId = `f_${Date.now()}`;

    try {
      if (supabase && isSupabaseConfigured) {
        let inserted: any = null;
        let insertErr: any = null;

        if (currentUserId) {
          const res = await supabase
            .from("pastas")
            .insert({ nome: newFolderName.trim(), id_usuario: currentUserId })
            .select()
            .single();
          insertErr = res.error;
          inserted = res.data;
        }

        if (!inserted || insertErr) {
          const resFallback = await supabase
            .from("pastas")
            .insert({ nome: newFolderName.trim() })
            .select()
            .single();
          if (!resFallback.error && resFallback.data) {
            inserted = resFallback.data;
          }
        }

        if (inserted?.id) {
          newFolderId = inserted.id;
        }
      }

      const newFolder: DocFolder = {
        id: newFolderId,
        id_usuario: currentUserId,
        nome: newFolderName.trim(),
        criado_em: now,
      };

      const updated = [newFolder, ...folders];
      setFolders(updated);
      try {
        localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(updated));
      } catch {}

      setNewFolderName("");
      setViewMode("list");
      scrollToTop();
      setSyncFeedback("Pasta criada no Supabase!");
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err) {
      console.error("Erro ao salvar pasta:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Abrir documento para visualizar/editar na tela
  const handleOpenDocView = (doc: DocumentItem) => {
    setEditingDocId(doc.id);
    setDocTitulo(doc.titulo);
    setDocPastaId(doc.pasta_id);

    const docFolder = folders.find((f) => f.id === doc.pasta_id);
    setFolderInputText(docFolder ? docFolder.nome : "");
    setIsFolderDropdownOpen(false);

    setDocConteudo(doc.conteudo);
    setDocTamanhoTitulo(doc.tamanho_titulo || "medio");
    setDocEstiloTitulo(doc.estilo_titulo || "negrito");
    setDocAlinhamentoTitulo(doc.alinhamento_titulo || "center");
    setDocTamanhoConteudo(doc.tamanho_conteudo || "medio");
    setDocAlinhamentoConteudo(doc.alinhamento_conteudo || "justify");
    setDocEstiloConteudo(doc.estilo_conteudo || "");
    setIncluirAssinaturaProgramaCerto(!!doc.incluir_assinatura_programa_certo);
    setIncluirAssinaturaCordenacao(!!doc.incluir_assinatura_cordenacao);
    setIncluirCampoAssinaturaAluno(!!doc.incluir_campo_assinatura_aluno);
    setViewMode("view_doc");
    scrollToTop();
  };

  // Duplicar documento selecionado
  const handleDuplicateSelected = async () => {
    if (selectedDocIds.length === 0) return;
    const toDuplicate = documents.filter((d) => selectedDocIds.includes(d.id));
    const now = new Date().toISOString();

    for (const d of toDuplicate) {
      let duplicateId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      if (supabase && isSupabaseConfigured) {
        const payload: any = {
          titulo: `${d.titulo} (Cópia)`,
          tamanho_titulo: d.tamanho_titulo || "medio",
          estilo_titulo: d.estilo_titulo || "negrito",
          alinhamento_titulo: d.alinhamento_titulo || "center",
          pasta_id: d.pasta_id || null,
          conteudo: d.conteudo,
          tamanho_conteudo: d.tamanho_conteudo || "medio",
          alinhamento_conteudo: d.alinhamento_conteudo || "justify",
          estilo_conteudo: d.estilo_conteudo || "",
          incluir_assinatura_programa_certo: d.incluir_assinatura_programa_certo,
          incluir_assinatura_cordenacao: d.incluir_assinatura_cordenacao,
          incluir_campo_assinatura_aluno: d.incluir_campo_assinatura_aluno,
          status: d.status,
        };

        const { data: inserted } = await supabase
          .from("documentos")
          .insert(payload)
          .select()
          .single();

        if (inserted?.id) duplicateId = inserted.id;
      }

      const copyDoc: DocumentItem = {
        ...d,
        id: duplicateId,
        titulo: `${d.titulo} (Cópia)`,
        criado_em: now,
        atualizado_em: now,
      };

      setDocuments((prev) => {
        const next = [copyDoc, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    setSelectedDocIds([]);
    setSyncFeedback("Documento(s) duplicado(s) com sucesso!");
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  // Mover documentos selecionados
  const handleMoveSelected = async () => {
    if (selectedDocIds.length === 0) return;
    const now = new Date().toISOString();

    if (supabase && isSupabaseConfigured) {
      await supabase
        .from("documentos")
        .update({ pasta_id: targetMoveFolder || null, atualizado_em: now })
        .in("id", selectedDocIds);
    }

    const updated = documents.map((d) => {
      if (selectedDocIds.includes(d.id)) {
        return { ...d, pasta_id: targetMoveFolder, atualizado_em: now };
      }
      return d;
    });

    setDocuments(updated);
    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updated));
    } catch {}

    setSelectedDocIds([]);
    setShowMoveModal(false);
    setSyncFeedback("Documentos movidos com sucesso!");
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  // Confirmar exclusão
  const confirmDelete = async () => {
    if (deleteConfirmation.type === "document" && deleteConfirmation.targetId) {
      const docId = deleteConfirmation.targetId;

      if (supabase && isSupabaseConfigured) {
        await supabase.from("documentos").delete().eq("id", docId);
      }

      const updated = documents.filter((d) => d.id !== docId);
      setDocuments(updated);
      try {
        localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updated));
      } catch {}

      setSelectedDocIds(selectedDocIds.filter((id) => id !== docId));
      if (editingDocId === docId) {
        setViewMode("list");
        scrollToTop();
      }
    } else if (deleteConfirmation.type === "multiple") {
      if (supabase && isSupabaseConfigured) {
        await supabase.from("documentos").delete().in("id", selectedDocIds);
      }

      const updated = documents.filter((d) => !selectedDocIds.includes(d.id));
      setDocuments(updated);
      try {
        localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updated));
      } catch {}

      setSelectedDocIds([]);
    } else if (deleteConfirmation.type === "folder" && deleteConfirmation.targetId) {
      const fId = deleteConfirmation.targetId;

      if (supabase && isSupabaseConfigured) {
        // Ao excluir pasta, documentos com essa pasta_id ficam pasta_id: null
        await supabase.from("documentos").update({ pasta_id: null }).eq("pasta_id", fId);
        await supabase.from("pastas").delete().eq("id", fId);
      }

      const updatedFolders = folders.filter((f) => f.id !== fId);
      const updatedDocs = documents.map((d) => (d.pasta_id === fId ? { ...d, pasta_id: null } : d));

      setFolders(updatedFolders);
      setDocuments(updatedDocs);
      try {
        localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(updatedFolders));
        localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updatedDocs));
      } catch {}

      if (currentFolderId === fId) setCurrentFolderId(null);
    }

    setDeleteConfirmation({ isOpen: false, type: "document" });
    setSyncFeedback("Exclusão realizada com sucesso.");
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  // Seleção de itens
  const toggleSelectAll = () => {
    if (selectedDocIds.length === displayedDocs.length && displayedDocs.length > 0) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(displayedDocs.map((d) => d.id));
    }
  };

  const toggleSelectDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter((dId) => dId !== id));
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  // Impressão oficial do documento - NO MESMO ESQUEMA DO ATENDIMENTO
  const handlePrintDoc = (doc: DocumentItem) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, permita popups para imprimir o documento.");
      return;
    }

    const dataAtual = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>${doc.titulo} - Programa Certo</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 18mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #18181b;
            line-height: 1.6;
            margin: 0;
            padding: 16px;
            background: #ffffff;
          }
          /* CABEÇALHO IDÊNTICO AO DO ATENDIMENTO */
          .header {
            display: flex;
            align-items: center;
            gap: 14px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 14px;
            margin-bottom: 24px;
          }
          .logo-img {
            width: 52px;
            height: 52px;
            border-radius: 12px;
            object-fit: cover;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }
          .brand-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 800;
            margin: 0;
            line-height: 1.1;
            color: #18181b;
          }
          .brand-title span {
            color: #0b439c;
          }
          .brand-subtitle {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
          }
          /* TÍTULO DO DOCUMENTO */
          .doc-title {
            font-size: ${doc.tamanho_titulo === "pequeno" ? "14px" : doc.tamanho_titulo === "grande" ? "22px" : "17px"};
            font-weight: ${doc.estilo_titulo === "normal" ? "500" : "900"};
            text-align: ${doc.alinhamento_titulo === "left" ? "left" : doc.alinhamento_titulo === "right" ? "right" : "center"};
            margin: 24px 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #18181b;
          }
          /* CORPO DO DOCUMENTO (Continua em novas páginas se for grande) */
          .content-box {
            font-size: ${doc.tamanho_conteudo === "pequeno" ? "11.5px" : doc.tamanho_conteudo === "grande" ? "16px" : "13.5px"};
            white-space: pre-wrap;
            text-align: ${doc.alinhamento_conteudo === "left" ? "left" : doc.alinhamento_conteudo === "center" ? "center" : "justify"};
            min-height: 300px;
            line-height: 1.8;
            color: #27272a;
            margin-bottom: 25px;
            page-break-inside: auto;
          }
          .content-box strong {
            font-weight: 900;
            color: #09090b;
          }
          /* CAIXA DE HOMOLOGAÇÃO E ASSINATURAS IDÊNTICA À CENTRAL DE ATENDIMENTO */
          .sign-box-container {
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 16px 20px;
            background: #ffffff;
            margin-top: 25px;
            page-break-inside: avoid;
          }
          .sign-box-title {
            font-size: 9px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 18px;
          }
          .signatures-grid {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 20px;
            flex-wrap: wrap;
          }
          .signature-col {
            flex: 1;
            min-width: 170px;
            text-align: center;
          }
          .sign-chancela {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-bottom: 8px;
          }
          .sign-chancela img {
            width: 22px;
            height: 22px;
            border-radius: 4px;
          }
          .sign-chancela-text {
            font-size: 11px;
            font-weight: 800;
            color: #000000;
          }
          .sign-chancela-text span {
            color: #82B7FF;
          }
          .sign-line {
            border-top: 1.2px solid #18181b;
            margin-bottom: 5px;
          }
          .sign-role {
            font-size: 11px;
            font-weight: 800;
            color: #18181b;
            margin: 0;
          }
          .sign-subrole {
            font-size: 9.5px;
            color: #64748b;
            margin-top: 2px;
          }
          /* RODAPÉ NO FINAL DA PÁGINA (Com emitido em e as) */
          .footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            margin-top: 35px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #94a3b8;
            page-break-inside: avoid;
          }
          .footer strong {
            color: #475569;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <!-- 1. CABEÇALHO IDÊNTICO AO ATENDIMENTO -->
        <div class="header">
          <img src="${LOGO_PROGRAMA_CERTO_BASE64}" alt="Logo Programa Certo" class="logo-img" />
          <div class="brand-info">
            <h1 class="brand-title">Programa <span>Certo</span></h1>
            <div class="brand-subtitle">Plataforma Educacional</div>
          </div>
        </div>

        <!-- 2. TÍTULO DO DOCUMENTO -->
        <h2 class="doc-title">${doc.titulo}</h2>

        <!-- 3. CONTEÚDO DO DOCUMENTO (Permite fluxo para várias páginas se grande) -->
        <div class="content-box">${formatContentWithBoldHtml(doc.conteudo, doc.estilo_conteudo)}</div>

        <!-- 4. CAIXA DE ASSINATURA E HOMOLOGAÇÃO (Logo acima da linha de assinatura) -->
        <div class="sign-box-container">
          <div class="sign-box-title">HOMOLOGAÇÃO E ASSINATURAS INSTITUCIONAIS</div>

          <div class="signatures-grid">
            <!-- Assinatura 1: Programa Certo (Logo ACIMA da linha com o nome) -->
            ${
              doc.incluir_assinatura_programa_certo
                ? `
              <div class="signature-col">
                <div class="sign-chancela">
                  <img src="${LOGO_PROGRAMA_CERTO_BASE64}" alt="Logo" />
                  <span class="sign-chancela-text">Programa <span>Certo</span></span>
                </div>
                <div class="sign-line"></div>
                <div class="sign-role">Gestor Responsável</div>
                <div class="sign-subrole">Administração Programa Certo</div>
              </div>
              `
                : ""
            }

            <!-- Assinatura 2: Coordenação (com campo Data: __ / __ / ____) -->
            ${
              doc.incluir_assinatura_cordenacao
                ? `
              <div class="signature-col">
                <div style="height: 30px;"></div>
                <div class="sign-line"></div>
                <div class="sign-role">Data: ____ / ____ / ________</div>
                <div class="sign-subrole">Visto da Coordenação</div>
              </div>
              `
                : ""
            }

            <!-- Assinatura 3: Aluno (se ativado) -->
            ${
              doc.incluir_campo_assinatura_aluno
                ? `
              <div class="signature-col">
                <div style="height: 30px;"></div>
                <div class="sign-line"></div>
                <div class="sign-role">Assinatura do Aluno</div>
                <div class="sign-subrole">Estudante / Responsável Legal</div>
              </div>
              `
                : ""
            }
          </div>
        </div>

        <!-- 5. RODAPÉ OFICIAL NO FINAL: Emitido em DD/MM/AAAA às HH:MM -->
        <div class="footer">
          <div><strong>Programa Certo</strong> — Plataforma Educacional</div>
          <div>Emitido em: ${dataAtual} às ${horaAtual}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      {/* Toast Feedback de Sincronização */}
      <AnimatePresence>
        {syncFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 right-6 z-50 bg-[#0b439c] text-white px-4 py-2.5 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{syncFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* TELA A: FORMULÁRIO DE CRIAÇÃO / EDIÇÃO DE DOCUMENTO                       */}
      {/* ========================================================================= */}
      {viewMode === "create_doc" && (
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setViewMode("list");
                  scrollToTop();
                }}
                className="p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Documentos</span>
              </button>
              <h2 className="text-xl font-black text-zinc-900">
                Criar Documento
              </h2>
            </div>
          </div>

          <form onSubmit={handleSaveDocument} className="p-6 sm:p-8 space-y-6">
            {/* Título com Ferramentas de Tamanho, Negrito e Alinhamento */}
            <DocumentTitleEditor
              docTitulo={docTitulo}
              setDocTitulo={setDocTitulo}
              docTamanhoTitulo={docTamanhoTitulo}
              setDocTamanhoTitulo={setDocTamanhoTitulo}
              docEstiloTitulo={docEstiloTitulo}
              setDocEstiloTitulo={setDocEstiloTitulo}
              docAlinhamentoTitulo={docAlinhamentoTitulo}
              setDocAlinhamentoTitulo={setDocAlinhamentoTitulo}
            />

            {/* Pasta de Destino com Busca Digitável e Botão Criar Pasta */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2.5 relative">
              <label className="font-bold text-sm text-zinc-800 flex items-center gap-2">
                <Folder className="w-4 h-4 text-blue-600" />
                <span>Pasta de Destino:</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={folderInputText}
                  onChange={(e) => {
                    setFolderInputText(e.target.value);
                    setIsFolderDropdownOpen(true);
                    const exact = folders.find((f) => f.nome.toLowerCase() === e.target.value.trim().toLowerCase());
                    setDocPastaId(exact ? exact.id : null);
                  }}
                  onFocus={() => setIsFolderDropdownOpen(true)}
                  placeholder="Digite o nome da pasta para buscar ou criar..."
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-900 font-medium text-sm focus:outline-none focus:border-[#0b439c] bg-white"
                />

                {docPastaId && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    Pasta Selecionada
                  </span>
                )}
              </div>

              {/* Dropdown de sugestões e criação de pasta */}
              {isFolderDropdownOpen && (
                <div className="bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto divide-y divide-zinc-100 z-20">
                  {/* Opção: Fora de Pasta */}
                  <div
                    onClick={() => {
                      setDocPastaId(null);
                      setFolderInputText("");
                      setIsFolderDropdownOpen(false);
                    }}
                    className="p-3 text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer flex items-center justify-between"
                  >
                    <span>(Sem pasta - Deixar fora de pasta)</span>
                    {docPastaId === null && <Check className="w-4 h-4 text-[#0b439c]" />}
                  </div>

                  {/* Pastas Encontradas */}
                  {matchedFoldersForInput.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        setDocPastaId(f.id);
                        setFolderInputText(f.nome);
                        setIsFolderDropdownOpen(false);
                      }}
                      className="p-3 text-xs font-bold text-zinc-800 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5 text-blue-600" />
                        <span>{f.nome}</span>
                      </div>
                      {docPastaId === f.id && <Check className="w-4 h-4 text-[#0b439c]" />}
                    </div>
                  ))}

                  {/* Se digitou algo e não existe pasta com esse nome exato: Botão Criar Pasta */}
                  {folderInputText.trim() && !hasExactFolderMatch && (
                    <div className="p-2.5 bg-blue-50/70 border-t border-blue-100">
                      <button
                        type="button"
                        onClick={handleCreateFolderFromInput}
                        className="w-full px-3.5 py-2 bg-[#0b439c] hover:bg-blue-800 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Criar pasta: "{folderInputText.trim()}"</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Configuração de Assinaturas */}
            <div className="p-5 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-4">
              <span className="font-extrabold text-[#0b439c] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Configuração de Assinaturas
              </span>

              {/* 1. incluir_assinatura_programa_certo */}
              <div className="bg-white p-3.5 rounded-xl border border-blue-100">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    checked={incluirAssinaturaProgramaCerto}
                    onChange={(e) => setIncluirAssinaturaProgramaCerto(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0b439c] focus:ring-[#0b439c] cursor-pointer"
                  />
                  <span>Inserir assinatura do Programa Certo</span>
                </label>
              </div>

              {/* 2. incluir_assinatura_cordenacao */}
              <div className="bg-white p-3.5 rounded-xl border border-blue-100">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    checked={incluirAssinaturaCordenacao}
                    onChange={(e) => setIncluirAssinaturaCordenacao(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0b439c] focus:ring-[#0b439c] cursor-pointer"
                  />
                  <span>Inserir assinatura da Coordenação</span>
                </label>
              </div>

              {/* 3. incluir_campo_assinatura_aluno */}
              <div className="bg-white p-3.5 rounded-xl border border-blue-100">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    checked={incluirCampoAssinaturaAluno}
                    onChange={(e) => setIncluirCampoAssinaturaAluno(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0b439c] focus:ring-[#0b439c] cursor-pointer"
                  />
                  <span>Adicionar campo para assinatura do aluno</span>
                </label>
              </div>
            </div>

            {/* Conteúdo com Ferramentas, Negrito, Chips e Pré-visualização Ao Vivo */}
            <DocumentContentEditor
              docConteudo={docConteudo}
              setDocConteudo={setDocConteudo}
              docTamanhoConteudo={docTamanhoConteudo}
              setDocTamanhoConteudo={setDocTamanhoConteudo}
              docAlinhamentoConteudo={docAlinhamentoConteudo}
              setDocAlinhamentoConteudo={setDocAlinhamentoConteudo}
              docEstiloConteudo={docEstiloConteudo}
              setDocEstiloConteudo={setDocEstiloConteudo}
              docTitulo={docTitulo}
              docTamanhoTitulo={docTamanhoTitulo}
              docEstiloTitulo={docEstiloTitulo}
              docAlinhamentoTitulo={docAlinhamentoTitulo}
              textareaRef={textareaCreateRef}
              onToggleBoldSelection={() => handleToggleBoldSelection(textareaCreateRef)}
              onRemoveBoldWord={handleRemoveBoldWord}
              onToggleAllBold={handleToggleAllBold}
            />

            {/* Botões do Rodapé */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => {
                  setViewMode("list");
                  scrollToTop();
                }}
                className="px-5 py-2.5 rounded-xl text-zinc-600 font-bold hover:bg-zinc-100 transition-colors text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-sm transition-colors shadow-md shadow-blue-900/15 cursor-pointer flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Salvar Documento</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TELA B: FORMULÁRIO DE CRIAÇÃO DE PASTA                                    */}
      {/* ========================================================================= */}
      {viewMode === "create_folder" && (
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setViewMode("list");
                  scrollToTop();
                }}
                className="p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Documentos</span>
              </button>
              <h2 className="text-xl font-black text-zinc-900">
                Criar Pasta
              </h2>
            </div>
          </div>

          <form onSubmit={handleSaveFolder} className="p-6 sm:p-8 space-y-6 max-w-xl">
            <div>
              <label className="block font-bold text-sm text-zinc-800 mb-1.5">
                Nome da Pasta:
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ex: Declarações 2026, Estágios, Ouvidoria..."
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-zinc-900 focus:outline-none focus:border-[#0b439c] font-medium text-sm"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => {
                  setViewMode("list");
                  scrollToTop();
                }}
                className="px-5 py-2.5 rounded-xl text-zinc-600 font-bold hover:bg-zinc-100 transition-colors text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-sm transition-colors shadow-md shadow-blue-900/15 cursor-pointer flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Criar Pasta</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TELA C: VISUALIZAÇÃO E EDIÇÃO DO DOCUMENTO                                */}
      {/* ========================================================================= */}
      {viewMode === "view_doc" && (
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="p-6 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setViewMode("list");
                  scrollToTop();
                }}
                className="p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Documentos</span>
              </button>
              <h2 className="text-xl font-black text-zinc-900 truncate max-w-md">
                {docTitulo || "Visualizar Documento"}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const docObj = documents.find((d) => d.id === editingDocId);
                  if (docObj) openDocumentPdfInBrowser(docObj);
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer border border-zinc-700"
                title="Abrir PDF na Web para qualquer pessoa"
              >
                <ExternalLink className="w-4 h-4 text-blue-400" />
                <span>Abrir na Web</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const docObj = documents.find((d) => d.id === editingDocId);
                  if (docObj) handlePrintDoc(docObj);
                }}
                className="px-4 py-2 bg-[#0b439c] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>

              <button
                onClick={() => {
                  if (editingDocId) {
                    setDeleteConfirmation({
                      isOpen: true,
                      type: "document",
                      targetId: editingDocId,
                      title: docTitulo,
                    });
                  }
                }}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-rose-200"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveDocument} className="p-6 sm:p-8 space-y-6">
            {/* Título com Ferramentas de Tamanho, Negrito e Alinhamento */}
            <DocumentTitleEditor
              docTitulo={docTitulo}
              setDocTitulo={setDocTitulo}
              docTamanhoTitulo={docTamanhoTitulo}
              setDocTamanhoTitulo={setDocTamanhoTitulo}
              docEstiloTitulo={docEstiloTitulo}
              setDocEstiloTitulo={setDocEstiloTitulo}
              docAlinhamentoTitulo={docAlinhamentoTitulo}
              setDocAlinhamentoTitulo={setDocAlinhamentoTitulo}
            />

            {/* Pasta de Destino com Busca Digitável */}
            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2 relative">
              <span className="text-xs font-bold text-zinc-600">Pasta:</span>
              <div className="relative">
                <input
                  type="text"
                  value={folderInputText}
                  onChange={(e) => {
                    setFolderInputText(e.target.value);
                    setIsFolderDropdownOpen(true);
                    const exact = folders.find((f) => f.nome.toLowerCase() === e.target.value.trim().toLowerCase());
                    setDocPastaId(exact ? exact.id : null);
                  }}
                  onFocus={() => setIsFolderDropdownOpen(true)}
                  placeholder="Digite o nome da pasta..."
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 text-xs text-zinc-800 font-medium focus:outline-none bg-white"
                />
              </div>

              {isFolderDropdownOpen && (
                <div className="bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto divide-y divide-zinc-100 z-20">
                  <div
                    onClick={() => {
                      setDocPastaId(null);
                      setFolderInputText("");
                      setIsFolderDropdownOpen(false);
                    }}
                    className="p-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer flex items-center justify-between"
                  >
                    <span>(Sem pasta - Fora de pasta)</span>
                    {docPastaId === null && <Check className="w-3.5 h-3.5 text-[#0b439c]" />}
                  </div>

                  {matchedFoldersForInput.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        setDocPastaId(f.id);
                        setFolderInputText(f.nome);
                        setIsFolderDropdownOpen(false);
                      }}
                      className="p-2 text-xs font-bold text-zinc-800 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                    >
                      <span>📁 {f.nome}</span>
                      {docPastaId === f.id && <Check className="w-3.5 h-3.5 text-[#0b439c]" />}
                    </div>
                  ))}

                  {folderInputText.trim() && !hasExactFolderMatch && (
                    <div className="p-2 bg-blue-50 border-t border-blue-100">
                      <button
                        type="button"
                        onClick={handleCreateFolderFromInput}
                        className="w-full px-2.5 py-1.5 bg-[#0b439c] text-white rounded text-xs font-bold hover:bg-blue-800 cursor-pointer"
                      >
                        + Criar pasta "{folderInputText.trim()}"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Configuração de Assinaturas */}
            <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-3">
              <span className="font-extrabold text-[#0b439c] text-xs uppercase tracking-wider">
                Assinaturas Selecionadas:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 bg-white p-2.5 rounded-xl border border-blue-100">
                  <input
                    type="checkbox"
                    checked={incluirAssinaturaProgramaCerto}
                    onChange={(e) => setIncluirAssinaturaProgramaCerto(e.target.checked)}
                    className="rounded text-[#0b439c]"
                  />
                  <span>Assinatura Programa Certo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 bg-white p-2.5 rounded-xl border border-blue-100">
                  <input
                    type="checkbox"
                    checked={incluirAssinaturaCordenacao}
                    onChange={(e) => setIncluirAssinaturaCordenacao(e.target.checked)}
                    className="rounded text-[#0b439c]"
                  />
                  <span>Assinatura Coordenação</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 bg-white p-2.5 rounded-xl border border-blue-100">
                  <input
                    type="checkbox"
                    checked={incluirCampoAssinaturaAluno}
                    onChange={(e) => setIncluirCampoAssinaturaAluno(e.target.checked)}
                    className="rounded text-[#0b439c]"
                  />
                  <span>Assinatura do Aluno</span>
                </label>
              </div>
            </div>

            {/* Conteúdo com Ferramentas, Negrito, Chips e Pré-visualização Ao Vivo */}
            <DocumentContentEditor
              docConteudo={docConteudo}
              setDocConteudo={setDocConteudo}
              docTamanhoConteudo={docTamanhoConteudo}
              setDocTamanhoConteudo={setDocTamanhoConteudo}
              docAlinhamentoConteudo={docAlinhamentoConteudo}
              setDocAlinhamentoConteudo={setDocAlinhamentoConteudo}
              docEstiloConteudo={docEstiloConteudo}
              setDocEstiloConteudo={setDocEstiloConteudo}
              docTitulo={docTitulo}
              docTamanhoTitulo={docTamanhoTitulo}
              docEstiloTitulo={docEstiloTitulo}
              docAlinhamentoTitulo={docAlinhamentoTitulo}
              textareaRef={textareaViewRef}
              onToggleBoldSelection={() => handleToggleBoldSelection(textareaViewRef)}
              onRemoveBoldWord={handleRemoveBoldWord}
              onToggleAllBold={handleToggleAllBold}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => {
                  setViewMode("list");
                  scrollToTop();
                }}
                className="px-5 py-2.5 rounded-xl text-zinc-600 font-bold hover:bg-zinc-100 transition-colors text-sm cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-sm transition-colors shadow-md shadow-blue-900/15 cursor-pointer flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Salvar Alterações</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TELA PRINCIPAL: LISTA DE PASTAS E DOCUMENTOS FORA DE PASTAS              */}
      {/* ========================================================================= */}
      {viewMode === "list" && (
        <>
          {/* 1. Header Card Principal */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/70 text-[#0b439c] flex items-center justify-center shrink-0 shadow-inner">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                    Documentos
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100/70 text-blue-800 border border-blue-200">
                    Gestão Acadêmica
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-xl">
                  Crie e organize pastas e documentos oficiais com assinatura digital institucional sincronizados com o banco de dados.
                </p>
              </div>
            </div>

            {/* Botões de Ação na Tela Principal */}
            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end flex-wrap">
              <button
                onClick={fetchSupabaseData}
                disabled={isLoading}
                title="Sincronizar agora com o banco de dados"
                className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-600 font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#0b439c]" : ""}`} />
              </button>

              <button
                onClick={handleOpenCreateFolder}
                className="px-3.5 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-700 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <FolderPlus className="w-4 h-4 text-blue-600" />
                <span>Criar Pasta</span>
              </button>

              <button
                onClick={handleOpenCreateDoc}
                className="px-4 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-blue-900/15"
              >
                <FilePlus className="w-4 h-4" />
                <span>Criar Documento</span>
              </button>
            </div>
          </div>

          {/* 2. Barra de Navegação e Pesquisa */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Navegação de Pasta */}
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setCurrentFolderId(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  currentFolderId === null
                    ? "bg-blue-50 text-[#0b439c] font-black"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <Folder className="w-4 h-4 text-blue-600" />
                <span>Todas as Pastas</span>
              </button>

              {currentFolder && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-[#0b439c] font-black shrink-0">
                    <FolderOpen className="w-4 h-4" />
                    <span>{currentFolder.nome}</span>
                  </div>
                </>
              )}
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar documento ou pasta..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#0b439c] focus:bg-white transition-all text-zinc-800 placeholder:text-zinc-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Seção de Pastas (Aparece na tela principal) */}
          {currentFolderId === null && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  Pastas ({filteredFolders.length})
                </h2>
                <button
                  onClick={handleOpenCreateFolder}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Criar Pasta</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredFolders.map((folder) => {
                  const count = getFolderCount(folder.id);
                  return (
                    <div
                      key={folder.id}
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Folder className="w-5 h-5" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmation({
                              isOpen: true,
                              type: "folder",
                              targetId: folder.id,
                              title: folder.nome,
                            });
                          }}
                          title="Excluir Pasta"
                          className="p-1 rounded-lg text-zinc-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4">
                        <h3 className="font-bold text-sm text-zinc-900 truncate group-hover:text-[#0b439c] transition-colors" title={folder.nome}>
                          {folder.nome}
                        </h3>
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1 font-medium">
                          <span>{count} documento{count === 1 ? "" : "s"}</span>
                          <span className="flex items-center gap-1 text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">
                            Abrir <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. BARRA DE AÇÕES DOS SELECIONADOS */}
          {selectedDocIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-2 font-bold text-xs text-blue-900">
                <span className="w-6 h-6 rounded-full bg-[#0b439c] text-white flex items-center justify-center text-[11px] font-black">
                  {selectedDocIds.length}
                </span>
                <span>documento(s) selecionado(s)</span>
              </div>

              {/* Botões: Abrir (se 1 selecionado), Mover para, Duplicar, Apagar */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedDocIds.length === 1 && (
                  <button
                    onClick={() => {
                      const docObj = documents.find((d) => d.id === selectedDocIds[0]);
                      if (docObj) handleOpenDocView(docObj);
                    }}
                    className="px-3 py-1.5 bg-white border border-blue-200 text-blue-800 rounded-lg font-bold text-xs hover:bg-blue-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir</span>
                  </button>
                )}

                <button
                  onClick={() => setShowMoveModal(true)}
                  className="px-3 py-1.5 bg-white border border-blue-200 text-blue-800 rounded-lg font-bold text-xs hover:bg-blue-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Move className="w-3.5 h-3.5" />
                  <span>Mover para...</span>
                </button>

                <button
                  onClick={handleDuplicateSelected}
                  className="px-3 py-1.5 bg-white border border-blue-200 text-blue-800 rounded-lg font-bold text-xs hover:bg-blue-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicar</span>
                </button>

                <button
                  onClick={() => {
                    setDeleteConfirmation({
                      isOpen: true,
                      type: "multiple",
                      title: `${selectedDocIds.length} documento(s) selecionado(s)`,
                    });
                  }}
                  className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-bold text-xs hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Apagar</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* 5. Tabela / Lista de Documentos */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between gap-3 bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  title="Selecionar todos"
                >
                  {selectedDocIds.length > 0 && selectedDocIds.length === displayedDocs.length ? (
                    <CheckSquare className="w-4 h-4 text-[#0b439c]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                  {currentFolder
                    ? `Documentos da Pasta: ${currentFolder.nome}`
                    : "Documentos (Fora de Pastas)"} ({displayedDocs.length})
                </h3>
              </div>
            </div>

            {displayedDocs.length === 0 ? (
              <div className="py-16 text-center space-y-3 px-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-zinc-700">Nenhum documento encontrado</p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {searchQuery
                    ? `Nenhum resultado para "${searchQuery}".`
                    : currentFolder
                    ? "Esta pasta está vazia. Você pode mover ou criar documentos dentro dela."
                    : "Não há documentos fora de pastas no momento."}
                </p>
                <button
                  onClick={handleOpenCreateDoc}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b439c] text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>Criar Documento</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {displayedDocs.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  const parentFolder = folders.find((f) => f.id === doc.pasta_id);

                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleOpenDocView(doc)}
                      className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-blue-50/40 transition-colors cursor-pointer ${
                        isSelected ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Checkbox de seleção */}
                        <button
                          onClick={(e) => toggleSelectDoc(doc.id, e)}
                          className="mt-1 text-zinc-400 hover:text-zinc-600 shrink-0 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#0b439c]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100/80">
                          <FileText className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-zinc-900 hover:text-[#0b439c] transition-colors truncate">
                              {doc.titulo}
                            </h4>
                            {parentFolder && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100/70 text-blue-800 border border-blue-200 flex items-center gap-1">
                                <Folder className="w-2.5 h-2.5" />
                                {parentFolder.nome}
                              </span>
                            )}
                            {doc.incluir_assinatura_programa_certo && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100/70 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                Assinatura Programa Certo
                              </span>
                            )}
                            {doc.incluir_assinatura_cordenacao && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100/70 text-blue-800 border border-blue-200 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                                Assinatura Coordenação
                              </span>
                            )}
                            {doc.incluir_campo_assinatura_aluno && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100/70 text-amber-800 border border-amber-200 flex items-center gap-1">
                                <PenTool className="w-2.5 h-2.5 text-amber-600" />
                                Assinatura Aluno
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap">
                            <span>
                              Criado em {new Date(doc.criado_em).toLocaleDateString("pt-BR")}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-md">
                              {doc.conteudo.substring(0, 80)}...
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ações rápidas */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDocumentPdfInBrowser(doc);
                          }}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 hover:text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs border border-zinc-700"
                          title="Abrir em PDF na Web sem baixar"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                          <span>Abrir na Web</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintDoc(doc);
                          }}
                          className="px-3 py-1.5 bg-zinc-100 hover:bg-[#0b439c] hover:text-white rounded-lg text-zinc-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Imprimir formatado"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimir</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmation({
                              isOpen: true,
                              type: "document",
                              targetId: doc.id,
                              title: doc.titulo,
                            });
                          }}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Apagar"
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
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE MOVER PARA PASTA                                                */}
      {/* ========================================================================= */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-zinc-200 w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3 border-zinc-200">
              <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                <Move className="w-4 h-4 text-blue-600" />
                <span>Mover {selectedDocIds.length} documento(s)</span>
              </h3>
              <button onClick={() => setShowMoveModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-zinc-700">Selecione a pasta de destino:</label>
              <select
                value={targetMoveFolder || ""}
                onChange={(e) => setTargetMoveFolder(e.target.value ? e.target.value : null)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-zinc-800 font-medium focus:outline-none focus:border-[#0b439c] bg-white cursor-pointer"
              >
                <option value="">(Remover de pastas - Deixar fora da pasta)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="px-4 py-2 rounded-xl text-zinc-600 font-bold hover:bg-zinc-100 text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleMoveSelected}
                className="px-5 py-2 rounded-xl bg-[#0b439c] text-white font-bold hover:bg-blue-800 text-xs shadow-xs cursor-pointer"
              >
                Confirmar e Mover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO COM TEXTO ESPECÍFICO                     */}
      {/* ========================================================================= */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-zinc-200 w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-base text-zinc-900">
                Você tem certeza que deseja excluir?
              </h3>
              <p className="text-xs text-zinc-500">
                {deleteConfirmation.title ? `"${deleteConfirmation.title}"` : "Esta ação é irreversível."}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmation({ isOpen: false, type: "document" })}
                className="px-5 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-100 text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
              >
                Sim, desejo excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
