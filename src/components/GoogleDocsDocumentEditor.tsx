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
  Sparkles
} from "lucide-react";
import { DocumentItem, DocFolder, parseFontSize } from "./DocumentosManager";
import { LOGO_PROGRAMA_CERTO_BASE64 } from "../lib/logoBase64";
import { openDocumentPdfInBrowser, printDocumentInBrowser } from "../lib/generateDocumentPdf";

export interface GoogleDocsDocumentEditorProps {
  initialDoc: DocumentItem;
  allFolders: DocFolder[];
  onSave: (updatedDoc: DocumentItem) => Promise<void>;
  onBack: () => void;
  onDelete?: (docId: string) => void;
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

export interface PageSlice {
  pageNumber: number;
  text: string;
  maxLines: number;
  usedLines: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  signatures: {
    hasProgramaCerto: boolean;
    hasCordenacao: boolean;
    hasAluno: boolean;
    hasAny: boolean;
    count: number;
  };
}

/**
 * Motor de paginação automática A4 baseado na capacidade física da folha e tamanho da fonte.
 * Cada página suporta uma quantidade estrita de linhas. Se o texto ultrapassar, corta e passa para a próxima folha.
 */
export function paginateDocument(
  fullText: string,
  docTamanhoConteudo: number,
  docTamanhoTitulo: number,
  docTitulo: string,
  exibirTituloNoDoc: boolean,
  docItem: {
    incluir_assinatura_programa_certo?: boolean;
    paginas_assinatura_programa_certo?: string;
    incluir_assinatura_cordenacao?: boolean;
    paginas_assinatura_cordenacao?: string;
    incluir_campo_assinatura_aluno?: boolean;
    incluir_assinatura_aluno?: boolean;
    paginas_assinatura_aluno?: string;
  },
  minPages: number = 1
): PageSlice[] {
  const contentLineHeight = Math.max(16, docTamanhoConteudo * 1.6);
  // Quantidade de caracteres que cabem por linha na folha A4 (largura útil ~670px)
  const charsPerLine = Math.max(20, Math.floor(670 / (docTamanhoConteudo * 0.54)));

  // Altura ocupada pelo título na Página 1
  const titleCharsPerLine = Math.max(15, Math.floor(670 / (docTamanhoTitulo * 0.58)));
  const titleLines = exibirTituloNoDoc
    ? Math.max(1, Math.ceil(((docTitulo || " ").trim().length || 1) / titleCharsPerLine))
    : 0;
  const titleHeight = exibirTituloNoDoc ? (titleLines * docTamanhoTitulo * 1.35) + 32 : 0;

  // Altura útil padrão de uma folha A4 (1123px total - margens - cabeçalho - rodapé)
  const BASE_USABLE_H = 880;
  const SIGN_BOX_HEIGHT = 150;

  const getMaxLinesForPage = (pageNum: number, totalPagesEst: number) => {
    const sigs = getActiveSignaturesForPage(docItem, pageNum, totalPagesEst);
    let usableH = BASE_USABLE_H;
    if (pageNum === 1) {
      usableH -= titleHeight;
    }
    if (sigs.hasAny) {
      usableH -= SIGN_BOX_HEIGHT;
    }
    return Math.max(3, Math.floor(usableH / contentLineHeight));
  };

  // Se o texto tiver quebras manuais de formulário \f, respeitamos
  const sections = fullText.split(/\f/);
  const buckets: { paragraphs: string[]; maxLines: number; usedLines: number }[] = [];

  sections.forEach((section) => {
    const rawParagraphs = section.split("\n");
    let curPageIndex = buckets.length;
    let maxLines = getMaxLinesForPage(curPageIndex + 1, curPageIndex + 1);
    buckets.push({ paragraphs: [], maxLines, usedLines: 0 });

    for (let i = 0; i < rawParagraphs.length; i++) {
      const para = rawParagraphs[i];
      // Linha em branco (Enter avulso) ocupa exatamente 1 linha física
      const paraLines = para === "" ? 1 : Math.max(1, Math.ceil(para.length / charsPerLine));

      let currentBucket = buckets[curPageIndex];
      currentBucket.maxLines = getMaxLinesForPage(curPageIndex + 1, curPageIndex + 1);

      if (currentBucket.usedLines + paraLines <= currentBucket.maxLines) {
        currentBucket.paragraphs.push(para);
        currentBucket.usedLines += paraLines;
      } else {
        // Não cabe inteiro na folha atual
        const remainingLines = currentBucket.maxLines - currentBucket.usedLines;

        // Se o parágrafo for longo e puder ser fatiado entre páginas
        if (remainingLines >= 1 && para.length > charsPerLine && para !== "") {
          const splitChars = remainingLines * charsPerLine;
          let breakIdx = para.lastIndexOf(" ", splitChars);
          if (breakIdx <= splitChars * 0.4) breakIdx = splitChars;
          const p1 = para.slice(0, breakIdx).trimEnd();
          const p2 = para.slice(breakIdx).trimStart();

          currentBucket.paragraphs.push(p1);
          currentBucket.usedLines += Math.max(1, Math.ceil(p1.length / charsPerLine));

          curPageIndex++;
          maxLines = getMaxLinesForPage(curPageIndex + 1, curPageIndex + 1);
          const p2Lines = Math.max(1, Math.ceil(p2.length / charsPerLine));
          buckets.push({ paragraphs: [p2], maxLines, usedLines: p2Lines });
        } else {
          // Se já tem conteúdo na folha, avança para a próxima folha
          if (currentBucket.paragraphs.length > 0) {
            curPageIndex++;
            maxLines = getMaxLinesForPage(curPageIndex + 1, curPageIndex + 1);
            buckets.push({ paragraphs: [para], maxLines, usedLines: paraLines });
          } else {
            // Se a folha estiver vazia, adiciona mesmo que exceda
            currentBucket.paragraphs.push(para);
            currentBucket.usedLines += paraLines;
          }
        }
      }
    }
  });

  // Garante o número mínimo de páginas solicitadas pelo usuário
  while (buckets.length < minPages) {
    const nextIdx = buckets.length;
    buckets.push({
      paragraphs: [""],
      maxLines: getMaxLinesForPage(nextIdx + 1, nextIdx + 1),
      usedLines: 0,
    });
  }

  const totalPages = buckets.length;
  return buckets.map((bucket, idx) => {
    const pageNumber = idx + 1;
    const sigs = getActiveSignaturesForPage(docItem, pageNumber, totalPages);
    return {
      pageNumber,
      text: bucket.paragraphs.join("\n"),
      maxLines: bucket.maxLines,
      usedLines: bucket.usedLines,
      isFirstPage: idx === 0,
      isLastPage: idx === totalPages - 1,
      signatures: sigs,
    };
  });
}

export function GoogleDocsDocumentEditor({
  initialDoc,
  allFolders,
  onSave,
  onBack,
  onDelete,
}: GoogleDocsDocumentEditorProps) {
  // Estado do Documento
  const [docTitulo, setDocTitulo] = useState(initialDoc.titulo || "Documento sem título");
  const [docPastaId, setDocPastaId] = useState<string | null>(initialDoc.pasta_id || null);

  // Texto consolidado do documento
  const [docConteudo, setDocConteudo] = useState<string>(initialDoc.conteudo ?? "");
  const [minPagesCount, setMinPagesCount] = useState<number>(() => {
    const raw = initialDoc.conteudo ?? "";
    const fParts = raw.split(/\f/).length;
    return Math.max(1, fParts);
  });

  // Definições de Título
  const [docTamanhoTitulo, setDocTamanhoTitulo] = useState<number>(
    parseFontSize(initialDoc.tamanho_titulo, 18)
  );
  const [docEstiloTitulo, setDocEstiloTitulo] = useState<"negrito" | "normal">(
    initialDoc.estilo_titulo === "normal" ? "normal" : "negrito"
  );
  const [docAlinhamentoTitulo, setDocAlinhamentoTitulo] = useState<"center" | "left" | "right">(
    initialDoc.alinhamento_titulo || "center"
  );
  const [exibirTituloNoDoc, setExibirTituloNoDoc] = useState(true);

  // Definições de Conteúdo
  const [docTamanhoConteudo, setDocTamanhoConteudo] = useState<number>(
    parseFontSize(initialDoc.tamanho_conteudo, 16)
  );
  const [docAlinhamentoConteudo, setDocAlinhamentoConteudo] = useState<
    "justify" | "left" | "center" | "right"
  >(initialDoc.alinhamento_conteudo || "justify");
  const [docEstiloConteudo, setDocEstiloConteudo] = useState<string>(
    initialDoc.estilo_conteudo || ""
  );

  // Assinaturas e suas Páginas
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

  // Modal / Popover de Assinaturas (agora abrindo para a direita)
  const [isSignaturesPanelOpen, setIsSignaturesPanelOpen] = useState(false);

  // Status de salvamento e feedback
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Página ativa e referências
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);

