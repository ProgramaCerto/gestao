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
  Type,
  Plus,
  Minus
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { LOGO_PROGRAMA_CERTO_BASE64 } from "../lib/logoBase64";
import { openDocumentPdfInBrowser, printDocumentInBrowser } from "../lib/generateDocumentPdf";

export interface DocFolder {
  id: string;
  matricula_usuario?: string;
  id_usuario?: string;
  nome: string;
  criado_em: string;
}

export interface DocumentItem {
  id: string;
  matricula_usuario?: string;
  id_usuario?: string;
  pasta_id: string | null; // null = sem pasta / fora de pasta
  titulo: string;
  tamanho_titulo?: string | number;
  estilo_titulo?: "negrito" | "normal";
  alinhamento_titulo?: "center" | "left" | "right";
  conteudo: string;
  tamanho_conteudo?: string | number;
  alinhamento_conteudo?: "justify" | "left" | "center" | "right";
  estilo_conteudo?: string; // Palavras em negrito separadas por vírgula ou 'tudo'
  incluir_assinatura_programa_certo: boolean;
  incluir_assinatura_cordenacao: boolean;
  incluir_campo_assinatura_aluno: boolean;
  status: "rascunho" | "emitido" | "arquivado";
  criado_em: string;
  atualizado_em: string;
}

