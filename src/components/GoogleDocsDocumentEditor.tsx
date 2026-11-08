import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Printer,
  ExternalLink,
  Save,
  CheckCircle2,
  Loader2,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading,
  PenTool,
  Trash2,
  X,
  Plus,
  Sparkles,
  Folder,
  Download,
  RotateCcw
} from "lucide-react";
import { DocumentItem, DocFolder, parseFontSize } from "./DocumentosManager";
import { LOGO_PROGRAMA_CERTO_BASE64 } from "../lib/logoBase64";
import { openDocumentPdfInBrowser, printDocumentInBrowser, downloadDocumentPdf } from "../lib/generateDocumentPdf";

export interface GoogleDocsDocumentEditorProps {
  initialDoc: DocumentItem;
  allFolders: DocFolder[];
  onSave: (updatedDoc: DocumentItem) => Promise<void>;
  onBack: () => void;
  onDelete?: (docId: string) => void;
}

export const PAGE_BREAK_MARKER = "<!-- PAGE_BREAK -->";

/**
 * Escapa caracteres HTML para conversão segura de legado
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Converte texto simples legado para blocos de HTML preservando quebras de linha e enters
 */
function convertPlainTextToHtml(plain: string): string {
  if (!plain) return "<p><br></p>";
  const lines = plain.split("\n");
  const paragraphs = lines.map((line) => {
    if (!line.trim()) return "<p><br></p>";
    return `<p class="doc-text">${escapeHtml(line)}</p>`;
  });
  return paragraphs.join("") || "<p><br></p>";
}

/**
 * Divide o conteúdo do documento (HTML ou legado) em páginas para edição
 */
export function parseInitialPages(content: string | undefined): string[] {
  if (!content || !content.trim()) {
    return ["<p><br></p>"];
  }

  // Divisão oficial por marcador PAGE_BREAK
  if (content.includes(PAGE_BREAK_MARKER)) {
    const parts = content.split(PAGE_BREAK_MARKER);
    return parts.map((p) => p.trim() || "<p><br></p>");
  }

  // Suporte a marcador legado \f (form feed)
  if (content.includes("\f")) {
    const parts = content.split("\f");
    return parts.map((p) => {
      if (/<(p|h[1-6]|div|br)[^>]*>/i.test(p)) {
        return p.trim() || "<p><br></p>";
      }
      return convertPlainTextToHtml(p);
    });
  }

  // Se já contém tags HTML
  if (/<(p|h[1-6]|div|br|span)[^>]*>/i.test(content)) {
    return [content];
  }

  // Se é texto legado sem tags
  return [convertPlainTextToHtml(content)];
}

/**
 * Junta as páginas HTML em um único documento persistido no Supabase
 */
export function joinPagesToContent(pages: string[]): string {
  return pages.join(PAGE_BREAK_MARKER);
}

// Verifica se uma assinatura deve aparecer em determinada página (1-indexed)
export function isSignatureOnPage(
  rule: string | undefined,
  pageNumber: number,
  totalPages: number
): boolean {
  if (!rule || rule.trim().toLowerCase() === "ultima" || rule.trim().toLowerCase() === "última") {
    return pageNumber === totalPages;
  }
  const nums = rule
    .split(/[,\s]+/)
    .map((n) => parseInt(n.trim(), 10))
    .filter((n) => !isNaN(n));
  if (nums.length === 0) return pageNumber === totalPages;
  return nums.includes(pageNumber);
}

export function getActiveSignaturesForPage(
  doc: {
    incluir_assinatura_programa_certo?: boolean;
    incluir_assinatura_cordenacao?: boolean;
    incluir_campo_assinatura_aluno?: boolean;
    incluir_assinatura_aluno?: boolean;
    paginas_assinatura_programa_certo?: string;
    paginas_assinatura_cordenacao?: string;
    paginas_assinatura_aluno?: string;
  },
  pageNumber: number,
  totalPages: number
) {
  const isSignOnPage = (rule: string | undefined) => {
    if (!rule || rule.trim().toLowerCase() === "ultima" || rule.trim().toLowerCase() === "última") {
      return pageNumber === totalPages;
    }
    const nums = rule
      .split(/[,\s]+/)
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n));
    if (nums.length === 0) return pageNumber === totalPages;
    return nums.includes(pageNumber);
  };

  const hasProgramaCerto =
    !!doc.incluir_assinatura_programa_certo && isSignOnPage(doc.paginas_assinatura_programa_certo);
  const hasCordenacao =
    !!doc.incluir_assinatura_cordenacao && isSignOnPage(doc.paginas_assinatura_cordenacao);
  const hasAluno =
    !!(doc.incluir_campo_assinatura_aluno || doc.incluir_assinatura_aluno) &&
    isSignOnPage(doc.paginas_assinatura_aluno);

  const count = [hasProgramaCerto, hasCordenacao, hasAluno].filter(Boolean).length;
  return {
    hasProgramaCerto,
    hasCordenacao,
    hasAluno,
    hasAny: count > 0,
    count,
  };
}