  // Cálculo da altura de linha e capacidade por caractere
  const contentLineHeight = useMemo(() => {
    return Math.max(16, docTamanhoConteudo * 1.6);
  }, [docTamanhoConteudo]);

  // Paginação automática A4 rigorosa respeitando o limite físico de cada folha
  const pages: PageSlice[] = useMemo(() => {
    return paginateDocument(
      docConteudo,
      docTamanhoConteudo,
      docTamanhoTitulo,
      docTitulo,
      exibirTituloNoDoc,
      {
        incluir_assinatura_programa_certo: incluirAssinaturaProgramaCerto,
        paginas_assinatura_programa_certo: paginasProgramaCerto,
        incluir_assinatura_cordenacao: incluirAssinaturaCordenacao,
        paginas_assinatura_cordenacao: paginasCordenacao,
        incluir_campo_assinatura_aluno: incluirAssinaturaAluno,
        incluir_assinatura_aluno: incluirAssinaturaAluno,
        paginas_assinatura_aluno: paginasAluno,
      },
      minPagesCount
    );
  }, [
    docConteudo,
    docTamanhoConteudo,
    docTamanhoTitulo,
    docTitulo,
    exibirTituloNoDoc,
    incluirAssinaturaProgramaCerto,
    paginasProgramaCerto,
    incluirAssinaturaCordenacao,
    paginasCordenacao,
    incluirAssinaturaAluno,
    paginasAluno,
    minPagesCount,
  ]);