export function parseFontSize(val: any, defaultVal: number): number {
  if (typeof val === "number" && !isNaN(val) && val > 0) return val;
  if (!val) return defaultVal;
  const num = parseInt(String(val), 10);
  if (!isNaN(num) && num > 0) return num;
  if (val === "pequeno") return Math.max(8, defaultVal - 4);
  if (val === "grande") return defaultVal + 6;
  return defaultVal;
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

/**
 * Componente que renderiza a visualização do documento em formato de impressão.
 * Escala responsivamente para que a folha fique 100% visível em qualquer tamanho de tela
 * (computador ou celular) sem cortar pela metade, mantendo cabeçalho, conteúdo e assinaturas
 * lado a lado idêntico à impressão do PDF.
 */
export function SulfiteDocumentSheet({
  titulo,
  tamanhoTitulo,
  estiloTitulo,
  alinhamentoTitulo,
  conteudo,
  tamanhoConteudo,
  alinhamentoConteudo,
  estiloConteudo,
  incluirAssinaturaProgramaCerto,
  incluirAssinaturaCordenacao,
  incluirCampoAssinaturaAluno,
  dataCriacao,
}: {
  titulo: string;
  tamanhoTitulo: string | number;
  estiloTitulo?: "negrito" | "normal";
  alinhamentoTitulo?: "center" | "left" | "right";
  conteudo: string;
  tamanhoConteudo: string | number;
  alinhamentoConteudo?: "justify" | "left" | "center" | "right";
  estiloConteudo?: string;
  incluirAssinaturaProgramaCerto?: boolean;
  incluirAssinaturaCordenacao?: boolean;
  incluirCampoAssinaturaAluno?: boolean;
  dataCriacao?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [sheetHeight, setSheetHeight] = useState<number>(1123);

  const titleSize = parseFontSize(tamanhoTitulo, 18);
  const contentSize = parseFontSize(tamanhoConteudo, 16);

  const dataAtual = dataCriacao
    ? new Date(dataCriacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const getAlignClass = (align?: string) => {
    if (align === "left") return "text-left";
    if (align === "center") return "text-center";
    if (align === "right") return "text-right";
    return "text-justify";
  };

  useEffect(() => {
    const updateSize = () => {
      if (sheetRef.current) {
        setSheetHeight(Math.max(1123, sheetRef.current.offsetHeight));
      }
      if (containerRef.current) {
        const availableW = containerRef.current.clientWidth;
        // Largura base de 794px (A4 padrão a 96 DPI).
        // Se a tela for menor (ex: celular ou preview dividido), escala suavemente para caber inteira
        // sem ficar cortada na metade e sem barras de rolagem horizontais forçadas.
        const targetScale = Math.min(1, Math.max(0.15, (availableW - 16) / 794));
        setScale(targetScale);
      }
    };

    updateSize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(updateSize);
      ro.observe(containerRef.current);
      if (sheetRef.current) ro.observe(sheetRef.current);
    }

    window.addEventListener("resize", updateSize);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [titulo, conteudo, tamanhoTitulo, tamanhoConteudo, estiloTitulo, estiloConteudo, incluirAssinaturaProgramaCerto, incluirAssinaturaCordenacao, incluirCampoAssinaturaAluno]);

  return (
    <div
      ref={containerRef}
      className="w-full py-4 px-1 sm:px-4 bg-zinc-200/80 rounded-2xl flex justify-center items-start shadow-inner overflow-hidden select-text"
    >
      {/* Wrapper proporcional com as dimensões escaladas exatas para que a página ocupe o espaço correto */}
      <div
        style={{
          width: `${Math.round(794 * scale)}px`,
          height: `${Math.round(sheetHeight * scale)}px`,
          position: "relative",
        }}
        className="shrink-0 transition-all duration-150"
      >
        {/* Folha do documento (794px fixos com scale pura para manter proporções idênticas ao PDF em qualquer tela) */}
        <div
          ref={sheetRef}
          className="bg-white text-zinc-900 shadow-2xl rounded-xs border border-zinc-300 p-8 sm:p-14 flex flex-col justify-between"
          style={{
            width: "794px",
            minHeight: "1123px",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {/* PARTE SUPERIOR DA FOLHA */}
          <div className="flex-1 flex flex-col">
            {/* 1. CABEÇALHO OFICIAL COM LOGO PROGRAMA CERTO */}
            <div className="flex items-center gap-3.5 border-b border-zinc-200 pb-4 mb-8">
              <img
                src={LOGO_PROGRAMA_CERTO_BASE64}
                alt="Logo Programa Certo"
                className="w-12 h-12 rounded-xl object-cover shadow-2xs border border-zinc-200/80 shrink-0"
              />
              <div className="flex flex-col justify-center">
                <h1 className="text-xl font-black text-zinc-900 leading-none">
                  Programa <span className="text-[#0b439c]">Certo</span>
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mt-1">
                  Plataforma Educacional
                </span>
              </div>
            </div>

            {/* 2. TÍTULO DO DOCUMENTO */}
            <h2
              style={{
                fontSize: `${titleSize}px`,
                lineHeight: 1.3,
              }}
              className={`uppercase tracking-wide text-zinc-900 mb-8 ${
                estiloTitulo === "normal" ? "font-semibold" : "font-black"
              } ${getAlignClass(alinhamentoTitulo)}`}
            >
              {titulo.trim() || "(TÍTULO DO DOCUMENTO)"}
            </h2>

            {/* 3. CONTEÚDO DO DOCUMENTO FORMATADO */}
            <div
              style={{
                fontSize: `${contentSize}px`,
                lineHeight: 1.8,
              }}
              className={`text-zinc-800 whitespace-pre-wrap ${getAlignClass(alinhamentoConteudo)}`}
            >
              <RenderFormattedContent
                content={
                  conteudo.trim() ||
                  "Nenhum conteúdo inserido ainda. O texto digitado aparecerá exatamente nesta folha oficial..."
                }
                estiloConteudo={estiloConteudo}
              />
            </div>
          </div>

          {/* PARTE INFERIOR DA FOLHA (SEMPRE NO FINAL DA FOLHA) */}
          <div className="mt-auto pt-6">
            {/* 4. HOMOLOGAÇÃO E ASSINATURAS INSTITUCIONAIS: SEMPRE UMA DO LADO DA OUTRA COMO NO PDF */}
            {(incluirAssinaturaProgramaCerto || incluirAssinaturaCordenacao || incluirCampoAssinaturaAluno) && (
              <div className="border border-zinc-300 rounded-xl p-5 bg-white mb-8">
                <div className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-6">
                  HOMOLOGAÇÃO E ASSINATURAS INSTITUCIONAIS
                </div>

                <div className="flex items-end justify-between gap-6 w-full">
                  {/* Assinatura Programa Certo */}
                  {incluirAssinaturaProgramaCerto && (
                    <div className="flex-1 min-w-0 text-center flex flex-col items-center">
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <img
                          src={LOGO_PROGRAMA_CERTO_BASE64}
                          alt="Logo"
                          className="w-5 h-5 rounded object-cover shrink-0"
                        />
                        <span className="text-xs font-black text-zinc-900 truncate">
                          Programa <span className="text-[#0b439c]">Certo</span>
                        </span>
                      </div>
                      <div className="w-full border-t border-zinc-800 mb-1.5" />
                      <div className="text-xs font-extrabold text-zinc-900 truncate w-full">Gestor Responsável</div>
                      <div className="text-[10px] text-zinc-500 truncate w-full">Administração Programa Certo</div>
                    </div>
                  )}

                  {/* Assinatura Coordenação */}
                  {incluirAssinaturaCordenacao && (
                    <div className="flex-1 min-w-0 text-center flex flex-col items-center">
                      <div className="h-7" />
                      <div className="w-full border-t border-zinc-800 mb-1.5" />
                      <div className="text-xs font-extrabold text-zinc-900 truncate w-full">Data: ____ / ____ / ________</div>
                      <div className="text-[10px] text-zinc-500 truncate w-full">Visto da Coordenação</div>
                    </div>
                  )}

                  {/* Assinatura Aluno */}
                  {incluirCampoAssinaturaAluno && (
                    <div className="flex-1 min-w-0 text-center flex flex-col items-center">
                      <div className="h-7" />
                      <div className="w-full border-t border-zinc-800 mb-1.5" />
                      <div className="text-xs font-extrabold text-zinc-900 truncate w-full">Assinatura do Aluno</div>
                      <div className="text-[10px] text-zinc-500 truncate w-full">Estudante / Responsável Legal</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. RODAPÉ OFICIAL DA FOLHA */}
            <div className="border-t border-zinc-200 pt-3 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
              <div>
                <strong className="text-zinc-600 font-bold">Programa Certo</strong> — Plataforma Educacional
              </div>
              <div>
                Emitido em: {dataAtual} às {horaAtual}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  docTamanhoTitulo: number | string;
  setDocTamanhoTitulo: React.Dispatch<React.SetStateAction<number>>;
  docEstiloTitulo: "negrito" | "normal";
  setDocEstiloTitulo: React.Dispatch<React.SetStateAction<"negrito" | "normal">>;
  docAlinhamentoTitulo: "center" | "left" | "right";
  setDocAlinhamentoTitulo: (val: "center" | "left" | "right") => void;
}) {
  const currentSize = parseFontSize(docTamanhoTitulo, 18);

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label className="block font-bold text-sm text-zinc-800">
          Título do Documento:
        </label>

        {/* Barra de Ferramentas do Título: 1. Tamanho [-] [num] [+], 2. [B], 3. Alinhamento no final */}
        <div className="flex items-center gap-1.5 flex-wrap bg-zinc-100/90 p-1.5 rounded-xl border border-zinc-200 text-xs">
          {/* 1. Tamanho da Fonte com botões [-] e [+] */}
          <div className="inline-flex items-center bg-white rounded-lg border border-zinc-200 shadow-2xs p-0.5">
            <button
              type="button"
              onClick={() => setDocTamanhoTitulo(Math.max(10, currentSize - 1))}
              title="Diminuir tamanho da letra do título"
              className="w-7 h-7 flex items-center justify-center rounded text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 font-black cursor-pointer transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-black text-xs text-zinc-900 min-w-8 text-center select-none">
              {currentSize}
            </span>
            <button
              type="button"
              onClick={() => setDocTamanhoTitulo(Math.min(40, currentSize + 1))}
              title="Aumentar tamanho da letra do título"
              className="w-7 h-7 flex items-center justify-center rounded text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 font-black cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Negrito (B) "bzinho ali do lado" */}
          <button
            type="button"
            onClick={() => setDocEstiloTitulo(docEstiloTitulo === "negrito" ? "normal" : "negrito")}
            title="Alternar Negrito (B) do Título"
            className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer font-black text-xs ${
              docEstiloTitulo === "negrito"
                ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
            }`}
          >
            <Bold className="w-3.5 h-3.5 stroke-[3]" />
          </button>

          {/* 3. Alinhamento no final */}
          <div className="inline-flex items-center rounded-lg bg-white p-0.5 border border-zinc-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setDocAlinhamentoTitulo("left")}
              title="Alinhar à esquerda"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                docAlinhamentoTitulo === "left" ? "bg-[#0b439c] text-white" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDocAlinhamentoTitulo("center")}
              title="Centralizado no meio"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                docAlinhamentoTitulo === "center" ? "bg-[#0b439c] text-white" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDocAlinhamentoTitulo("right")}
              title="Alinhar à direita"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
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
        style={{
          textAlign: docAlinhamentoTitulo,
        }}
        className={`w-full px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-900 focus:outline-none focus:border-[#0b439c] transition-all bg-white uppercase text-base ${
          docEstiloTitulo === "negrito" ? "font-black" : "font-semibold"
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
  docTitulo,
  docTamanhoTitulo,
  docEstiloTitulo,
  docAlinhamentoTitulo,
  incluirAssinaturaProgramaCerto,
  incluirAssinaturaCordenacao,
  incluirCampoAssinaturaAluno,
  textareaRef,
  onToggleBold,
}: {
  docConteudo: string;
  setDocConteudo: (val: string) => void;
  docTamanhoConteudo: number | string;
  setDocTamanhoConteudo: React.Dispatch<React.SetStateAction<number>>;
  docAlinhamentoConteudo: "justify" | "left" | "center" | "right";
  setDocAlinhamentoConteudo: (val: "justify" | "left" | "center" | "right") => void;
  docEstiloConteudo: string;
  docTitulo: string;
  docTamanhoTitulo: number | string;
  docEstiloTitulo: "negrito" | "normal";
  docAlinhamentoTitulo: "center" | "left" | "right";
  incluirAssinaturaProgramaCerto?: boolean;
  incluirAssinaturaCordenacao?: boolean;
  incluirCampoAssinaturaAluno?: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onToggleBold: () => void;
}) {
  const currentContentSize = parseFontSize(docTamanhoConteudo, 16);
  const isAllBold = docEstiloConteudo.trim().toLowerCase() === "tudo";
  const hasBoldWords = !isAllBold && docEstiloConteudo.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <label className="block font-bold text-sm text-zinc-800">
            Conteúdo do Documento:
          </label>

          {/* Barra de Ferramentas do Conteúdo: 1. Tamanho [-] [num] [+], 2. [B], 3. Alinhamento no final */}
          <div className="flex items-center gap-1.5 flex-wrap bg-zinc-100/90 p-1.5 rounded-xl border border-zinc-200 text-xs">
            {/* 1. Tamanho da Fonte com botões [-] e [+] */}
            <div className="inline-flex items-center bg-white rounded-lg border border-zinc-200 shadow-2xs p-0.5">
              <button
                type="button"
                onClick={() => setDocTamanhoConteudo(Math.max(8, currentContentSize - 1))}
                title="Diminuir tamanho da letra do conteúdo"
                className="w-7 h-7 flex items-center justify-center rounded text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 font-black cursor-pointer transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono font-black text-xs text-zinc-900 min-w-8 text-center select-none">
                {currentContentSize}
              </span>
              <button
                type="button"
                onClick={() => setDocTamanhoConteudo(Math.min(32, currentContentSize + 1))}
                title="Aumentar tamanho da letra do conteúdo"
                className="w-7 h-7 flex items-center justify-center rounded text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 font-black cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Negrito (B) "bzinho ali do lado" */}
            <button
              type="button"
              onClick={onToggleBold}
              title="Negrito (B): Se nada estiver selecionado, deixa tudo em negrito. Se selecionar uma palavra ou trecho, aplica na seleção."
              className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer font-black text-xs ${
                isAllBold
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                  : hasBoldWords
                  ? "bg-[#0b439c] text-white border-[#0b439c] shadow-xs"
                  : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              <Bold className="w-3.5 h-3.5 stroke-[3]" />
            </button>

            {/* 3. Alinhamento no final */}
            <div className="inline-flex items-center rounded-lg bg-white p-0.5 border border-zinc-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setDocAlinhamentoConteudo("justify")}
                title="Justificado (alinhado dos dois lados)"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  docAlinhamentoConteudo === "justify" ? "bg-[#0b439c] text-white" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDocAlinhamentoConteudo("left")}
                title="Alinhar à esquerda"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  docAlinhamentoConteudo === "left" ? "bg-[#0b439c] text-white" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDocAlinhamentoConteudo("center")}
                title="Centralizado no meio"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  docAlinhamentoConteudo === "center" ? "bg-[#0b439c] text-white" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDocAlinhamentoConteudo("right")}
                title="Alinhar à direita"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  docAlinhamentoConteudo === "right" ? "bg-[#0b439c] text-white" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          rows={10}
          value={docConteudo}
          onChange={(e) => setDocConteudo(e.target.value)}
          className={`w-full p-4 rounded-xl border border-zinc-300 text-zinc-900 focus:outline-none focus:border-[#0b439c] font-sans text-sm sm:text-base leading-relaxed resize-y bg-zinc-50/40 focus:bg-white ${
            isAllBold ? "font-black" : "font-normal"
          }`}
          placeholder="Digite o texto do documento..."
          required
        />
      </div>

      {/* Pré-visualização do Documento */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#0b439c]" />
            Pré-visualização do Documento
          </span>
        </div>

        <SulfiteDocumentSheet
          titulo={docTitulo}
          tamanhoTitulo={docTamanhoTitulo}
          estiloTitulo={docEstiloTitulo}
          alinhamentoTitulo={docAlinhamentoTitulo}
          conteudo={docConteudo}
          tamanhoConteudo={docTamanhoConteudo}
          alinhamentoConteudo={docAlinhamentoConteudo}
          estiloConteudo={docEstiloConteudo}
          incluirAssinaturaProgramaCerto={incluirAssinaturaProgramaCerto}
          incluirAssinaturaCordenacao={incluirAssinaturaCordenacao}
          incluirCampoAssinaturaAluno={incluirCampoAssinaturaAluno}
        />
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
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainScroll = document.getElementById("main-scroll-container");
      if (mainScroll) {
        mainScroll.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        mainScroll.scrollTop = 0;
      }
      const mainEl = document.querySelector("main");
      if (mainEl) {
        mainEl.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        mainEl.scrollTop = 0;
      }
      const rootEl = document.getElementById("root");
      if (rootEl) {
        rootEl.scrollTop = 0;
      }
    }
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
  const [docTamanhoTitulo, setDocTamanhoTitulo] = useState<number>(18);
  const [docEstiloTitulo, setDocEstiloTitulo] = useState<"negrito" | "normal">("negrito");
  const [docAlinhamentoTitulo, setDocAlinhamentoTitulo] = useState<"center" | "left" | "right">("center");

  const [docPastaId, setDocPastaId] = useState<string | null>(null);
  const [folderInputText, setFolderInputText] = useState("");
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);

  const [docConteudo, setDocConteudo] = useState("");
  const [docTamanhoConteudo, setDocTamanhoConteudo] = useState<number>(16);
  const [docAlinhamentoConteudo, setDocAlinhamentoConteudo] = useState<"justify" | "left" | "center" | "right">("justify");
  const [docEstiloConteudo, setDocEstiloConteudo] = useState<string>("");

  // Aba ativa na tela view_doc: "sheet" (Folha Sulfite oficial) ou "edit" (Formulário de Edição)
  const [viewDocTab, setViewDocTab] = useState<"sheet" | "edit">("sheet");

  const textareaCreateRef = useRef<HTMLTextAreaElement>(null);
  const textareaViewRef = useRef<HTMLTextAreaElement>(null);

  // Manipulação de Negrito (B):
  // Se nada estiver selecionado, "coisa tudo" (alterna entre todo o texto em negrito e normal).
  // Se tiver selecionado uma palavra ou texto, aplica ou remove a seleção.
  const handleToggleBoldContent = (ref: React.RefObject<HTMLTextAreaElement | null>) => {
    const textarea = ref.current;
    let selectedText = "";
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (typeof start === "number" && typeof end === "number" && end > start) {
        selectedText = textarea.value.substring(start, end).trim();
      }
    }

    // 1. Se não tiver nada selecionado: coisa tudo!
    if (!selectedText) {
      if (docEstiloConteudo.trim().toLowerCase() === "tudo") {
        setDocEstiloConteudo("");
        setSyncFeedback("Negrito total desativado.");
      } else {
        setDocEstiloConteudo("tudo");
        setSyncFeedback("Todo o texto configurado em negrito.");
      }
      setTimeout(() => setSyncFeedback(null), 2500);
      return;
    }

    // 2. Se selecionou um trecho ou palavra
    if (docEstiloConteudo.trim().toLowerCase() === "tudo") {
      setDocEstiloConteudo(selectedText);
      setSyncFeedback(`Negrito aplicado em "${selectedText}".`);
      setTimeout(() => setSyncFeedback(null), 2500);
      return;
    }

    const currentWords = docEstiloConteudo
      ? docEstiloConteudo.split(",").map((w) => w.trim()).filter(Boolean)
      : [];

    const existingIndex = currentWords.findIndex(
      (w) => w.toLowerCase() === selectedText.toLowerCase()
    );

    let nextWords: string[];
    if (existingIndex >= 0) {
      nextWords = currentWords.filter((_, idx) => idx !== existingIndex);
      setSyncFeedback(`Negrito removido de "${selectedText}".`);
    } else {
      nextWords = [...currentWords, selectedText];
      setSyncFeedback(`Negrito aplicado em "${selectedText}".`);
    }
    setDocEstiloConteudo(nextWords.join(", "));
    setTimeout(() => setSyncFeedback(null), 2500);
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
    setDocTamanhoTitulo(18);
    setDocEstiloTitulo("negrito");
    setDocAlinhamentoTitulo("center");
    setDocTamanhoConteudo(16);
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
          const resMat = await supabase
            .from("pastas")
            .insert({ nome: nomeLimpo, matricula_usuario: currentUserId })
            .select()
            .single();
          if (!resMat.error && resMat.data) {
            inserted = resMat.data;
            insertErr = null;
          } else {
            const res = await supabase
              .from("pastas")
              .insert({ nome: nomeLimpo, id_usuario: currentUserId })
              .select()
              .single();
            insertErr = res.error;
            inserted = res.data;
          }
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
            const resMat = await supabase
              .from("documentos")
              .insert({ ...payloadWithUser, id_usuario: undefined, matricula_usuario: currentUserId })
              .select()
              .single();
            if (!resMat.error && resMat.data) {
              inserted = resMat.data;
              insertErr = null;
            } else {
              const res = await supabase
                .from("documentos")
                .insert(payloadWithUser)
                .select()
                .single();
              insertErr = res.error;
              inserted = res.data;
            }
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
          const resMat = await supabase
            .from("pastas")
            .insert({ nome: newFolderName.trim(), matricula_usuario: currentUserId })
            .select()
            .single();
          if (!resMat.error && resMat.data) {
            inserted = resMat.data;
            insertErr = null;
          } else {
            const res = await supabase
              .from("pastas")
              .insert({ nome: newFolderName.trim(), id_usuario: currentUserId })
              .select()
              .single();
            insertErr = res.error;
            inserted = res.data;
          }
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
    setDocTamanhoTitulo(parseFontSize(doc.tamanho_titulo, 18));
    setDocEstiloTitulo(doc.estilo_titulo === "normal" ? "normal" : "negrito");
    setDocAlinhamentoTitulo(doc.alinhamento_titulo || "center");
    setDocTamanhoConteudo(parseFontSize(doc.tamanho_conteudo, 16));
    setDocAlinhamentoConteudo(doc.alinhamento_conteudo || "justify");
    setDocEstiloConteudo(doc.estilo_conteudo || "");
    setIncluirAssinaturaProgramaCerto(!!doc.incluir_assinatura_programa_certo);
    setIncluirAssinaturaCordenacao(!!doc.incluir_assinatura_cordenacao);
    setIncluirCampoAssinaturaAluno(!!doc.incluir_campo_assinatura_aluno);
    setViewDocTab("sheet");
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
          tamanho_titulo: d.tamanho_titulo || 18,
          estilo_titulo: d.estilo_titulo || "negrito",
          alinhamento_titulo: d.alinhamento_titulo || "center",
          pasta_id: d.pasta_id || null,
          conteudo: d.conteudo,
          tamanho_conteudo: d.tamanho_conteudo || 16,
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

  // Impressão oficial do documento - Abre direto o painel de impressão, sem abrir nova guia nem página about:blank
  const handlePrintDoc = (doc: DocumentItem) => {
    printDocumentInBrowser(doc);
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

            {/* Conteúdo com Ferramentas, Negrito B na seleção ou total, Alinhamento e Pré-visualização na Folha Sulfite */}
            <DocumentContentEditor
              docConteudo={docConteudo}
              setDocConteudo={setDocConteudo}
              docTamanhoConteudo={docTamanhoConteudo}
              setDocTamanhoConteudo={setDocTamanhoConteudo}
              docAlinhamentoConteudo={docAlinhamentoConteudo}
              setDocAlinhamentoConteudo={setDocAlinhamentoConteudo}
              docEstiloConteudo={docEstiloConteudo}
              docTitulo={docTitulo}
              docTamanhoTitulo={docTamanhoTitulo}
              docEstiloTitulo={docEstiloTitulo}
              docAlinhamentoTitulo={docAlinhamentoTitulo}
              incluirAssinaturaProgramaCerto={incluirAssinaturaProgramaCerto}
              incluirAssinaturaCordenacao={incluirAssinaturaCordenacao}
              incluirCampoAssinaturaAluno={incluirCampoAssinaturaAluno}
              textareaRef={textareaCreateRef}
              onToggleBold={() => handleToggleBoldContent(textareaCreateRef)}
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
          <div className="p-6 border-b border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-50/70">
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
              <h2 className="text-xl font-black text-zinc-900 truncate max-w-xs sm:max-w-md">
                {docTitulo || "Documento"}
              </h2>
            </div>

            {/* Ações: Abrir na Web, Imprimir e Excluir */}
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

          {/* MODO 1: VISUALIZAÇÃO DIRETA DO DOCUMENTO */}
          {viewDocTab === "sheet" ? (
            <div className="p-4 sm:p-8 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#0b439c]" />
                  Pré-visualização do Documento
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewDocTab("edit")}
                    className="px-3.5 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:text-[#0b439c] hover:border-blue-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Editar Documento</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const docObj = documents.find((d) => d.id === editingDocId);
                      if (docObj) handlePrintDoc(docObj);
                    }}
                    className="px-3.5 py-1.5 bg-[#0b439c] text-white hover:bg-blue-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>

              <SulfiteDocumentSheet
                titulo={docTitulo}
                tamanhoTitulo={docTamanhoTitulo}
                estiloTitulo={docEstiloTitulo}
                alinhamentoTitulo={docAlinhamentoTitulo}
                conteudo={docConteudo}
                tamanhoConteudo={docTamanhoConteudo}
                alinhamentoConteudo={docAlinhamentoConteudo}
                estiloConteudo={docEstiloConteudo}
                incluirAssinaturaProgramaCerto={incluirAssinaturaProgramaCerto}
                incluirAssinaturaCordenacao={incluirAssinaturaCordenacao}
                incluirCampoAssinaturaAluno={incluirCampoAssinaturaAluno}
              />
            </div>
          ) : (
            /* MODO 2: FORMULÁRIO DE EDIÇÃO COM FERRAMENTAS E PRÉ-VISUALIZAÇÃO AO VIVO */
            <form onSubmit={handleSaveDocument} className="p-6 sm:p-8 space-y-6">
              {/* Título com Ferramentas: 1. Tamanho [-] [num] [+], 2. [B], 3. Alinhar no final */}
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

              {/* Conteúdo com Ferramentas, Negrito B na seleção ou total, Alinhamento e Folha Sulfite Ao Vivo */}
              <DocumentContentEditor
                docConteudo={docConteudo}
                setDocConteudo={setDocConteudo}
                docTamanhoConteudo={docTamanhoConteudo}
                setDocTamanhoConteudo={setDocTamanhoConteudo}
                docAlinhamentoConteudo={docAlinhamentoConteudo}
                setDocAlinhamentoConteudo={setDocAlinhamentoConteudo}
                docEstiloConteudo={docEstiloConteudo}
                docTitulo={docTitulo}
                docTamanhoTitulo={docTamanhoTitulo}
                docEstiloTitulo={docEstiloTitulo}
                docAlinhamentoTitulo={docAlinhamentoTitulo}
                incluirAssinaturaProgramaCerto={incluirAssinaturaProgramaCerto}
                incluirAssinaturaCordenacao={incluirAssinaturaCordenacao}
                incluirCampoAssinaturaAluno={incluirCampoAssinaturaAluno}
                textareaRef={textareaViewRef}
                onToggleBold={() => handleToggleBoldContent(textareaViewRef)}
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
          )}
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
                          onClick={() => handleOpenDocView(doc)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-[#0b439c] text-[#0b439c] hover:text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs border border-blue-200"
                          title="Abrir Pré-visualização do Documento"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Pré-visualizar</span>
                        </button>

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
