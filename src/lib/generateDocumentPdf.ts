import * as jspdfLib from "jspdf";
import { DocumentItem } from "../components/DocumentosManager";
import { LOGO_PROGRAMA_CERTO_BASE64 } from "./logoBase64";

const JsPdfClass: any = (jspdfLib as any).jsPDF || (jspdfLib as any).default || jspdfLib;

export interface DocContentBlock {
  type: "heading" | "paragraph" | "blank" | "pagebreak";
  text: string;
  isBold?: boolean;
  align?: "left" | "center" | "right" | "justify";
}

/**
 * Converte o conteúdo HTML ou texto do documento em blocos estruturados
 * para desenho tipográfico no PDF, garantindo que NENHUMA tag HTML (<p>, <h2>, etc)
 * seja exposta na impressão ou no PDF gerado.
 */
export function parseDocContentBlocks(
  content: string,
  defaultContentAlign: "left" | "center" | "right" | "justify" = "justify",
  defaultTitleAlign: "left" | "center" | "right" = "center"
): DocContentBlock[] {
  if (!content) return [];

  // Se não contém HTML, trata como texto simples legado
  if (!content.includes("<") && !content.includes(">")) {
    const rawLines = content.split("\n");
    const blocks: DocContentBlock[] = [];
    for (const line of rawLines) {
      if (line.includes("\f")) {
        blocks.push({ type: "pagebreak", text: "" });
      } else if (!line.trim()) {
        blocks.push({ type: "blank", text: "" });
      } else {
        blocks.push({
          type: "paragraph",
          text: line,
          align: defaultContentAlign,
        });
      }
    }
    return blocks;
  }

  // Se estiver no navegador, usa o DOM para parseamento perfeito
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    // Normaliza quebras manuais legadas \f
    const normalized = content.split("\f").join('<div class="page-break"></div>');
    div.innerHTML = normalized;

    const blocks: DocContentBlock[] = [];

    const walk = (node: Node) => {
      if (node.nodeType === Node.COMMENT_NODE) {
        const commentTxt = (node.textContent || "").toLowerCase();
        if (commentTxt.includes("page_break") || commentTxt.includes("pagebreak")) {
          blocks.push({ type: "pagebreak", text: "" });
        }
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        // Quebra de página
        if (
          tag === "hr" ||
          el.classList.contains("page-break") ||
          el.dataset.pageBreak === "true" ||
          el.style.pageBreakAfter === "always"
        ) {
          blocks.push({ type: "pagebreak", text: "" });
          return;
        }

        // Título / Heading
        if (tag === "h1" || tag === "h2" || tag === "h3" || el.classList.contains("doc-title")) {
          const txt = (el.textContent || "").trim();
          if (txt) {
            let align: any = defaultTitleAlign;
            if (el.style.textAlign) align = el.style.textAlign;
            blocks.push({
              type: "heading",
              text: txt,
              isBold: true,
              align,
            });
          }
          return;
        }

        // Parágrafo ou bloco de texto
        if (tag === "p" || tag === "div" || tag === "blockquote" || tag === "li") {
          const innerTxt = el.textContent || "";
          if (!innerTxt.trim()) {
            blocks.push({ type: "blank", text: "" });
          } else {
            let align: any = defaultContentAlign;
            if (el.style.textAlign) align = el.style.textAlign;
            const isBold =
              el.style.fontWeight === "bold" ||
              parseInt(el.style.fontWeight, 10) >= 600 ||
              el.querySelector("b, strong") !== null;
            blocks.push({
              type: "paragraph",
              text: innerTxt.replace(/\u00a0/g, " "), // Converte &nbsp; em espaço normal
              isBold,
              align,
            });
          }
          return;
        }

        // Se for outro elemento de bloco ou container
        if (el.childNodes.length > 0) {
          el.childNodes.forEach(walk);
          return;
        }
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const txt = (node.textContent || "").replace(/\u00a0/g, " ");
        if (txt.trim()) {
          blocks.push({
            type: "paragraph",
            text: txt,
            align: defaultContentAlign,
          });
        }
      }
    };

    div.childNodes.forEach(walk);
    return blocks;
  }

  // Fallback seguro via regex caso sem DOM
  const blocks: DocContentBlock[] = [];
  const parts = content.split(/(<\/p>|<\/div>|<\/h[1-6]>|<br\s*[\/]?>)/gi);
  for (const part of parts) {
    const clean = part.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    if (!clean) continue;
    const isHeading = /<h[1-6]|class=["']doc-title["']/i.test(part);
    blocks.push({
      type: isHeading ? "heading" : "paragraph",
      text: clean,
      isBold: isHeading,
      align: isHeading ? defaultTitleAlign : defaultContentAlign,
    });
  }
  return blocks;
}

