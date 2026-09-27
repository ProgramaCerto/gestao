import * as jspdfLib from "jspdf";
import { DocumentItem } from "../components/DocumentosManager";
import { LOGO_PROGRAMA_CERTO_BASE64 } from "./logoBase64";

const JsPdfClass: any = (jspdfLib as any).jsPDF || (jspdfLib as any).default || jspdfLib;

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

  doc.setProperties({
    title: `${docItem.titulo} - Programa Certo`,
    subject: "Documento Oficial - Plataforma Educacional",
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

    doc.setFontSize(15);
    doc.setTextColor(24, 24, 27);
    doc.setFont("helvetica", "bold");
    doc.text("Programa ", margin + 17, curY + 6);
    const textWidthProg = doc.getTextWidth("Programa ");
    doc.setTextColor(11, 67, 156);
    doc.text("Certo", margin + 17 + textWidthProg, curY + 6);

    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("PLATAFORMA EDUCACIONAL", margin + 17, curY + 11.5);

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

  // 2. TÍTULO DO DOCUMENTO (Com tamanho numérico, estilo e alinhamento customizados)
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
  const titleLineHeight = Math.max(4.5, titleFontSize * 0.45);

  const titleFontStyle = docItem.estilo_titulo === "normal" ? "normal" : "bold";
  doc.setFontSize(titleFontSize);
  doc.setFont("helvetica", titleFontStyle);
  doc.setTextColor(24, 24, 27);

  const titleLines: string[] = doc.splitTextToSize(docItem.titulo.toUpperCase(), contentWidth);
  const titleAlign = docItem.alinhamento_titulo || "center";

  titleLines.forEach((tLine: string) => {
    let titleX = pageWidth / 2;
    if (titleAlign === "left") {
      titleX = margin;
    } else if (titleAlign === "right") {
      titleX = rightX;
    }
    doc.text(tLine, titleX, y + 4, { align: titleAlign as any });
    y += titleLineHeight;
  });
  y += 5;

  // 3. CONTEÚDO DO DOCUMENTO (Com tamanho numérico, estilo negrito e quebra de páginas)
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
  const contentLineHeight = Math.max(4, contentFontSize * 0.52);

  const isAllBold = (docItem.estilo_conteudo || "").trim().toLowerCase() === "tudo" || (docItem.estilo_conteudo || "").trim().toLowerCase() === "todo";
  const defaultFontStyle = isAllBold ? "bold" : "normal";

  const textContent = docItem.conteudo?.trim() || "";
  doc.setFontSize(contentFontSize);
  doc.setFont("helvetica", defaultFontStyle);
  doc.setTextColor(39, 39, 42);

  const paragraphs = textContent.split("\n");
  for (const para of paragraphs) {
    if (!para.trim()) {
      y += 4;
      continue;
    }

    const lines: string[] = doc.splitTextToSize(para, contentWidth);
    for (const line of lines) {
      if (y + contentLineHeight > maxContentY - 45) {
        y = addNewDocPage();
        doc.setFontSize(contentFontSize);
        doc.setFont("helvetica", defaultFontStyle);
        doc.setTextColor(39, 39, 42);
      }
      doc.text(line, margin, y);
      y += contentLineHeight;
    }
    y += 2.5;
  }

  y += 5;

  // 4. Caixa de Homologação e Assinaturas (Mesmo esquema do atendimento - sempre ancorada no final da folha, acima do rodapé)
  const signBoxHeight = 35;
  const bottomAnchoredSignY = footerY - signBoxHeight - 6; // Posicionada no final da folha, acima do rodapé oficial

  // Se o conteúdo ultrapassou o espaço antes da caixa ancorada no final, cria nova página para as assinaturas
  if (y > bottomAnchoredSignY) {
    y = addNewDocPage();
  }
  // Posiciona a caixa de assinaturas sempre no final da página (acima do rodapé oficial)
  y = Math.max(y, bottomAnchoredSignY);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, signBoxHeight, 3, 3, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("HOMOLOGAÇÃO E ASSINATURAS INSTITUCIONAIS", margin + 6, y + 6);

  const activeSigsCount = [
    docItem.incluir_assinatura_programa_certo,
    docItem.incluir_assinatura_cordenacao,
    docItem.incluir_campo_assinatura_aluno
  ].filter(Boolean).length || 1;

  const colWidth = contentWidth / activeSigsCount;
  let curColX = margin;
  const lineY = y + 25.5;

  // Assinatura 1: Programa Certo
  if (docItem.incluir_assinatura_programa_certo) {
    const centerX = curColX + colWidth / 2;
    const stampIconSize = 8;
    const stampIconX = centerX - stampIconSize / 2;
    const stampIconY = y + 9.5;

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
  if (docItem.incluir_assinatura_cordenacao) {
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
  if (docItem.incluir_campo_assinatura_aluno) {
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
    doc.text("Programa Certo — Plataforma Educacional", margin, footerY + 4.5);

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
 * Abre o PDF na Web para visualização direta de qualquer pessoa,
 * sem download forçado e sem restrições.
 */
export function openDocumentPdfInBrowser(docItem: DocumentItem) {
  try {
    const blobUrl = generateDocumentPdfBlobUrl(docItem);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
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
 * Gera o documento PDF oficial com comando AutoPrint embutido (/OpenAction /Print + JS print)
 * e abre via Blob URL local, escapando de qualquer restrição de iframe e abrindo
 * diretamente o diálogo nativo de impressão sem erros de cross-origin.
 */
export function printDocumentInBrowser(docItem: DocumentItem) {
  try {
    const doc = buildDocumentPdfDoc(docItem);

    // Embutir instrução nativa de impressão automática no catálogo do PDF
    if (typeof (doc as any).autoPrint === "function") {
      (doc as any).autoPrint({ variant: "non-conform" });
      (doc as any).autoPrint({ variant: "javascript" });
    }

    const arrayBuffer = doc.output("arraybuffer");
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
  } catch (err) {
    console.error("Erro ao preparar impressão de documento em PDF:", err);
  }
}