  // Rastreia modificações
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [
    docTitulo,
    docPastaId,
    docConteudo,
    docTamanhoTitulo,
    docEstiloTitulo,
    docAlinhamentoTitulo,
    exibirTituloNoDoc,
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

  // Objeto do Documento atualizado
  const currentDocItem: DocumentItem = useMemo(() => {
    return {
      ...initialDoc,
      titulo: docTitulo,
      tamanho_titulo: docTamanhoTitulo,
      estilo_titulo: docEstiloTitulo,
      alinhamento_titulo: docAlinhamentoTitulo,
      pasta_id: docPastaId,
      conteudo: docConteudo,
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
    docConteudo,
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

  // Atualiza o texto quando digitado em uma folha específica
  const handlePageChange = (pageIdx: number, newPageText: string) => {
    // Recombina os textos de todas as páginas e atualiza docConteudo
    const pageTexts = pages.map((p, idx) => (idx === pageIdx ? newPageText : p.text));
    const combined = pageTexts.join("\n");
    setDocConteudo(combined);
  };

  // Teclas especiais para navegação e quebra fluida entre páginas (Google Docs)
  const handleKeyDown = (pageIdx: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRefs.current[pageIdx];
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;

    // Quando pressiona Enter no final da página que já atingiu o limite:
    if (e.key === "Enter" && !e.shiftKey) {
      const charsPerLine = Math.max(20, Math.floor(670 / (docTamanhoConteudo * 0.54)));
      const lines = value.split("\n").reduce((acc, p) => acc + (p === "" ? 1 : Math.max(1, Math.ceil(p.length / charsPerLine))), 0);
      const currentPageSlice = pages[pageIdx];

      if (currentPageSlice && lines >= currentPageSlice.maxLines) {
        // Se a página já está no seu limite máximo de linhas, o próximo Enter avança para a próxima folha
        e.preventDefault();
        const before = value.slice(0, selectionStart);
        const after = value.slice(selectionEnd);
        
        // Atualiza páginas
        const pageTexts = pages.map((p, idx) => (idx === pageIdx ? before : p.text));
        if (pageIdx + 1 < pageTexts.length) {
          pageTexts[pageIdx + 1] = after ? `\n${after}` : `\n${pageTexts[pageIdx + 1]}`;
        } else {
          pageTexts.push(after || "");
          setMinPagesCount((prev) => Math.max(prev, pageIdx + 2));
        }

        setDocConteudo(pageTexts.join("\n"));
        setActivePageIndex(pageIdx + 1);

        setTimeout(() => {
          const nextTextarea = textareaRefs.current[pageIdx + 1];
          if (nextTextarea) {
            nextTextarea.focus();
            nextTextarea.setSelectionRange(0, 0);
          }
        }, 50);
        return;
      }
    }

    // Quando pressiona Backspace no começo da página (posição 0):
    if (e.key === "Backspace" && selectionStart === 0 && selectionEnd === 0 && pageIdx > 0) {
      e.preventDefault();
      const prevTextarea = textareaRefs.current[pageIdx - 1];
      if (prevTextarea) {
        const prevLen = prevTextarea.value.length;
        // Foca no final da folha anterior
        prevTextarea.focus();
        prevTextarea.setSelectionRange(prevLen, prevLen);
      }
    }

    // Setas para navegar entre folhas
    if (e.key === "ArrowDown" && selectionStart === value.length && pageIdx < pages.length - 1) {
      const nextTextarea = textareaRefs.current[pageIdx + 1];
      if (nextTextarea) {
        nextTextarea.focus();
        nextTextarea.setSelectionRange(0, 0);
      }
    } else if (e.key === "ArrowUp" && selectionStart === 0 && pageIdx > 0) {
      const prevTextarea = textareaRefs.current[pageIdx - 1];
      if (prevTextarea) {
        prevTextarea.focus();
        const prevLen = prevTextarea.value.length;
        prevTextarea.setSelectionRange(prevLen, prevLen);
      }
    }
  };

  // Adicionar Página explicitamente (pelo cabeçalho ou pelo rodapé final)
  const handleAddNewPage = () => {
    setMinPagesCount((prev) => Math.max(prev + 1, pages.length + 1));
    setDocConteudo((prev) => (prev ? `${prev}\n\n` : "\n"));
    const newIdx = pages.length;
    setActivePageIndex(newIdx);
    setFeedbackToast(`Nova Folha A4 adicionada!`);
    setTimeout(() => {
      setFeedbackToast(null);
      textareaRefs.current[newIdx]?.focus();
    }, 600);
  };

  // Salvar Documento
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(currentDocItem);
      setHasUnsavedChanges(false);
      const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setLastSavedTime(timeStr);
      setFeedbackToast("Documento salvo com sucesso!");
      setTimeout(() => setFeedbackToast(null), 3000);
    } catch (err) {
      console.error("Erro ao salvar documento:", err);
      setFeedbackToast("Erro ao salvar documento.");
      setTimeout(() => setFeedbackToast(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Botão Voltar para Documentos
  const handleBackAction = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
    } else {
      onBack();
    }
  };

  // 1. AÇÃO ESPECIAL: Mudar texto selecionado para o tipo TÍTULO
  const handleSetSelectedAsTitle = () => {
    const el = textareaRefs.current[activePageIndex] || textareaRefs.current[0];
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = el.value.substring(start, end).trim();

    if (selectedText) {
      setDocTitulo(selectedText);
      setExibirTituloNoDoc(true);
      setFeedbackToast(`Título definido como: "${selectedText}"`);
      setTimeout(() => setFeedbackToast(null), 3000);
    } else {
      setFeedbackToast("Selecione um trecho de texto no documento para definir como título.");
      setTimeout(() => setFeedbackToast(null), 3500);
    }
  };

  // 2. AÇÃO DE NEGRITO (B) no Conteúdo: se há seleção, negrita as palavras; se não há, alterna tudo
  const handleToggleBoldContent = () => {
    const el = textareaRefs.current[activePageIndex] || textareaRefs.current[0];
    if (!el) {
      setDocEstiloConteudo((prev) => (prev.trim() === "tudo" ? "" : "tudo"));
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = el.value.substring(start, end).trim();

    if (!selectedText) {
      setDocEstiloConteudo((prev) => (prev.trim() === "tudo" ? "" : "tudo"));
      setFeedbackToast(docEstiloConteudo === "tudo" ? "Texto normal" : "Texto todo em negrito");
      setTimeout(() => setFeedbackToast(null), 2000);
      return;
    }

    const currentWords = docEstiloConteudo
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w && w !== "tudo");
    const exists = currentWords.some((w) => w.toLowerCase() === selectedText.toLowerCase());

    let nextWords: string[];
    if (exists) {
      nextWords = currentWords.filter((w) => w.toLowerCase() !== selectedText.toLowerCase());
      setFeedbackToast(`Negrito removido de: "${selectedText}"`);
    } else {
      nextWords = [...currentWords, selectedText];
      setFeedbackToast(`Negrito aplicado em: "${selectedText}"`);
    }
    setDocEstiloConteudo(nextWords.join(", "));
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  const getAlignClass = (align?: string) => {
    if (align === "left") return "text-left";
    if (align === "center") return "text-center";
    if (align === "right") return "text-right";
    return "text-justify";
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

  const totalPagesCount = pages.length;

  return (
    <div className="min-h-screen bg-[#eaedf1] text-zinc-900 flex flex-col font-sans select-text">
      {/* ========================================================================= */}
      {/* 1. BARRA SUPERIOR (HEADER RESPONSIVO COM IDENTIDADE GESTÃO CURSOS)        */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-zinc-200 px-3 sm:px-6 py-2.5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 sm:gap-3">
        {/* Linha 1 no Mobile: Logo + Voltar + Nome do Documento */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full md:w-auto flex-1">
          {/* Logo Gestão Cursos Programa Certo */}
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
            <span className="hidden sm:inline">Voltar para Documentos</span>
            <span className="sm:hidden">Voltar</span>
          </button>

          {/* Nome do Documento (Input editável inline no topo) */}
          <div className="flex items-center gap-2 min-w-0 flex-1 max-w-md">
            <input
              type="text"
              value={docTitulo}
              onChange={(e) => setDocTitulo(e.target.value)}
              placeholder="Nome do documento..."
              className="w-full text-xs sm:text-sm font-black text-zinc-900 bg-transparent hover:bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-blue-500/30 px-2 py-1 rounded-lg border border-transparent hover:border-zinc-300 focus:border-[#0b439c] outline-none transition-all truncate"
              title="Clique para alterar o nome do documento"
            />
          </div>

          {/* Status de Salvamento no Desktop */}
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
        </div>

        {/* Linha 2 no Mobile (muda para baixo com espaço limpo): Ações */}
        <div className="flex items-center gap-2 justify-between sm:justify-end w-full md:w-auto shrink-0 pt-1.5 md:pt-0 border-t border-zinc-100 md:border-0 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => openDocumentPdfInBrowser(currentDocItem)}
              className="px-2.5 sm:px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-200"
              title="Abrir PDF na Web"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#0b439c]" />
              <span className="hidden sm:inline">Abrir na Web</span>
            </button>

            <button
              type="button"
              onClick={() => printDocumentInBrowser(currentDocItem)}
              className="px-2.5 sm:px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-200"
              title="Imprimir documento oficial"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-700" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 sm:px-4 py-1.5 bg-[#0b439c] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-900/15 cursor-pointer disabled:opacity-50"
              title="Salvar alterações no documento"
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
      {/* 2. BARRA DE FERRAMENTAS (TOOLBAR: TÍTULO, DOCUMENTO, ADICIONAR PÁGINA)    */}
      {/* ========================================================================= */}
      <div className="sticky top-[80px] md:top-[53px] z-30 bg-[#f8fafc] border-b border-zinc-200 px-3 sm:px-6 py-2 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {/* SEÇÃO 1: DEFINIÇÕES PARA TÍTULO */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-zinc-200 shadow-2xs flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0b439c] bg-blue-50 px-2 py-1 rounded-md border border-blue-200 select-none">
              Definições para Título
            </span>

            {/* Botão: Mudar texto selecionado para o tipo título */}
            <button
              type="button"
              onClick={handleSetSelectedAsTitle}
              className="px-2 py-1 text-xs font-bold text-zinc-700 hover:text-[#0b439c] hover:bg-blue-50/80 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-zinc-200"
              title="Mudar o texto selecionado na folha para o título do documento"
            >
              <Heading className="w-3.5 h-3.5 text-[#0b439c]" />
              <span className="hidden sm:inline text-[11px]">Mudar selecionado para Título</span>
            </button>

            {/* Tamanho da Fonte do Título [-] [num] [+] */}
            <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setDocTamanhoTitulo((prev) => Math.max(10, prev - 1))}
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
              title="Alternar negrito no título"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* Alinhamento do Título */}
            <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setDocAlinhamentoTitulo("left")}
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
                onClick={() => setDocAlinhamentoTitulo("center")}
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
                onClick={() => setDocAlinhamentoTitulo("right")}
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
              onClick={handleToggleBoldContent}
              className={`w-6 h-6 flex items-center justify-center rounded-lg font-black text-xs transition-colors cursor-pointer ${
                docEstiloConteudo
                  ? "bg-[#0b439c] text-white shadow-xs"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
              title="Negrito na seleção ou texto inteiro"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* Alinhamento do Conteúdo */}
            <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setDocAlinhamentoConteudo("left")}
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
                onClick={() => setDocAlinhamentoConteudo("center")}
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
                onClick={() => setDocAlinhamentoConteudo("right")}
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
                onClick={() => setDocAlinhamentoConteudo("justify")}
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

        {/* SEÇÃO 3: ADICIONAR PÁGINA NO CABEÇALHO & ASSINATURAS */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Adicionar Página aqui no cabeçalho conforme solicitado */}
          <button
            type="button"
            onClick={handleAddNewPage}
            className="px-2.5 py-1.5 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Adicionar uma nova página A4 ao documento"
          >
            <Plus className="w-3.5 h-3.5 text-[#0b439c]" />
            <span>Adicionar Página</span>
          </button>

          {/* BOTÃO DE ASSINATURAS EM PÁGINAS COM POPOVER ABRINDO PARA A DIREITA */}
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

            {/* PAINEL FLUTUANTE DE CONFIGURAÇÃO DE ASSINATURAS (ABRE PARA A DIREITA: left-0) */}
            {isSignaturesPanelOpen && (
              <>
                {/* Backdrop para fechar ao clicar fora em telas de toque */}
                <div
                  className="fixed inset-0 z-40 bg-black/10 sm:bg-transparent"
                  onClick={() => setIsSignaturesPanelOpen(false)}
                />

                <div className="absolute left-0 top-full mt-2 w-[calc(100vw-32px)] max-w-sm sm:w-96 bg-white border border-zinc-200 rounded-2xl shadow-2xl p-4 z-50 space-y-4 animate-in fade-in zoom-in-95 duration-150">
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

      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ÁREA DAS FOLHAS A4 (EDIÇÃO DIRETA COM CORTE DE PÁGINAS AUTOMÁTICO)     */}
      {/* ========================================================================= */}
      <main
        ref={containerRef}
        className="flex-1 py-8 px-2 sm:px-6 flex flex-col items-center overflow-y-auto space-y-8 select-text"
      >
        {pages.map((page, pIdx) => {
          const pageNumber = page.pageNumber;
          const isFirstPage = page.isFirstPage;
          const isLastPage = page.isLastPage;
          const sigs = page.signatures;

          const scaledW = Math.round(794 * scale);
          const scaledH = Math.round(1123 * scale);

          return (
            <React.Fragment key={pageNumber}>
              {/* Linha divisória de corte de página limpa (SEM BOTÕES NO MEIO) */}
              {pIdx > 0 && (
                <div className="w-full max-w-[794px] flex items-center justify-center gap-3 py-1 select-none">
                  <div className="h-px bg-zinc-300 flex-1 border-t border-dashed border-zinc-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-white px-3 py-1 rounded-full border border-zinc-300 shadow-2xs">
                    Página {pageNumber} • Início da Folha
                  </span>
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
                    textareaRefs.current[pIdx]?.focus();
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

                    {/* TÍTULO EDITÁVEL DIRETAMENTE NA FOLHA 1 */}
                    {isFirstPage && exibirTituloNoDoc && (
                      <div className="mb-6 shrink-0">
                        <input
                          type="text"
                          value={docTitulo}
                          onChange={(e) => setDocTitulo(e.target.value)}
                          placeholder="CLIQUE PARA DIGITAR O TÍTULO DO DOCUMENTO..."
                          style={{
                            fontSize: `${docTamanhoTitulo}px`,
                            lineHeight: 1.3,
                            fontFamily: "Arial, Helvetica, sans-serif",
                          }}
                          className={`w-full bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-[#0b439c] focus:bg-blue-50/20 px-1 py-0.5 outline-none uppercase tracking-wide text-zinc-900 transition-colors ${
                            docEstiloTitulo === "normal" ? "font-semibold" : "font-black"
                          } ${getAlignClass(docAlinhamentoTitulo)}`}
                          title="Clique diretamente aqui para editar o título deste documento"
                        />
                      </div>
                    )}

                    {/* CORPO DO DOCUMENTO: ÁREA COM CAPACIDADE ESTATUTÁRIA RIGOROSA */}
                    <div
                      style={{
                        height: `${page.maxLines * contentLineHeight}px`,
                        maxHeight: `${page.maxLines * contentLineHeight}px`,
                      }}
                      className="w-full flex-1 flex flex-col min-h-0 relative overflow-hidden"
                    >
                      <textarea
                        ref={(el) => {
                          textareaRefs.current[pIdx] = el;
                        }}
                        value={page.text}
                        onChange={(e) => handlePageChange(pIdx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(pIdx, e)}
                        onFocus={() => setActivePageIndex(pIdx)}
                        placeholder={
                          isFirstPage
                            ? "Clique aqui para começar a digitar o conteúdo do documento diretamente na folha... O texto é cortado e avança automaticamente para a próxima folha quando o limite da página é atingido."
                            : `Conteúdo contínuo na Folha ${pageNumber}...`
                        }
                        style={{
                          fontSize: `${docTamanhoConteudo}px`,
                          lineHeight: `${contentLineHeight}px`,
                          fontFamily: "Arial, Helvetica, sans-serif",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontWeight: docEstiloConteudo === "tudo" ? 700 : 400,
                          height: `${page.maxLines * contentLineHeight}px`,
                          maxHeight: `${page.maxLines * contentLineHeight}px`,
                        }}
                        className={`w-full flex-1 bg-transparent border-none outline-none resize-none text-zinc-900 placeholder:text-zinc-400 focus:ring-0 overflow-hidden ${getAlignClass(
                          docAlinhamentoConteudo
                        )}`}
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

        {/* ÚNICO BOTÃO DE ADICIONAR NOVA FOLHA: EXCLUSIVAMENTE NO FINAL DO DOCUMENTO */}
        <div className="w-full max-w-[794px] flex justify-center py-4 select-none">
          <button
            type="button"
            onClick={handleAddNewPage}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-50 text-[#0b439c] font-black text-xs rounded-xl border border-zinc-300 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Próxima Folha A4 (Página {totalPagesCount + 1})</span>
          </button>
        </div>
      </main>
    </div>
  );
}