/**
 * Constrói e formata um documento em PDF de alta resolução
 * no mesmo esquema da Central de Atendimento (jsPDF profissional),
 * dividindo em múltiplas páginas se o texto for grande,
 * preservando cabeçalho limpo, chancelas e rodapé.
 */
export function buildDocumentPdfDoc(docItem: DocumentItem): any {
  const doc = new JsPdfClass({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 18;
  const contentWidth = pageWidth - margin * 2; // 174mm
  const rightX = margin + contentWidth;
  const footerY = 278;
  const maxContentY = 270;
  const lineHeight = 5.2;

  const now = new Date();
  const dataAtual = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const horaAtual = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const cleanTitle = (docItem.titulo || "Documento").trim() || "Documento";

  doc.setProperties({
    title: cleanTitle,
    subject: `Documento Oficial - ${cleanTitle}`,
    author: "Programa Certo",
    keywords: "Programa Certo, Documento, Certificado, Declaração",
    creator: "Programa Certo"
  });

  const pageNumbers: number[] = [1];

  // 1. Cabeçalho Oficial Idêntico ao Atendimento
  const drawHeader = (pageIdx: number): number => {
    let curY = 18;

    try {
      doc.addImage(LOGO_PROGRAMA_CERTO_BASE64, "PNG", margin, curY, 14, 14);
    } catch {
      doc.setFillColor(11, 67, 156);
      doc.roundedRect(margin, curY, 14, 14, 3, 3, "F");
    }

    doc.setFontSize(14);
    doc.setTextColor(11, 67, 156);
    doc.setFont("helvetica", "bold");
    doc.text("Gestão Cursos", margin + 17, curY + 6);

    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("PROGRAMA CERTO", margin + 17, curY + 11.5);

    // Lado Direito: Badge Oficial
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(rightX - 44, curY, 44, 6.5, 3, 3, "FD");
    doc.setTextColor(11, 67, 156);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(
      pageIdx === 1 ? "DOCUMENTO OFICIAL" : `CONTINUAÇÃO • PÁG. ${pageIdx}`,
      rightX - 22,
      curY + 4.5,
      { align: "center" }
    );

    curY += 17;

    // Linha divisória
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, curY, rightX, curY);

    curY += 6;
    return curY;
  };

  const addNewDocPage = (): number => {
    doc.addPage();
    const newPageNum = doc.internal.getCurrentPageInfo().pageNumber;
    pageNumbers.push(newPageNum);
    return drawHeader(pageNumbers.length);
  };

  let y = drawHeader(1);

  // 2. PARSEAMENTO E FORMATAÇÃO DO CONTEÚDO (SUPORTE NATIVO A CÓDIGO HTML COM TÍTULOS E ESPAÇAMENTOS)
  let titleFontSize = 14;
  if (docItem.tamanho_titulo) {
    const parsed = parseInt(String(docItem.tamanho_titulo), 10);
    if (!isNaN(parsed) && parsed > 0) {
      titleFontSize = Math.min(26, Math.max(8, Math.round(parsed * 0.78)));
    } else if (docItem.tamanho_titulo === "pequeno") {
      titleFontSize = 11;
    } else if (docItem.tamanho_titulo === "grande") {
      titleFontSize = 17;
    }
  }
  const titleLineHeight = Math.max(5.0, titleFontSize * 0.50);

  let contentFontSize = 10;
  if (docItem.tamanho_conteudo) {
    const parsed = parseInt(String(docItem.tamanho_conteudo), 10);
    if (!isNaN(parsed) && parsed > 0) {
      contentFontSize = Math.min(18, Math.max(6, Math.round(parsed * 0.72)));
    } else if (docItem.tamanho_conteudo === "pequeno") {
      contentFontSize = 8.5;
    } else if (docItem.tamanho_conteudo === "grande") {
      contentFontSize = 12;
    }
  }
  const contentLineHeight = Math.max(4.5, contentFontSize * 0.55);

  const isAllBold = (docItem.estilo_conteudo || "").trim().toLowerCase() === "tudo" || (docItem.estilo_conteudo || "").trim().toLowerCase() === "todo";
  const defaultFontStyle = isAllBold ? "bold" : "normal";

  const hasAnySignature = Boolean(
    docItem.incluir_assinatura_programa_certo ||
    docItem.incluir_assinatura_cordenacao ||
    docItem.incluir_campo_assinatura_aluno ||
    (docItem as any).incluir_assinatura_aluno
  );

  // Parseamento dos blocos de HTML / Texto do documento
  const rawContent = docItem.conteudo ?? "";
  const blocks = parseDocContentBlocks(
    rawContent,
    docItem.alinhamento_conteudo || "justify",
    docItem.alinhamento_titulo || "center"
  );

  // Se o documento é puramente legado em texto plano (sem HTML e sem cabeçalhos próprios), desenha o título legado
  const isPureLegacy = !rawContent.includes("<") && blocks.every((b) => b.type !== "heading");
  if (isPureLegacy && docItem.titulo && docItem.titulo.trim()) {
    const titleFontStyle = docItem.estilo_titulo === "normal" ? "normal" : "bold";
    doc.setFontSize(titleFontSize);
    doc.setFont("helvetica", titleFontStyle);
    doc.setTextColor(24, 24, 27);

    const legacyTitleLines: string[] = doc.splitTextToSize(docItem.titulo.toUpperCase(), contentWidth);
    const titleAlign = docItem.alinhamento_titulo || "center";

    legacyTitleLines.forEach((tLine: string) => {
      let titleX = pageWidth / 2;
      if (titleAlign === "left") titleX = margin;
      else if (titleAlign === "right") titleX = rightX;
      doc.text(tLine, titleX, y + 4, { align: titleAlign as any });
      y += titleLineHeight;
    });
    y += 12;
  }

  // Renderização estruturada de cada bloco de texto e título no PDF (NUNCA exibe códigos HTML)
  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    const pageLimit = hasAnySignature ? maxContentY - 45 : maxContentY - 8;

    // Quebra de página explícita (folha A4 seguinte)
    if (block.type === "pagebreak") {
      y = addNewDocPage();
      y += 6;
      continue;
    }

    // Linha em branco / espaço intencional preservado
    if (block.type === "blank") {
      if (y + contentLineHeight > pageLimit) {
        y = addNewDocPage();
        y += 6;
      }
      y += contentLineHeight;
      continue;
    }

    // Título / Heading definido no documento
    if (block.type === "heading") {
      doc.setFontSize(titleFontSize);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 24, 27);

      const hLines: string[] = doc.splitTextToSize(block.text.toUpperCase(), contentWidth);
      const hAlign = block.align || docItem.alinhamento_titulo || "center";

      // Espaço antes do título se não estiver no topo da folha
      if (y > 35) y += 4;

      for (const hLine of hLines) {
        if (y + titleLineHeight > pageLimit) {
          y = addNewDocPage();
          y += 6;
          doc.setFontSize(titleFontSize);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(24, 24, 27);
        }

        let hX = pageWidth / 2;
        if (hAlign === "left") hX = margin;
        else if (hAlign === "right") hX = rightX;

        doc.text(hLine, hX, y + 2, { align: hAlign as any });
        y += titleLineHeight;
      }
      y += 6; // Espaço após o título
      continue;
    }

    // Parágrafo de texto normal
    if (block.type === "paragraph") {
      const pFontStyle = block.isBold || isAllBold ? "bold" : "normal";
      doc.setFontSize(contentFontSize);
      doc.setFont("helvetica", pFontStyle);
      doc.setTextColor(39, 39, 42);

      const pLines: string[] = doc.splitTextToSize(block.text, contentWidth);
      const pAlign = block.align || docItem.alinhamento_conteudo || "justify";

      for (const pLine of pLines) {
        if (y + contentLineHeight > pageLimit) {
          y = addNewDocPage();
          y += 6;
          doc.setFontSize(contentFontSize);
          doc.setFont("helvetica", pFontStyle);
          doc.setTextColor(39, 39, 42);
        }

        let pX = margin;
        let alignMode: any = pAlign;
        if (pAlign === "center") {
          pX = pageWidth / 2;
        } else if (pAlign === "right") {
          pX = rightX;
        } else if (pAlign === "justify") {
          pX = margin;
          alignMode = "justify";
        }

        doc.text(pLine, pX, y, { align: alignMode });
        y += contentLineHeight;
      }
      y += 2;
    }
  }

  y += 4;

  // 4. Caixa de Homologação e Assinaturas (Em cada página que tiver assinaturas configuradas)
  const isSignOnPage = (rule: string | undefined, pNum: number, totalP: number) => {
    if (!rule || rule.trim().toLowerCase() === "ultima" || rule.trim().toLowerCase() === "última") {
      return pNum === totalP;
    }
    const nums = rule
      .split(/[,\s]+/)
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n));
    if (nums.length === 0) return pNum === totalP;
    return nums.includes(pNum);
  };

  const totalPagesEstimate = pageNumbers.length;
  pageNumbers.forEach((pNum) => {
    doc.setPage(pNum);

    const hasPc =
      !!docItem.incluir_assinatura_programa_certo &&
      isSignOnPage(docItem.paginas_assinatura_programa_certo, pNum, totalPagesEstimate);
    const hasCoord =
      !!docItem.incluir_assinatura_cordenacao &&
      isSignOnPage(docItem.paginas_assinatura_cordenacao, pNum, totalPagesEstimate);
    const hasAluno =
      !!(docItem.incluir_campo_assinatura_aluno || (docItem as any).incluir_assinatura_aluno) &&
      isSignOnPage(docItem.paginas_assinatura_aluno, pNum, totalPagesEstimate);

    const activeCount = [hasPc, hasCoord, hasAluno].filter(Boolean).length;
    if (activeCount === 0) return;

    const signBoxHeight = 35;
    const signY = footerY - signBoxHeight - 6;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, signY, contentWidth, signBoxHeight, 3, 3, "FD");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("HOMOLOGAÇÃO E ASSINATURAS INSTITUCIONAIS", margin + 6, signY + 6);

    const colWidth = contentWidth / activeCount;
    let curColX = margin;
    const lineY = signY + 25.5;

    // Assinatura 1: Programa Certo
    if (hasPc) {
      const centerX = curColX + colWidth / 2;
      const stampIconSize = 8;
      const stampIconX = centerX - stampIconSize / 2;
      const stampIconY = signY + 9.5;

      try {
        doc.addImage(LOGO_PROGRAMA_CERTO_BASE64, "PNG", stampIconX, stampIconY, stampIconSize, stampIconSize);
      } catch {
        doc.setFillColor(11, 67, 156);
        doc.roundedRect(stampIconX, stampIconY, stampIconSize, stampIconSize, 1.5, 1.5, "F");
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      const stampProgText = "Programa ";
      const stampCertoText = "Certo";
      const stampProgW = doc.getTextWidth(stampProgText);
      const stampCertoW = doc.getTextWidth(stampCertoText);
      const totalW = stampProgW + stampCertoW;
      const startX = centerX - totalW / 2;

      doc.setTextColor(0, 0, 0);
      doc.text(stampProgText, startX, lineY - 1.8);
      doc.setTextColor(130, 183, 255);
      doc.text(stampCertoText, startX + stampProgW, lineY - 1.8);

      doc.setDrawColor(24, 24, 27);
      doc.setLineWidth(0.45);
      doc.line(centerX - 24, lineY, centerX + 24, lineY);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 24, 27);
      doc.text("Gestor Responsável", centerX, lineY + 4, { align: "center" });

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Administração Programa Certo", centerX, lineY + 7.2, { align: "center" });

      curColX += colWidth;
    }

    // Assinatura 2: Coordenação
    if (hasCoord) {
      const centerX = curColX + colWidth / 2;

      doc.setDrawColor(24, 24, 27);
      doc.setLineWidth(0.45);
      doc.line(centerX - 24, lineY, centerX + 24, lineY);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 24, 27);
      doc.text("Data: ____ / ____ / ________", centerX, lineY + 4, { align: "center" });

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Visto da Coordenação", centerX, lineY + 7.2, { align: "center" });

      curColX += colWidth;
    }

    // Assinatura 3: Aluno
    if (hasAluno) {
      const centerX = curColX + colWidth / 2;

      doc.setDrawColor(24, 24, 27);
      doc.setLineWidth(0.45);
      doc.line(centerX - 24, lineY, centerX + 24, lineY);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 24, 27);
      doc.text("Assinatura do Aluno", centerX, lineY + 4, { align: "center" });

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Estudante / Responsável Legal", centerX, lineY + 7.2, { align: "center" });

      curColX += colWidth;
    }
  });

  // 5. Rodapé Oficial no Final de Todas as Páginas
  const totalPages = pageNumbers.length;
  pageNumbers.forEach((pNum, idx) => {
    doc.setPage(pNum);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY, rightX, footerY);

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Gestão Cursos Programa Certo", margin, footerY + 4.5);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Documento oficial gerado e autenticado pelo sistema administrativo.", margin, footerY + 8);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    const pageLabel = totalPages > 1 ? `Página ${idx + 1} de ${totalPages}` : "Documento Oficial";
    doc.text(pageLabel, rightX, footerY + 4.5, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.text(`Emitido em: ${dataAtual} às ${horaAtual}`, rightX, footerY + 8, { align: "right" });
  });

  return doc;
}