export function GoogleDocsDocumentEditor({
  initialDoc,
  allFolders,
  onSave,
  onBack,
  onDelete,
}: GoogleDocsDocumentEditorProps) {
  // 1. Estado do Documento: O Nome do Documento é PERMANENTE e NÃO muda ao formatar títulos no corpo!
  const [docTitulo, setDocTitulo] = useState<string>(initialDoc.titulo || "Documento sem título");
  const [docPastaId, setDocPastaId] = useState<string | null>(initialDoc.pasta_id || null);

  // 2. Páginas em HTML (cada página representa uma folha A4 com código HTML estruturado)
  const [pagesHtml, setPagesHtml] = useState<string[]>(() => parseInitialPages(initialDoc.conteudo));
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // 3. Detecção de seleção ativa para alternar dinamicamente o botão de Título:
  // "Mudar texto selecionado para o tipo título" <-> "Mudar texto selecionado para não título"
  const [isCurrentSelectionTitle, setIsCurrentSelectionTitle] = useState<boolean>(false);

  // 4. Definições de Estilo de Título
  const [docTamanhoTitulo, setDocTamanhoTitulo] = useState<number>(
    parseFontSize(initialDoc.tamanho_titulo, 18)
  );
  const [docEstiloTitulo, setDocEstiloTitulo] = useState<"negrito" | "normal">(
    initialDoc.estilo_titulo === "normal" ? "normal" : "negrito"
  );
  const [docAlinhamentoTitulo, setDocAlinhamentoTitulo] = useState<"center" | "left" | "right">(
    initialDoc.alinhamento_titulo || "center"
  );

  // 5. Definições de Estilo de Documento / Conteúdo
  const [docTamanhoConteudo, setDocTamanhoConteudo] = useState<number>(
    parseFontSize(initialDoc.tamanho_conteudo, 15)
  );
  const [docAlinhamentoConteudo, setDocAlinhamentoConteudo] = useState<
    "justify" | "left" | "center" | "right"
  >(initialDoc.alinhamento_conteudo || "justify");
  const [docEstiloConteudo, setDocEstiloConteudo] = useState<string>(
    initialDoc.estilo_conteudo || ""
  );

  // 6. Assinaturas e suas Páginas
  const [incluirAssinaturaProgramaCerto, setIncluirAssinaturaProgramaCerto] = useState<boolean>(
    initialDoc.incluir_assinatura_programa_certo !== false
  );
  const [paginasProgramaCerto, setPaginasProgramaCerto] = useState<string>(
    initialDoc.paginas_assinatura_programa_certo || "ultima"
  );

  const [incluirAssinaturaCordenacao, setIncluirAssinaturaCordenacao] = useState<boolean>(
    initialDoc.incluir_assinatura_cordenacao !== false
  );
  const [paginasCordenacao, setPaginasCordenacao] = useState<string>(
    initialDoc.paginas_assinatura_cordenacao || "ultima"
  );

  const [incluirAssinaturaAluno, setIncluirAssinaturaAluno] = useState<boolean>(
    Boolean(initialDoc.incluir_campo_assinatura_aluno || initialDoc.incluir_assinatura_aluno)
  );
  const [paginasAluno, setPaginasAluno] = useState<string>(
    initialDoc.paginas_assinatura_aluno || "ultima"
  );

  // 7. Popover de Assinaturas (abrindo para a direita/interior)
  const [isSignaturesPanelOpen, setIsSignaturesPanelOpen] = useState(false);

  // 8. Status de salvamento e feedback
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Referências aos editores de conteúdo HTML de cada página
  const editableRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);

  // Sincroniza escala com largura da janela (794px padrão de folha A4)
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const availableW = containerRef.current.clientWidth;
        const targetScale = Math.min(1, Math.max(0.35, (availableW - 32) / 794));
        setScale(targetScale);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Monitora alterações do cursor e da seleção para atualizar o estado dinâmico do botão de Título
  const checkSelectionIsTitle = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setIsCurrentSelectionTitle(false);
      return;
    }

    let node: Node | null = sel.anchorNode;
    let insideTitle = false;

    while (node && node !== document.body) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toUpperCase();
        if (tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4" || el.classList.contains("doc-title")) {
          insideTitle = true;
          break;
        }
        if (el.getAttribute("contenteditable") === "true") {
          break;
        }
      }
      node = node.parentNode;
    }

    setIsCurrentSelectionTitle(insideTitle);
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", checkSelectionIsTitle);
    return () => {
      document.removeEventListener("selectionchange", checkSelectionIsTitle);
    };
  }, [checkSelectionIsTitle]);

  // Rastreia modificações não salvas
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [
    docTitulo,
    docPastaId,
    pagesHtml,
    docTamanhoTitulo,
    docEstiloTitulo,
    docAlinhamentoTitulo,
    docTamanhoConteudo,
    docAlinhamentoConteudo,
    docEstiloConteudo,
    incluirAssinaturaProgramaCerto,
    paginasProgramaCerto,
    incluirAssinaturaCordenacao,
    paginasCordenacao,
    incluirAssinaturaAluno,
    paginasAluno,
  ]);

  // Conteúdo HTML consolidado
  const consolidatedHtml = useMemo(() => {
    return joinPagesToContent(pagesHtml);
  }, [pagesHtml]);

  // Objeto do Documento atualizado para salvar ou exportar em PDF
  const currentDocItem: DocumentItem = useMemo(() => {
    return {
      ...initialDoc,
      titulo: docTitulo,
      tamanho_titulo: docTamanhoTitulo,
      estilo_titulo: docEstiloTitulo,
      alinhamento_titulo: docAlinhamentoTitulo,
      pasta_id: docPastaId,
      conteudo: consolidatedHtml,
      tamanho_conteudo: docTamanhoConteudo,
      alinhamento_conteudo: docAlinhamentoConteudo,
      estilo_conteudo: docEstiloConteudo,
      incluir_assinatura_programa_certo: incluirAssinaturaProgramaCerto,
      paginas_assinatura_programa_certo: paginasProgramaCerto,
      incluir_assinatura_cordenacao: incluirAssinaturaCordenacao,
      paginas_assinatura_cordenacao: paginasCordenacao,
      incluir_campo_assinatura_aluno: incluirAssinaturaAluno,
      incluir_assinatura_aluno: incluirAssinaturaAluno,
      paginas_assinatura_aluno: paginasAluno,
    };
  }, [
    initialDoc,
    docTitulo,
    docTamanhoTitulo,
    docEstiloTitulo,
    docAlinhamentoTitulo,
    docPastaId,
    consolidatedHtml,
    docTamanhoConteudo,
    docAlinhamentoConteudo,
    docEstiloConteudo,
    incluirAssinaturaProgramaCerto,
    paginasProgramaCerto,
    incluirAssinaturaCordenacao,
    paginasCordenacao,
    incluirAssinaturaAluno,
    paginasAluno,
  ]);

  // Atualiza HTML de uma folha específica ao digitar
  const handlePageHtmlInput = (pIdx: number, newHtml: string) => {
    setPagesHtml((prev) => {
      const copy = [...prev];
      copy[pIdx] = newHtml;
      return copy;
    });
  };

  /**
   * BOTÃO DINÂMICO SOLICITADO PELO USUÁRIO:
   * - Quando NÃO está em título: "Mudar texto selecionado para o tipo título" -> transforma em <h2 class="doc-title">
   * - Quando ESTÁ em título: "Mudar texto selecionado para não título" -> volta para <p class="doc-text">
   * O nome do documento (docTitulo) NÃO É ALTERADO!
   */
  const handleToggleSelectedTitle = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setFeedbackToast("Posicione o cursor ou selecione o texto na folha para formatar como título.");
      setTimeout(() => setFeedbackToast(null), 3000);
      return;
    }

    // Identifica o contêiner editável da página ativa
    let node: Node | null = sel.anchorNode;
    let editableContainer: HTMLElement | null = null;
    let headingParent: HTMLElement | null = null;

    while (node && node !== document.body) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toUpperCase();
        if (el.getAttribute("contenteditable") === "true") {
          editableContainer = el;
          break;
        }
        if (!headingParent && (tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4" || el.classList.contains("doc-title"))) {
          headingParent = el;
        }
      }
      node = node.parentNode;
    }

    if (!editableContainer) {
      // Se não encontrou pelo anchor, usa a folha ativa
      editableContainer = editableRefs.current[activePageIndex] || editableRefs.current[0];
      if (editableContainer) {
        editableContainer.focus();
      }
    }

    if (!editableContainer) {
      setFeedbackToast("Clique na folha onde deseja aplicar a formatação.");
      setTimeout(() => setFeedbackToast(null), 2500);
      return;
    }

    if (headingParent || isCurrentSelectionTitle) {
      // 1. Já é um título -> Alterna para NÃO TÍTULO (<p class="doc-text">)
      document.execCommand("formatBlock", false, "<p>");
      const activeEl = window.getSelection()?.anchorNode?.parentElement;
      if (activeEl && activeEl.tagName.toUpperCase() === "P") {
        activeEl.className = "doc-text";
      }
      setIsCurrentSelectionTitle(false);
      setFeedbackToast("Texto formatado como texto normal (não título).");
    } else {
      // 2. Não é título -> Transforma em TÍTULO (<h2 class="doc-title">)
      document.execCommand("formatBlock", false, "<h2>");
      const activeEl = window.getSelection()?.anchorNode?.parentElement;
      if (activeEl && (activeEl.tagName.toUpperCase() === "H2" || activeEl.tagName.toUpperCase() === "H1")) {
        activeEl.className = "doc-title font-black uppercase tracking-wide";
      }
      setIsCurrentSelectionTitle(true);
      setFeedbackToast("Texto formatado como título!");
    }

    // Sincroniza HTML da página imediatamente
    const pIdx = parseInt(editableContainer.getAttribute("data-page-index") || String(activePageIndex), 10);
    handlePageHtmlInput(pIdx, editableContainer.innerHTML);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  // Alternar Negrito no texto selecionado nativamente
  const handleToggleBold = () => {
    document.execCommand("bold", false);
    const container = editableRefs.current[activePageIndex];
    if (container) {
      handlePageHtmlInput(activePageIndex, container.innerHTML);
    }
  };

  // Alinhar parágrafo ou título atual
  const handleApplyAlignment = (align: "left" | "center" | "right" | "justify") => {
    if (align === "left") document.execCommand("justifyLeft", false);
    else if (align === "center") document.execCommand("justifyCenter", false);
    else if (align === "right") document.execCommand("justifyRight", false);
    else if (align === "justify") document.execCommand("justifyFull", false);

    const container = editableRefs.current[activePageIndex];
    if (container) {
      handlePageHtmlInput(activePageIndex, container.innerHTML);
    }
  };

  // Adicionar Página
  const handleAddNewPage = () => {
    setPagesHtml((prev) => [...prev, "<p><br></p>"]);
    const nextIdx = pagesHtml.length;
    setActivePageIndex(nextIdx);
    setFeedbackToast(`Nova folha (Página ${nextIdx + 1}) adicionada!`);
    setTimeout(() => {
      setFeedbackToast(null);
      editableRefs.current[nextIdx]?.focus();
    }, 400);
  };

  // Remover Página (se houver mais de uma)
  const handleRemovePage = (idxToRemove: number) => {
    if (pagesHtml.length <= 1) return;
    setPagesHtml((prev) => prev.filter((_, idx) => idx !== idxToRemove));
    setActivePageIndex((prev) => Math.max(0, Math.min(prev, pagesHtml.length - 2)));
    setFeedbackToast("Folha removida.");
    setTimeout(() => setFeedbackToast(null), 2000);
  };

  // Salvar Documento
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(currentDocItem);
      setHasUnsavedChanges(false);
      const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setLastSavedTime(timeStr);
      setFeedbackToast("Documento e código HTML salvos com sucesso!");
      setTimeout(() => setFeedbackToast(null), 3000);
    } catch (err) {
      console.error("Erro ao salvar documento:", err);
      setFeedbackToast("Erro ao salvar documento.");
      setTimeout(() => setFeedbackToast(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Voltar para Documentos
  const handleBackAction = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
    } else {
      onBack();
    }
  };

  const dataAtual = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const horaAtual = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalPagesCount = pagesHtml.length;

  return (
    <div className="fixed inset-0 z-40 bg-[#eaedf1] text-zinc-900 flex flex-col font-sans select-text overflow-hidden h-screen w-screen">
      {/* ========================================================================= */}
      {/* ESTILOS TIPOGRÁFICOS DINÂMICOS DO CANVAS EDITÁVEL HTML                   */}
      {/* ========================================================================= */}
      <style>{`
        .doc-editable-sheet {
          white-space: pre-wrap;
          word-break: break-word;
          font-family: Arial, Helvetica, sans-serif;
          color: #18181b;
        }
        .doc-editable-sheet p {
          margin: 0 0 4px 0;
          min-height: 1.4em;
          font-size: ${docTamanhoConteudo}px;
          line-height: ${Math.max(18, docTamanhoConteudo * 1.55)}px;
          text-align: ${docAlinhamentoConteudo};
        }
        .doc-editable-sheet h1,
        .doc-editable-sheet h2,
        .doc-editable-sheet h3,
        .doc-editable-sheet .doc-title {
          margin: 12px 0 6px 0;
          font-size: ${docTamanhoTitulo}px;
          line-height: ${Math.max(20, docTamanhoTitulo * 1.3)}px;
          font-weight: ${docEstiloTitulo === "normal" ? 600 : 900};
          text-align: ${docAlinhamentoTitulo};
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #09090b;
        }
        .doc-editable-sheet:focus {
          outline: none;
        }
        .doc-editable-sheet b,
        .doc-editable-sheet strong {
          font-weight: 800;
        }
      `}</style>

      {/* ========================================================================= */}
      {/* MENU SUPERIOR FIXO: CABEÇALHO + DEFINIÇÕES + ASSINATURAS (NÃO ROLA)       */}
      {/* ========================================================================= */}
      <div className="shrink-0 z-30 flex flex-col bg-white border-b border-zinc-200 select-none shadow-xs">
        {/* 1. BARRA SUPERIOR (HEADER COM IDENTIDADE GESTÃO CURSOS) */}
        <header className="bg-white border-b border-zinc-200 px-3 sm:px-6 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* BLOCO 1: Logo Gestão Cursos Programa Certo + Botão Voltar para Documentos */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap">
              <div className="flex items-center gap-2 select-none shrink-0">
                <img
                  src={LOGO_PROGRAMA_CERTO_BASE64 || "/logo-programa-certo.png"}
                  alt="Logo Gestão Cursos Programa Certo"
                  className="w-8 h-8 object-contain rounded-lg border border-zinc-200/80 shadow-2xs"
                />
                <div className="flex flex-col">
                  <span className="font-black text-xs text-[#0b439c] leading-none">Gestão Cursos</span>
                  <span className="font-bold text-[9px] text-zinc-500 leading-none mt-0.5">Programa Certo</span>
                </div>
              </div>

              <div className="h-6 w-px bg-zinc-200 hidden sm:block shrink-0" />

              {/* Botão com setinha de Voltar: "Voltar para Documentos" */}
              <button
                type="button"
                onClick={handleBackAction}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition-colors cursor-pointer border border-zinc-200 shrink-0"
                title="Voltar para a lista de Documentos"
              >
                <ArrowLeft className="w-4 h-4 text-[#0b439c]" />
                <span>Voltar para Documentos</span>
              </button>
            </div>

            {/* BLOCO 2: Nome do Documento (PERMANENTE no arquivo) + Pasta */}
            <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-xl flex-wrap">
              <input
                type="text"
                value={docTitulo}
                onChange={(e) => setDocTitulo(e.target.value)}
                placeholder="Nome do documento..."
                className="flex-1 min-w-[160px] text-xs sm:text-sm font-black text-zinc-900 bg-transparent hover:bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-blue-500/30 px-2 py-1 rounded-lg border border-transparent hover:border-zinc-300 focus:border-[#0b439c] outline-none transition-all truncate"
                title="Nome do arquivo do documento (permanente, não muda ao formatar títulos no texto)"
              />

              {/* Seletor de Pasta */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200/80 rounded-xl border border-zinc-200 text-xs font-semibold shrink-0 transition-colors">
                <Folder className="w-3.5 h-3.5 text-[#0b439c] shrink-0" />
                <select
                  value={docPastaId || ""}
                  onChange={(e) => setDocPastaId(e.target.value || null)}
                  className="bg-transparent border-0 outline-none text-zinc-700 text-xs font-bold cursor-pointer pr-1"
                  title="Pasta onde este documento está alocado"
                >
                  <option value="">Sem pasta</option>
                  {allFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* BLOCO 3: Botões de Ação */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Status de Salvamento */}
              <div className="hidden xl:flex items-center gap-1.5 text-xs font-semibold shrink-0">
                {isSaving ? (
                  <span className="text-amber-600 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </span>
                ) : hasUnsavedChanges ? (
                  <span className="text-zinc-400">Alterações pendentes</span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {lastSavedTime ? `Salvo às ${lastSavedTime}` : "Salvo"}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => openDocumentPdfInBrowser(currentDocItem)}
                className="px-2.5 sm:px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-200"
                title="Abrir PDF na Web"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#0b439c]" />
                <span>Abrir na Web</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const ok = downloadDocumentPdf(currentDocItem);
                  if (ok) {
                    setFeedbackToast("Download do PDF iniciado!");
                    setTimeout(() => setFeedbackToast(null), 3000);
                  }
                }}
                className="px-2.5 sm:px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0b439c] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200"
                title="Baixar arquivo PDF com o nome do documento no dispositivo"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar PDF</span>
              </button>

              <button
                type="button"
                onClick={() => printDocumentInBrowser(currentDocItem)}
                className="px-2.5 sm:px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-200"
                title="Imprimir documento oficial"
              >
                <Printer className="w-3.5 h-3.5 text-zinc-700" />
                <span>Imprimir</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 sm:px-4 py-1.5 bg-[#0b439c] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-900/15 cursor-pointer disabled:opacity-50"
                title="Salvar alterações no documento e formato HTML"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Salvar Alterações</span>
              </button>

              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(initialDoc.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-rose-200 ml-1"
                  title="Excluir documento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. BARRA DE FERRAMENTAS: TÍTULO DINÂMICO, DOCUMENTO, ASSINATURAS          */}
        {/* ========================================================================= */}
        <div className="bg-[#f8fafc] px-3 sm:px-6 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* SEÇÃO 1: DEFINIÇÕES PARA TÍTULO */}
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-zinc-200 shadow-2xs flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0b439c] bg-blue-50 px-2 py-1 rounded-md border border-blue-200 select-none">
                Definições para Título
              </span>

              {/* BOTÃO DINÂMICO CONFORME SOLICITADO:
                  - Quando NÃO é título: "Mudar texto selecionado para o tipo título"
                  - Quando É título: "Mudar texto selecionado para não título"
              */}
              <button
                type="button"
                onClick={handleToggleSelectedTitle}
                className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isCurrentSelectionTitle
                    ? "bg-[#0b439c] text-white border-blue-900 shadow-xs"
                    : "bg-blue-50/70 hover:bg-blue-100 text-[#0b439c] border-blue-200"
                }`}
                title={
                  isCurrentSelectionTitle
                    ? "Reverter trecho selecionado para texto normal"
                    : "Transformar trecho selecionado em título do documento"
                }
              >
                {isCurrentSelectionTitle ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 text-white" />
                    <span className="text-[11px]">Mudar texto selecionado para não título</span>
                  </>
                ) : (
                  <>
                    <Heading className="w-3.5 h-3.5 text-[#0b439c]" />
                    <span className="text-[11px]">Mudar texto selecionado para o tipo título</span>
                  </>
                )}
              </button>

              {/* Tamanho da Fonte do Título [-] [num] [+] */}
              <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setDocTamanhoTitulo((prev) => Math.max(12, prev - 1))}
                  className="w-5 h-6 flex items-center justify-center font-bold text-xs text-zinc-600 hover:bg-zinc-200 rounded cursor-pointer"
                  title="Diminuir fonte do título"
                >
                  -
                </button>
                <span className="px-1.5 text-xs font-black text-zinc-800 min-w-6 text-center">
                  {docTamanhoTitulo}
                </span>
                <button
                  type="button"
                  onClick={() => setDocTamanhoTitulo((prev) => Math.min(36, prev + 1))}
                  className="w-5 h-6 flex items-center justify-center font-bold text-xs text-zinc-600 hover:bg-zinc-200 rounded cursor-pointer"
                  title="Aumentar fonte do título"
                >
                  +
                </button>
              </div>

              {/* Negrito do Título */}
              <button
                type="button"
                onClick={() =>
                  setDocEstiloTitulo((prev) => (prev === "negrito" ? "normal" : "negrito"))
                }
                className={`w-6 h-6 flex items-center justify-center rounded-lg font-black text-xs transition-colors cursor-pointer ${
                  docEstiloTitulo === "negrito"
                    ? "bg-[#0b439c] text-white shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
                title="Alternar negrito padrão dos títulos"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              {/* Alinhamento do Título */}
              <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setDocAlinhamentoTitulo("left");
                    handleApplyAlignment("left");
                  }}
                  className={`p-1 rounded cursor-pointer ${
                    docAlinhamentoTitulo === "left"
                      ? "bg-[#0b439c] text-white"
                      : "text-zinc-600 hover:bg-zinc-200"
                  }`}
                  title="Alinhar título à esquerda"
                >
                  <AlignLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocAlinhamentoTitulo("center");
                    handleApplyAlignment("center");
                  }}
                  className={`p-1 rounded cursor-pointer ${
                    docAlinhamentoTitulo === "center"
                      ? "bg-[#0b439c] text-white"
                      : "text-zinc-600 hover:bg-zinc-200"
                  }`}
                  title="Centralizar título"
                >
                  <AlignCenter className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocAlinhamentoTitulo("right");
                    handleApplyAlignment("right");
                  }}
                  className={`p-1 rounded cursor-pointer ${
                    docAlinhamentoTitulo === "right"
                      ? "bg-[#0b439c] text-white"
                      : "text-zinc-600 hover:bg-zinc-200"
                  }`}
                  title="Alinhar título à direita"
                >
                  <AlignRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* SEÇÃO 2: DEFINIÇÕES PARA DOCUMENTO (CONTEÚDO) */}
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-zinc-200 shadow-2xs flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-700 bg-zinc-100 px-2 py-1 rounded-md border border-zinc-300 select-none">
                Definições para Documento
              </span>

              {/* Tamanho da Fonte do Conteúdo [-] [num] [+] */}
              <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setDocTamanhoConteudo((prev) => Math.max(9, prev - 1))}
                  className="w-5 h-6 flex items-center justify-center font-bold text-xs text-zinc-600 hover:bg-zinc-200 rounded cursor-pointer"
                  title="Diminuir fonte do texto"
                >
                  -
                </button>
                <span className="px-1.5 text-xs font-black text-zinc-800 min-w-6 text-center">
                  {docTamanhoConteudo}
                </span>
                <button
                  type="button"
                  onClick={() => setDocTamanhoConteudo((prev) => Math.min(28, prev + 1))}
                  className="w-5 h-6 flex items-center justify-center font-bold text-xs text-zinc-600 hover:bg-zinc-200 rounded cursor-pointer"
                  title="Aumentar fonte do texto"
                >
                  +
                </button>
              </div>

              {/* Negrito do Conteúdo */}
              <button
                type="button"
                onClick={handleToggleBold}
                className="w-6 h-6 flex items-center justify-center rounded-lg font-black text-xs text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer border border-zinc-200"
                title="Aplicar/remover negrito no texto selecionado"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              {/* Alinhamentos do Conteúdo */}
              <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setDocAlinhamentoConteudo("left");
                    handleApplyAlignment("left");
                  }}
                  className={`p-1 rounded cursor-pointer ${
                    docAlinhamentoConteudo === "left"
                      ? "bg-[#0b439c] text-white"
                      : "text-zinc-600 hover:bg-zinc-200"
                  }`}
                  title="Alinhar à esquerda"
                >
                  <AlignLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocAlinhamentoConteudo("center");
                    handleApplyAlignment("center");
                  }}
                  className={`p-1 rounded cursor-pointer ${
                    docAlinhamentoConteudo === "center"
                      ? "bg-[#0b439c] text-white"
                      : "text-zinc-600 hover:bg-zinc-200"
                  }`}
                  title="Centralizar"
                >
                  <AlignCenter className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocAlinhamentoConteudo("right");
                    handleApplyAlignment("right");
                  }}
                  className={`p-1 rounded cursor-pointer ${
                    docAlinhamentoConteudo === "right"
                      ? "bg-[#0b439c] text-white"
                      : "text-zinc-600 hover:bg-zinc-200"
                  }`}
                  title="Alinhar à direita"
                >
                  <AlignRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocAlinhamentoConteudo("justify");
                    handleApplyAlignment("justify");
                  }}
                  className={`p-1 rounded cursor-pointer ${
                    docAlinhamentoConteudo === "justify"
                      ? "bg-[#0b439c] text-white"
                      : "text-zinc-600 hover:bg-zinc-200"
                  }`}
                  title="Justificado"
                >
                  <AlignJustify className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: CONFIGURAÇÃO DE ASSINATURAS */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* BOTÃO DE ASSINATURAS EM PÁGINAS COM POPOVER ABRINDO PARA O INTERIOR */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSignaturesPanelOpen((prev) => !prev)}
                className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-blue-200 text-[#0b439c] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Configurar em quais páginas cada assinatura deve aparecer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Assinaturas em Páginas</span>
                <span className="w-2 h-2 rounded-full bg-blue-600 ml-0.5" />
              </button>

              {/* PAINEL FLUTUANTE DE CONFIGURAÇÃO DE ASSINATURAS (ABRE PARA O INTERIOR: right-0) */}
              {isSignaturesPanelOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/10 sm:bg-transparent"
                    onClick={() => setIsSignaturesPanelOpen(false)}
                  />

                  <div className="absolute right-0 top-full mt-2 w-[calc(100vw-32px)] max-w-sm sm:w-96 max-h-[80vh] overflow-y-auto bg-white border border-zinc-200 rounded-2xl shadow-2xl p-4 z-50 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <PenTool className="w-4 h-4 text-[#0b439c]" />
                        <span className="text-xs font-black text-zinc-900 uppercase tracking-wider">
                          Assinaturas em Páginas
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSignaturesPanelOpen(false)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Escolha quais assinaturas incluir e selecione se aparecem sempre na <strong>Última página</strong> ou em <strong>Páginas específicas</strong> (ex: 1, 4, 6).
                    </p>

                    <div className="space-y-3">
                      {/* 1. Assinatura Programa Certo */}
                      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-800">
                            <input
                              type="checkbox"
                              checked={incluirAssinaturaProgramaCerto}
                              onChange={(e) => setIncluirAssinaturaProgramaCerto(e.target.checked)}
                              className="rounded text-[#0b439c] cursor-pointer"
                            />
                            <span>Assinatura Programa Certo</span>
                          </label>
                        </div>

                        {incluirAssinaturaProgramaCerto && (
                          <div className="pl-6 space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Páginas:</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPaginasProgramaCerto("ultima")}
                                className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                                  paginasProgramaCerto.trim().toLowerCase() === "ultima"
                                    ? "bg-[#0b439c] text-white"
                                    : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                                }`}
                              >
                                Última página
                              </button>
                              <input
                                type="text"
                                value={paginasProgramaCerto === "ultima" ? "" : paginasProgramaCerto}
                                onChange={(e) => setPaginasProgramaCerto(e.target.value || "ultima")}
                                placeholder="Ex: 1, 4, 6"
                                className="flex-1 px-2 py-1 bg-white border border-zinc-300 rounded text-xs font-medium text-zinc-800 outline-none focus:border-[#0b439c]"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. Assinatura Coordenação */}
                      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-800">
                            <input
                              type="checkbox"
                              checked={incluirAssinaturaCordenacao}
                              onChange={(e) => setIncluirAssinaturaCordenacao(e.target.checked)}
                              className="rounded text-[#0b439c] cursor-pointer"
                            />
                            <span>Assinatura Coordenação</span>
                          </label>
                        </div>

                        {incluirAssinaturaCordenacao && (
                          <div className="pl-6 space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Páginas:</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPaginasCordenacao("ultima")}
                                className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                                  paginasCordenacao.trim().toLowerCase() === "ultima"
                                    ? "bg-[#0b439c] text-white"
                                    : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                                }`}
                              >
                                Última página
                              </button>
                              <input
                                type="text"
                                value={paginasCordenacao === "ultima" ? "" : paginasCordenacao}
                                onChange={(e) => setPaginasCordenacao(e.target.value || "ultima")}
                                placeholder="Ex: 2"
                                className="flex-1 px-2 py-1 bg-white border border-zinc-300 rounded text-xs font-medium text-zinc-800 outline-none focus:border-[#0b439c]"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3. Assinatura do Aluno */}
                      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-800">
                            <input
                              type="checkbox"
                              checked={incluirAssinaturaAluno}
                              onChange={(e) => setIncluirAssinaturaAluno(e.target.checked)}
                              className="rounded text-[#0b439c] cursor-pointer"
                            />
                            <span>Assinatura do Aluno</span>
                          </label>
                        </div>

                        {incluirAssinaturaAluno && (
                          <div className="pl-6 space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Páginas:</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPaginasAluno("ultima")}
                                className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                                  paginasAluno.trim().toLowerCase() === "ultima"
                                    ? "bg-[#0b439c] text-white"
                                    : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                                }`}
                              >
                                Última página
                              </button>
                              <input
                                type="text"
                                value={paginasAluno === "ultima" ? "" : paginasAluno}
                                onChange={(e) => setPaginasAluno(e.target.value || "ultima")}
                                placeholder="Ex: 1"
                                className="flex-1 px-2 py-1 bg-white border border-zinc-300 rounded text-xs font-medium text-zinc-800 outline-none focus:border-[#0b439c]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsSignaturesPanelOpen(false)}
                        className="px-3 py-1.5 bg-[#0b439c] text-white rounded-lg text-xs font-bold hover:bg-blue-800 cursor-pointer"
                      >
                        Confirmar Definições
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ÁREA DAS FOLHAS A4 (ÚNICA PARTE QUE ROLA PARA CIMA E PARA BAIXO)       */}
      {/* ========================================================================= */}
      <main
        ref={containerRef}
        className="flex-1 min-h-0 py-8 px-2 sm:px-6 flex flex-col items-center overflow-y-auto overscroll-contain space-y-8 select-text"
      >
        {pagesHtml.map((pageHtml, pIdx) => {
          const pageNumber = pIdx + 1;
          const isFirstPage = pIdx === 0;
          const sigs = getActiveSignaturesForPage(
            {
              incluir_assinatura_programa_certo: incluirAssinaturaProgramaCerto,
              paginas_assinatura_programa_certo: paginasProgramaCerto,
              incluir_assinatura_cordenacao: incluirAssinaturaCordenacao,
              paginas_assinatura_cordenacao: paginasCordenacao,
              incluir_campo_assinatura_aluno: incluirAssinaturaAluno,
              incluir_assinatura_aluno: incluirAssinaturaAluno,
              paginas_assinatura_aluno: paginasAluno,
            },
            pageNumber,
            totalPagesCount
          );

          const scaledW = Math.round(794 * scale);
          const scaledH = Math.round(1123 * scale);

          return (
            <React.Fragment key={pageNumber}>
              {/* Linha divisória de corte de página limpa */}
              {pIdx > 0 && (
                <div className="w-full max-w-[794px] flex items-center justify-between gap-3 py-1 select-none">
                  <div className="h-px bg-zinc-300 flex-1 border-t border-dashed border-zinc-400" />
                  <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-zinc-300 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Página {pageNumber} • Início da Folha
                    </span>
                    {pagesHtml.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePage(pIdx)}
                        className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                        title="Remover esta folha extra"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="h-px bg-zinc-300 flex-1 border-t border-dashed border-zinc-400" />
                </div>
              )}

              {/* Wrapper da Folha com escala responsiva */}
              <div
                style={{
                  width: `${scaledW}px`,
                  height: `${scaledH}px`,
                  position: "relative",
                }}
                className="shrink-0 transition-all shadow-2xl rounded-xs border border-zinc-300 bg-white"
              >
                {/* Folha A4 física em tamanho exato 794x1123 onde a edição acontece DIRETAMENTE */}
                <div
                  className="bg-white text-zinc-900 p-8 sm:p-12 flex flex-col justify-between"
                  style={{
                    width: "794px",
                    height: "1123px",
                    maxHeight: "1123px",
                    overflow: "hidden",
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                  onClick={() => {
                    setActivePageIndex(pIdx);
                    editableRefs.current[pIdx]?.focus();
                  }}
                >
                  {/* TOPO: CABEÇALHO OFICIAL FIXO DA FOLHA */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-6 shrink-0 select-none">
                      <div className="flex items-center gap-3">
                        <img
                          src={LOGO_PROGRAMA_CERTO_BASE64 || "/logo-programa-certo.png"}
                          alt="Logo Gestão Cursos Programa Certo"
                          className="w-10 h-10 rounded-xl object-contain shadow-2xs border border-zinc-200/80 shrink-0"
                        />
                        <div className="flex flex-col justify-center">
                          <h1 className="text-lg font-black text-zinc-900 leading-none">
                            Gestão <span className="text-[#0b439c]">Cursos</span>
                          </h1>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mt-0.5">
                            Programa Certo
                          </span>
                        </div>
                      </div>

                      {/* Badge da Folha */}
                      <div className="px-3 py-1 bg-blue-50 border border-blue-200/80 rounded-lg text-[10px] font-black text-[#0b439c] uppercase tracking-wider">
                        {isFirstPage ? "DOCUMENTO OFICIAL" : `CONTINUAÇÃO • PÁG. ${pageNumber}`}
                      </div>
                    </div>

                    {/* CORPO DO DOCUMENTO: ÁREA EDITÁVEL COM CÓDIGO HTML INTEGRADO */}
                    <div className="w-full flex-1 flex flex-col min-h-0 relative overflow-y-auto overscroll-contain">
                      <div
                        ref={(el) => {
                          editableRefs.current[pIdx] = el;
                          if (el && !el.hasAttribute("data-mounted")) {
                            el.innerHTML = pageHtml;
                            el.setAttribute("data-mounted", "true");
                          }
                        }}
                        data-page-index={pIdx}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={(e) => {
                          const target = e.currentTarget;
                          handlePageHtmlInput(pIdx, target.innerHTML);
                          checkSelectionIsTitle();
                        }}
                        onFocus={() => {
                          setActivePageIndex(pIdx);
                          checkSelectionIsTitle();
                        }}
                        onKeyUp={checkSelectionIsTitle}
                        onMouseUp={checkSelectionIsTitle}
                        className="doc-editable-sheet w-full flex-1 min-h-[300px] outline-none select-text cursor-text"
                        style={{
                          minHeight: sigs.hasAny ? "580px" : "750px",
                        }}
                      />
                    </div>
                  </div>

                  {/* BASE DA FOLHA: ASSINATURAS E RODAPÉ OFICIAL FIXO */}
                  <div className="mt-auto pt-4 shrink-0 select-none">
                    {/* ASSINATURAS DESIGNADAS PARA ESTA PÁGINA */}
                    {sigs.hasAny && (
                      <div className="border border-zinc-300 rounded-xl p-4 bg-white mb-5 shadow-2xs">
                        <div className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-5 text-center">
                          HOMOLOGAÇÃO E ASSINATURAS INSTITUCIONAIS
                        </div>

                        <div className="flex items-end justify-between gap-6 w-full">
                          {/* Assinatura Programa Certo */}
                          {sigs.hasProgramaCerto && (
                            <div className="flex-1 min-w-0 text-center flex flex-col items-center">
                              <div className="flex items-center justify-center gap-1.5 mb-2">
                                <img
                                  src={LOGO_PROGRAMA_CERTO_BASE64 || "/logo-programa-certo.png"}
                                  alt="Logo Gestão Cursos Programa Certo"
                                  className="w-5 h-5 rounded object-contain shrink-0"
                                />
                                <span className="text-xs font-black text-zinc-900 truncate">
                                  Programa <span className="text-[#0b439c]">Certo</span>
                                </span>
                              </div>
                              <div className="w-full border-t border-zinc-800 mb-1.5" />
                              <div className="text-xs font-extrabold text-zinc-900 truncate w-full">
                                Gestor Responsável
                              </div>
                              <div className="text-[10px] text-zinc-500 truncate w-full">
                                Administração Programa Certo
                              </div>
                            </div>
                          )}

                          {/* Assinatura Coordenação */}
                          {sigs.hasCordenacao && (
                            <div className="flex-1 min-w-0 text-center flex flex-col items-center">
                              <div className="h-7" />
                              <div className="w-full border-t border-zinc-800 mb-1.5" />
                              <div className="text-xs font-extrabold text-zinc-900 truncate w-full">
                                Data: ____ / ____ / ________
                              </div>
                              <div className="text-[10px] text-zinc-500 truncate w-full">
                                Visto da Coordenação
                              </div>
                            </div>
                          )}

                          {/* Assinatura Aluno */}
                          {sigs.hasAluno && (
                            <div className="flex-1 min-w-0 text-center flex flex-col items-center">
                              <div className="h-7" />
                              <div className="w-full border-t border-zinc-800 mb-1.5" />
                              <div className="text-xs font-extrabold text-zinc-900 truncate w-full">
                                Assinatura do Aluno
                              </div>
                              <div className="text-[10px] text-zinc-500 truncate w-full">
                                Estudante / Responsável Legal
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* RODAPÉ OFICIAL FIXO DA FOLHA */}
                    <div className="border-t border-zinc-200 pt-2.5 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                      <div>
                        <strong className="text-zinc-700 font-bold">Gestão Cursos Programa Certo</strong>
                      </div>
                      <div className="font-bold text-zinc-600">
                        {totalPagesCount > 1
                          ? `Página ${pageNumber} de ${totalPagesCount}`
                          : "Documento Oficial"}
                      </div>
                      <div>
                        Emitido em: {dataAtual} às {horaAtual}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* BOTÃO DE ADICIONAR NOVA FOLHA: EXCLUSIVAMENTE NO FINAL DO DOCUMENTO */}
        <div className="w-full max-w-[794px] flex justify-center py-6 select-none">
          <button
            type="button"
            onClick={handleAddNewPage}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-blue-50/60 text-[#0b439c] font-black text-xs sm:text-sm rounded-2xl border-2 border-dashed border-blue-200 hover:border-[#0b439c] shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#0b439c]" />
            <span>Adicionar próxima folha, página {totalPagesCount + 1}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