/**
 * Gera Blob PDF do Documento
 */
export function generateDocumentPdfBlob(docItem: DocumentItem): Blob {
  const doc = buildDocumentPdfDoc(docItem);
  const arrayBuffer = doc.output("arraybuffer");
  return new Blob([arrayBuffer], { type: "application/pdf" });
}

/**
 * Gera Blob URL do Documento
 */
export function generateDocumentPdfBlobUrl(docItem: DocumentItem): string {
  const blob = generateDocumentPdfBlob(docItem);
  return URL.createObjectURL(blob);
}

/**
 * Sanitiza o nome do documento para ser usado como nome oficial de arquivo .pdf
 * sem caracteres inválidos ou números/letras aleatórias.
 */
export function getCleanDocFilename(title?: string): string {
  const raw = (title || "").trim() || "Documento";
  const safe = raw
    .replace(/[\\/:*?"<>|#%&{}\\$!'@+`=]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = safe || "Documento";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

/**
 * Faz download direto do arquivo PDF oficial no dispositivo do usuário
 * com o nome exato do documento cadastrado (sem códigos, UUIDs ou caracteres estranhos).
 */
export function downloadDocumentPdf(docItem: DocumentItem): boolean {
  try {
    const doc = buildDocumentPdfDoc(docItem);
    const cleanFilename = getCleanDocFilename(docItem.titulo);
    doc.save(cleanFilename);
    return true;
  } catch (err) {
    console.error("Erro ao baixar documento em PDF:", err);
    return false;
  }
}

/**
 * Abre o PDF na Web para visualização direta com o nome do arquivo preservado na URL,
 * garantindo que downloads ou impressões do visualizador mantenham o nome oficial.
 */
export async function openDocumentPdfInBrowser(docItem: DocumentItem) {
  try {
    const doc = buildDocumentPdfDoc(docItem);
    const cleanFilename = getCleanDocFilename(docItem.titulo);

    // Enviar para o endpoint oficial do servidor para servir na URL com o nome real
    try {
      const dataUri = doc.output("datauristring");
      const base64 = dataUri.split(",")[1];
      if (base64) {
        const res = await fetch("/api/documentos/prepare-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfBase64: base64, filename: cleanFilename }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.url) {
            window.open(data.url, "_blank");
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Fallback de abertura de PDF para Blob URL:", e);
    }

    // Fallback: Blob URL com nome oficial atribuído
    const arrayBuffer = doc.output("arraybuffer");
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = cleanFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
  } catch (err) {
    console.error("Erro ao abrir Documento PDF na Web:", err);
  }
}

/**
 * Aciona o painel nativo de impressão do sistema/navegador para o documento.
 * O nome oficial do documento é embutido na janela e metadados de impressão.
 */
export async function printDocumentInBrowser(docItem: DocumentItem) {
  try {
    const doc = buildDocumentPdfDoc(docItem);
    const cleanFilename = getCleanDocFilename(docItem.titulo);

    // Embutir instrução nativa de impressão automática no catálogo do PDF
    if (typeof (doc as any).autoPrint === "function") {
      (doc as any).autoPrint({ variant: "non-conform" });
      (doc as any).autoPrint({ variant: "javascript" });
    }

    // Servir via endpoint oficial se disponível para que o cabeçalho de impressão tenha o nome exato
    try {
      const dataUri = doc.output("datauristring");
      const base64 = dataUri.split(",")[1];
      if (base64) {
        const res = await fetch("/api/documentos/prepare-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfBase64: base64, filename: cleanFilename }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.url) {
            window.open(data.url, "_blank");
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Fallback de impressão para Blob URL:", e);
    }

    const arrayBuffer = doc.output("arraybuffer");
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = cleanFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
  } catch (err) {
    console.error("Erro ao preparar impressão de documento em PDF:", err);
  }
}

