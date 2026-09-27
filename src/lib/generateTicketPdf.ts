import * as jspdfLib from "jspdf";
import { AtendimentoItem } from "../App";
import { LOGO_PROGRAMA_CERTO_BASE64 } from "./logoBase64";

const JsPdfClass: any = (jspdfLib as any).jsPDF || (jspdfLib as any).default || jspdfLib;

/**
 * Extrai ou gera de forma determinística e única os 6 últimos dígitos numéricos (0-9) do UID de um usuário.
 * Garante que cada usuário tenha uma terminação de 6 números exclusiva (ex: .385793).
 */
export function getUserSixDigitSuffix(rawId?: string | null, allUsersList?: any[]): string {
  if (!rawId || rawId === "ID não registrado") return "000000";
  const cleaned = String(rawId).trim();

  // Se já tiver ponto seguido de 6 números no final
  const dotMatch = cleaned.match(/\.(\d{6})$/);
  if (dotMatch) return dotMatch[1];

  // Se os últimos 6 caracteres alfanuméricos já forem 6 dígitos numéricos (0-9)
  const alnum = cleaned.replace(/[^a-zA-Z0-9]/g, "");
  const last6 = alnum.slice(-6);
  if (/^\d{6}$/.test(last6)) {
    return last6;
  }

  // Caso algum ID antigo termine com letras hexadecimais (a-f), converte deterministicamente para 6 números
  let hash = 0;
  for (let i = 0; i < cleaned.length; i++) {
    hash = (hash * 31 + cleaned.charCodeAt(i)) % 900000;
  }
  let num = 100000 + Math.abs(hash);

  if (allUsersList && allUsersList.length > 0) {
    const usedSuffixes = new Set<string>();
    for (const u of allUsersList) {
      const uid = u?.id ? String(u.id).trim() : "";
      if (!uid || uid === cleaned) continue;
      const uAlnum = uid.replace(/[^a-zA-Z0-9]/g, "");
      const uLast6 = uAlnum.slice(-6);
      if (/^\d{6}$/.test(uLast6)) {
        usedSuffixes.add(uLast6);
      }
    }
    while (usedSuffixes.has(String(num).padStart(6, "0"))) {
      num = ((num - 100000 + 1) % 900000) + 100000;
    }
  }

  return String(num).padStart(6, "0");
}

/**
 * Formata o UID do usuário no padrão visual com ponto antes dos 6 últimos números únicos:
 * Ex: 9fc5929d-ddda-4aab-b0f6-abaffb.385793
 */
export function formatUserUidWithSixDigits(rawId?: string | null, allUsersList?: any[]): string {
  if (!rawId || rawId === "ID não registrado") return "ID não registrado";
  const cleaned = String(rawId).trim();
  if (cleaned.includes(".") && /\.\d{6}$/.test(cleaned)) {
    return cleaned;
  }
  const suffix = getUserSixDigitSuffix(cleaned, allUsersList);
  if (cleaned.length > 6) {
    return `${cleaned.slice(0, -6)}.${suffix}`;
  }
  return `${cleaned}.${suffix}`;
}

/**
 * Gera um novo UUID v4 válido para o banco de dados garantindo que os últimos 6 caracteres
 * sejam 6 números (0-9) exclusivos que não colidem com nenhum outro usuário cadastrado.
 */
export function generateUniqueUserUUID(existingUsers: any[] = []): string {
  const existingSuffixes = new Set<string>(
    existingUsers.map((u) => getUserSixDigitSuffix(u?.id))
  );

  let sixDigits = "";
  for (let attempt = 0; attempt < 1000; attempt++) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000));
    if (!existingSuffixes.has(candidate)) {
      sixDigits = candidate;
      break;
    }
  }
  if (!sixDigits) {
    sixDigits = String(Date.now()).slice(-6).padStart(6, "0");
  }

  const baseUuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
          (
            +c ^
            ((typeof crypto !== "undefined" && crypto.getRandomValues
              ? crypto.getRandomValues(new Uint8Array(1))[0]
              : Math.floor(Math.random() * 16)) &
              (15 >> (+c / 4)))
          ).toString(16)
        );

  return `${baseUuid.slice(0, -6)}${sixDigits}`;
}

/**
 * Verifica se um usuário corresponde ao termo pesquisado (por Nome, E-mail, UID completo ou pelos 6 últimos dígitos).
 */
export function matchesUserSearch(userItem: any, searchTerm: string, allUsersList?: any[]): boolean {
  const q = (searchTerm || "").toLowerCase().trim();
  if (!q) return true;

  const name = String(userItem?.name || userItem?.nome || "").toLowerCase();
  const email = String(userItem?.email || "").toLowerCase();
  const rawId = String(userItem?.id || "").toLowerCase();
  const formattedUid = formatUserUidWithSixDigits(userItem?.id, allUsersList).toLowerCase();
  const sixDigits = getUserSixDigitSuffix(userItem?.id, allUsersList).toLowerCase();
  const qWithoutDot = q.replace(/^\./, "");

  return (
    name.includes(q) ||
    email.includes(q) ||
    rawId.includes(q) ||
    rawId.includes(qWithoutDot) ||
    formattedUid.includes(q) ||
    sixDigits.includes(qWithoutDot)
  );
}

/**
 * Desenha um comprovante oficial de atendimento em uma instância jsPDF,
 * dividindo automaticamente em 2 ou mais páginas quando a mensagem enviada
 * ou a resposta oficial forem muito grandes para caber em uma única página.
 */
function renderTicketOnPdfPage(doc: any, ticket: AtendimentoItem) {
  const cleanProtocol = ticket.id.startsWith("#") ? ticket.id : `#${ticket.id}`;
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 18;
  const contentWidth = pageWidth - margin * 2; // 174mm
  const rightX = margin + contentWidth;
  const footerY = 278;
  const maxContentY = 271; // Limite seguro antes do rodapé
  const lineHeight = 4.4;

  const formatDt = (iso?: string | null) => {
    if (!iso) return "Não informado";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return iso;
    }
  };

  const rawUserId = ticket.user_id || ticket.id_do_usuario || "";
  const effectiveUserId = rawUserId ? formatUserUidWithSixDigits(rawUserId) : "ID não registrado";
  const effectiveEmail = ticket.email?.trim() || "E-mail não informado";
  const effectiveName = ticket.nome || "Não informado";

  const startPageNumber = doc.internal.getCurrentPageInfo().pageNumber;
  const ticketPageNumbers: number[] = [startPageNumber];

  const drawPageHeader = (pageIdxInTicket: number): number => {
    let curY = 18;

    // 1. CABEÇALHO OFICIAL
    try {
      doc.addImage(LOGO_PROGRAMA_CERTO_BASE64, "PNG", margin, curY, 14, 14);
    } catch {
      doc.setFillColor(11, 67, 156); // #0b439c
      doc.roundedRect(margin, curY, 14, 14, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("PC", margin + 7, curY + 9, { align: "center" });
    }

    // Nome da Empresa e Painel Administrativo
    doc.setFontSize(15);
    doc.setTextColor(24, 24, 27); // zinc-900
    doc.setFont("helvetica", "bold");
    doc.text("Programa ", margin + 17, curY + 6);
    const textWidthProg = doc.getTextWidth("Programa ");
    doc.setTextColor(11, 67, 156);
    doc.text("Certo", margin + 17 + textWidthProg, curY + 6);

    // Subtítulo Administrativo
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont("helvetica", "bold");
    doc.text("REGISTRO E DESPACHO ADMINISTRATIVO DE ATENDIMENTO", margin + 17, curY + 11.5);

    // Lado direito: Badge Administrativo + Protocolo
    doc.setFillColor(238, 242, 255); // blue-50
    doc.setDrawColor(199, 210, 254); // blue-200
    doc.roundedRect(rightX - 42, curY, 42, 6.5, 3, 3, "FD");
    doc.setTextColor(11, 67, 156);
    doc.setFontSize(6.8);
    doc.setFont("helvetica", "bold");
    doc.text(
      pageIdxInTicket === 1 ? "DESPACHO OFICIAL" : `CONTINUAÇÃO • PÁG. ${pageIdxInTicket}`,
      rightX - 21,
      curY + 4.5,
      { align: "center" }
    );

    // Protocolo
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text(`Protocolo: ${cleanProtocol}`, rightX, curY + 13, { align: "right" });

    curY += 17;

    // Linha divisória sutil
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, curY, rightX, curY);

    curY += 5;

    if (pageIdxInTicket > 1) {
      // Faixa compacta de identificação nas páginas de continuação
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, curY, contentWidth, 9, 2.5, 2.5, "FD");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Continuação do Chamado ${cleanProtocol}  •  Solicitante: ${String(effectiveName).slice(0, 32)} (${String(effectiveEmail).slice(0, 34)})`,
        margin + 4,
        curY + 5.8
      );
      curY += 14;
    }

    return curY;
  };

  const addNewTicketPage = (): number => {
    doc.addPage();
    const newPageNum = doc.internal.getCurrentPageInfo().pageNumber;
    ticketPageNumbers.push(newPageNum);
    return drawPageHeader(ticketPageNumbers.length);
  };

  let y = drawPageHeader(1);

  // 2. QUADRO DE DADOS DO SOLICITANTE E DO ATENDIMENTO (Página 1)
  const infoBoxHeight = 38;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, infoBoxHeight, 3.5, 3.5, "FD");

  const col1X = margin + 6;
  const col2X = margin + 68;
  const col3X = margin + 120;

  const row1Y = y + 7.5;
  const row2Y = y + 23;

  // Linha 1: Solicitante (Nome), E-mail, ID do Usuário
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("SOLICITANTE", col1X, row1Y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  doc.text(String(effectiveName).slice(0, 28), col1X, row1Y + 5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("E-MAIL", col2X, row1Y);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(39, 39, 42);
  doc.text(String(effectiveEmail).slice(0, 30), col2X, row1Y + 5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("ID DO USUÁRIO (UID)", col3X, row1Y);
  doc.setFontSize(6.8);
  doc.setFont("courier", "bold");
  doc.setTextColor(39, 39, 42);
  doc.text(String(effectiveUserId), col3X, row1Y + 5);

  // Linha 2: Tipo de Solicitação, Data/Hora, Status Atual
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("TIPO DE SOLICITAÇÃO", col1X, row2Y);
  doc.setFontSize(8.5);
  doc.setTextColor(24, 24, 27);
  doc.text(ticket.tipo || "Geral", col1X, row2Y + 5);

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("DATA E HORA DO REGISTRO", col2X, row2Y);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(39, 39, 42);
  doc.text(formatDt(ticket.criado_em), col2X, row2Y + 5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("STATUS NO SISTEMA", col3X, row2Y);

  const isConcluido = ticket.status === "Concluído";
  const isEmAndamento = ticket.status === "Em Andamento";
  const statusText = isConcluido ? "Concluído" : isEmAndamento ? "Em Andamento" : "Aguardando";

  if (isConcluido) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.setTextColor(6, 95, 70);
  } else if (isEmAndamento) {
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.setTextColor(30, 64, 175);
  } else {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(253, 230, 138);
    doc.setTextColor(146, 64, 14);
  }

  doc.roundedRect(col3X, row2Y + 1, 28, 5.5, 2.5, 2.5, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, col3X + 14, row2Y + 4.8, { align: "center" });

  y += infoBoxHeight + 6;

  // 3. SITUAÇÃO DA CONTA (Caso seja Bloqueio de Conta)
  if (ticket.tipo === "Bloqueio de Conta") {
    const blockBoxH = 9.5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, blockBoxH, 2, 2, "FD");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("SITUAÇÃO DA CONTA:", margin + 5, y + 6.2);

    const isLiberada = isConcluido;

    // Checkbox 1: Conta desbloqueada
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.35);
    doc.rect(margin + 52, y + 3, 3.5, 3.5, "FD");
    if (isLiberada) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 24, 27);
      doc.text("X", margin + 53.75, y + 5.7, { align: "center" });
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text("Conta desbloqueada", margin + 57.5, y + 5.8);

    // Checkbox 2: Conta ainda continua bloqueada (fundo branco igual à primeira caixinha)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.35);
    doc.rect(margin + 106, y + 3, 3.5, 3.5, "FD");
    if (!isLiberada) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 24, 27);
      doc.text("X", margin + 107.75, y + 5.7, { align: "center" });
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text("Conta ainda continua bloqueada", margin + 111.5, y + 5.8);

    y += blockBoxH + 5;
  }

  // 4. MENSAGEM ENVIADA PELO SOLICITANTE (Com divisão automática em páginas se for muito grande)
  const mensagemText = ticket.mensagem?.trim() || "Nenhuma mensagem registrada.";
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const allMsgLines: string[] = doc.splitTextToSize(mensagemText, contentWidth - 12);
  let remainingMsgLines = [...allMsgLines];
  let isMsgFirstChunk = true;

  while (remainingMsgLines.length > 0) {
    // Verifica se há espaço mínimo na página atual para iniciar o bloco (título + pelo menos 3 linhas)
    if (y + 3.5 + 10 + 3 * lineHeight > maxContentY) {
      y = addNewTicketPage();
    }

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text(
      isMsgFirstChunk ? "MENSAGEM ENVIADA" : "MENSAGEM ENVIADA (CONTINUAÇÃO)",
      margin,
      y
    );

    y += 3.5;

    const availHeightForBox = maxContentY - y;
    const maxLinesHere = Math.max(1, Math.floor((availHeightForBox - 10) / lineHeight));
    const chunkLines = remainingMsgLines.slice(0, maxLinesHere);
    remainingMsgLines = remainingMsgLines.slice(maxLinesHere);

    const hasMoreMsgChunks = remainingMsgLines.length > 0;
    const msgBoxHeight = Math.max(
      isMsgFirstChunk && !hasMoreMsgChunks ? 22 : 16,
      chunkLines.length * lineHeight + (hasMoreMsgChunks ? 13 : 9.5)
    );

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, msgBoxHeight, 3, 3, "FD");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(39, 39, 42);
    doc.text(chunkLines, margin + 5, y + 6.5);

    if (hasMoreMsgChunks) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text("Continua na próxima página...", rightX - 5, y + msgBoxHeight - 2.5, { align: "right" });
      y = addNewTicketPage();
    } else {
      y += msgBoxHeight + 6;
    }

    isMsgFirstChunk = false;
  }

  // 5. PARECER E RESPOSTA OFICIAL DA ADMINISTRAÇÃO (Com mudança automática para a 2ª página se não couber ou divisão se for muito grande)
  const officialReply = (ticket.resposta || ticket.mensagem_respondida || "").trim();
  if (officialReply) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const allReplyLines: string[] = doc.splitTextToSize(officialReply, contentWidth - 16);
    const totalReplyBoxHeight = Math.max(26, allReplyLines.length * lineHeight + 16);
    const totalReplySectionHeight = 3.5 + totalReplyBoxHeight;

    // Se a resposta não couber inteira no espaço restante desta página e já estivermos abaixo do meio da folha (ex: mensagem enviada grande),
    // ou se não couberem nem 5 linhas da resposta no final da página atual, inicia o Parecer Oficial direto no topo da próxima página!
    const minReplyStartSpace = 3.5 + 16 + Math.min(allReplyLines.length, 5) * lineHeight;
    if (
      y + minReplyStartSpace > maxContentY ||
      (y > 125 && y + totalReplySectionHeight > maxContentY)
    ) {
      y = addNewTicketPage();
    }

    let remainingReplyLines = [...allReplyLines];
    let isReplyFirstChunk = true;

    while (remainingReplyLines.length > 0) {
      if (y + 3.5 + 16 + 2 * lineHeight > maxContentY) {
        y = addNewTicketPage();
      }

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(11, 67, 156);
      doc.text(
        isReplyFirstChunk
          ? "PARECER E RESPOSTA OFICIAL DA ADMINISTRAÇÃO"
          : "PARECER E RESPOSTA OFICIAL DA ADMINISTRAÇÃO (CONTINUAÇÃO)",
        margin,
        y
      );

      y += 3.5;

      const headerPad = isReplyFirstChunk ? 16 : 10;
      const availHeightForReply = maxContentY - y;
      const maxReplyLinesHere = Math.max(1, Math.floor((availHeightForReply - headerPad) / lineHeight));
      const replyChunk = remainingReplyLines.slice(0, maxReplyLinesHere);
      remainingReplyLines = remainingReplyLines.slice(maxReplyLinesHere);

      const hasMoreReplyChunks = remainingReplyLines.length > 0;
      const respBoxHeight = Math.max(
        isReplyFirstChunk && !hasMoreReplyChunks ? 26 : 18,
        replyChunk.length * lineHeight + headerPad + (hasMoreReplyChunks ? 3.5 : 0)
      );

      doc.setFillColor(239, 246, 255); // blue-50
      doc.setDrawColor(191, 219, 254); // blue-200
      doc.roundedRect(margin, y, contentWidth, respBoxHeight, 3, 3, "FD");

      if (isReplyFirstChunk) {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(11, 67, 156);
        const respAuthor = ticket.respondido_por
          ? `Atendido por: ${ticket.respondido_por}`
          : "Administração Programa Certo";
        doc.text(respAuthor, margin + 6, y + 6);

        if (ticket.respondido_em) {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text(`Data do Parecer: ${formatDt(ticket.respondido_em)}`, rightX - 6, y + 6, { align: "right" });
        }

        doc.setDrawColor(11, 67, 156);
        doc.setLineWidth(0.8);
        doc.line(margin + 6, y + 9, margin + 6, y + respBoxHeight - 4);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(24, 24, 27);
        doc.text(replyChunk, margin + 10, y + 13);
      } else {
        doc.setDrawColor(11, 67, 156);
        doc.setLineWidth(0.8);
        doc.line(margin + 6, y + 4, margin + 6, y + respBoxHeight - 4);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(24, 24, 27);
        doc.text(replyChunk, margin + 10, y + 7);
      }

      if (hasMoreReplyChunks) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(11, 67, 156);
        doc.text("Continua na próxima página...", rightX - 6, y + respBoxHeight - 2.5, { align: "right" });
        y = addNewTicketPage();
      } else {
        y += respBoxHeight + 6;
      }

      isReplyFirstChunk = false;
    }
  } else {
    const emptyBoxHeight = 22;
    if (y + 3.5 + emptyBoxHeight > maxContentY) {
      y = addNewTicketPage();
    }

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 67, 156);
    doc.text("PARECER E RESPOSTA OFICIAL DA ADMINISTRAÇÃO", margin, y);

    y += 3.5;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, emptyBoxHeight, 3, 3, "FD");

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text(
      "[ Aguardando parecer oficial / Espaço reservado para despacho administrativo manual ]",
      margin + 6,
      y + 7
    );

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin + 6, y + 12, rightX - 6, y + 12);
    doc.line(margin + 6, y + 17, rightX - 6, y + 17);

    y += emptyBoxHeight + 6;
  }

  // 6. CAIXINHA DE ASSINATURA E HOMOLOGAÇÃO DO GESTOR
  const signBoxH = 34;
  if (y + signBoxH > maxContentY) {
    y = addNewTicketPage();
  }

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, signBoxH, 3, 3, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("HOMOLOGAÇÃO DO GESTOR / RESPONSÁVEL ADMINISTRATIVO", margin + 6, y + 6);

  const signCol1 = margin + 14;
  const signCol1Center = signCol1 + 27.5;
  const signCol2 = margin + contentWidth - 65;
  const signCol2Center = signCol2 + 25;
  const lineY = y + 24.5;

  // Assinatura / Chancela do Gestor acima da linha (Logo PC + "Programa Certo")
  const stampIconSize = 8.5;
  const stampIconX = signCol1Center - stampIconSize / 2;
  const stampIconY = y + 9.2;

  try {
    doc.addImage(LOGO_PROGRAMA_CERTO_BASE64, "PNG", stampIconX, stampIconY, stampIconSize, stampIconSize);
  } catch {
    doc.setFillColor(5, 59, 154); // #053b9a
    doc.roundedRect(stampIconX, stampIconY, stampIconSize, stampIconSize, 1.8, 1.8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text("P", stampIconX + 2.6, stampIconY + 5.6);
    doc.setTextColor(130, 183, 255);
    doc.text("C", stampIconX + 4.7, stampIconY + 5.6);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  const stampProgText = "Programa ";
  const stampCertoText = "Certo";
  const stampProgW = doc.getTextWidth(stampProgText);
  const stampCertoW = doc.getTextWidth(stampCertoText);
  const stampTotalW = stampProgW + stampCertoW;
  const stampTextStartX = signCol1Center - stampTotalW / 2;
  const stampTextY = lineY - 1.8;

  doc.setTextColor(0, 0, 0); // "Programa" em preto
  doc.text(stampProgText, stampTextStartX, stampTextY);
  doc.setTextColor(130, 183, 255); // "Certo" em azul claro (#82B7FF conforme imagem enviada)
  doc.text(stampCertoText, stampTextStartX + stampProgW, stampTextY);

  // Linhas de assinatura e legendas
  doc.setDrawColor(24, 24, 27);
  doc.setLineWidth(0.45);
  doc.line(signCol1, lineY, signCol1 + 55, lineY);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  doc.text("Gestor Responsável", signCol1Center, lineY + 4, { align: "center" });
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Administração Programa Certo", signCol1Center, lineY + 7.2, { align: "center" });

  doc.line(signCol2, lineY, signCol2 + 50, lineY);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  doc.text("Data: ____ / ____ / ________", signCol2Center, lineY + 4, { align: "center" });
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Visto da Coordenação", signCol2Center, lineY + 7.2, { align: "center" });

  // 7. RODAPÉ OFICIAL COM AUTENTICAÇÃO E NUMERAÇÃO DE PÁGINAS EM TODAS AS FOLHAS DESTE CHAMADO
  const now = new Date();
  const dataEmissao = `${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  })}`;

  const totalPagesForTicket = ticketPageNumbers.length;
  ticketPageNumbers.forEach((pageNum, idx) => {
    doc.setPage(pageNum);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY, rightX, footerY);

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Programa Certo — Painel Administrativo", margin, footerY + 4.5);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Documento oficial para fins de auditoria, acompanhamento e despacho de solicitações.",
      margin,
      footerY + 8
    );

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    const pageLabel =
      totalPagesForTicket > 1
        ? `Autenticação: ${cleanProtocol}  •  Página ${idx + 1} de ${totalPagesForTicket}`
        : `Autenticação: ${cleanProtocol}`;
    doc.text(pageLabel, rightX, footerY + 4.5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(`Emitido em: ${dataEmissao}`, rightX, footerY + 8, { align: "right" });
  });

  // Garante que o ponteiro do jsPDF permaneça na última página gerada
  doc.setPage(ticketPageNumbers[ticketPageNumbers.length - 1]);
}

/**
 * Constrói a instância jsPDF de um único atendimento.
 */
export function buildTicketPdfDoc(ticket: AtendimentoItem): any {
  const doc = new JsPdfClass({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const cleanProtocol = ticket.id.startsWith("#") ? ticket.id : `#${ticket.id}`;
  doc.setProperties({
    title: `Comprovante de Atendimento ${cleanProtocol} - Programa Certo`,
    subject: "Comprovante Oficial de Atendimento",
    author: "Programa Certo",
    keywords: "Programa Certo, Atendimento, Suporte, Tecnologia",
    creator: "Programa Certo"
  });

  renderTicketOnPdfPage(doc, ticket);
  return doc;
}

/**
 * Constrói a instância jsPDF contendo múltiplos atendimentos (um por página A4).
 */
export function buildMultipleTicketsPdfDoc(tickets: AtendimentoItem[]): any {
  const doc = new JsPdfClass({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  doc.setProperties({
    title: `Relatório de Atendimentos (${tickets.length}) - Programa Certo`,
    subject: "Relatório Oficial de Atendimentos",
    author: "Programa Certo",
    keywords: "Programa Certo, Relatório, Atendimentos, Suporte",
    creator: "Programa Certo"
  });

  if (!tickets || tickets.length === 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Nenhum atendimento selecionado para o período/filtro informado.", 20, 30);
    return doc;
  }

  tickets.forEach((t, idx) => {
    if (idx > 0) {
      doc.addPage();
    }
    renderTicketOnPdfPage(doc, t);
  });

  return doc;
}

export function generateTicketPdfBlob(ticket: AtendimentoItem): Blob {
  const doc = buildTicketPdfDoc(ticket);
  const arrayBuffer = doc.output("arraybuffer");
  return new Blob([arrayBuffer], { type: "application/pdf" });
}

export function generateTicketPdfBlobUrl(ticket: AtendimentoItem): string {
  const blob = generateTicketPdfBlob(ticket);
  return URL.createObjectURL(blob);
}

/**
 * Enriquecimento dos dados do chamado com informações da lista de usuários (UID com 6 números finais, E-mail e Nome).
 */
export function enrichTicketsWithUserData(
  ticketsList: AtendimentoItem[],
  allUsersList: any[] = [],
  adminName: string = "Equipe Programa Certo"
): AtendimentoItem[] {
  if (!ticketsList || ticketsList.length === 0) return [];
  return ticketsList.map((ticket) => {
    const studentUser = allUsersList.find((u) => {
      if (ticket.user_id && u.id && u.id === ticket.user_id) return true;
      if (ticket.id_do_usuario && u.id && u.id === ticket.id_do_usuario) return true;
      if (ticket.email && u.email && u.email.toLowerCase() === ticket.email.toLowerCase()) return true;
      if (
        ticket.nome &&
        (u.nome || u.name) &&
        (u.nome || u.name).toLowerCase().trim() === ticket.nome.toLowerCase().trim()
      )
        return true;
      return false;
    });

    const rawUid = ticket.user_id || ticket.id_do_usuario || studentUser?.id || "";
    return {
      ...ticket,
      user_id: rawUid ? formatUserUidWithSixDigits(rawUid, allUsersList) : ticket.user_id,
      email: ticket.email || studentUser?.email || "E-mail não informado",
      nome: ticket.nome || studentUser?.nome || studentUser?.name || "Solicitante",
      respondido_por: ticket.respondido_por || adminName
    };
  });
}

/**
 * Salva e faz download do arquivo PDF de um atendimento diretamente.
 */
export function generateTicketPdf(ticket: AtendimentoItem): boolean {
  try {
    const doc = buildTicketPdfDoc(ticket);
    const cleanId = ticket.id.replace(/^#/, "").replace(/\s+/g, "-");
    doc.save(`Atendimento-${cleanId}.pdf`);
    return true;
  } catch (error) {
    console.error("Erro ao gerar PDF via jsPDF:", error);
    return false;
  }
}

/**
 * Salva e faz download do arquivo PDF de múltiplos atendimentos diretamente.
 */
export function generateMultipleTicketsPdf(
  tickets: AtendimentoItem[],
  fileSuffix: string = "Relatorio",
  allUsersList: any[] = [],
  adminName: string = "Equipe Programa Certo"
): boolean {
  try {
    const enriched = enrichTicketsWithUserData(tickets, allUsersList, adminName);
    const doc = buildMultipleTicketsPdfDoc(enriched);
    const dateStr = new Date().toISOString().split("T")[0];
    doc.save(`Atendimentos-${fileSuffix}-${dateStr}.pdf`);
    return true;
  } catch (error) {
    console.error("Erro ao gerar PDF em lote via jsPDF:", error);
    return false;
  }
}

/**
 * Abre o PDF oficial do atendimento em uma nova aba 100% via Blob local no navegador,
 * funcionando para QUALQUER usuário sem depender de autenticação do Google AI Studio.
 */
export function openTicketPdfInBrowser(ticket: AtendimentoItem) {
  try {
    const doc = buildTicketPdfDoc(ticket);
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

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    console.error("Erro ao abrir PDF no navegador:", err);
  }
}

/**
 * Abre o PDF oficial de múltiplos atendimentos em uma nova aba 100% via Blob local no navegador,
 * funcionando para QUALQUER usuário sem restrições de conta.
 */
export function openMultipleTicketsPdfInBrowser(
  tickets: AtendimentoItem[],
  allUsersList: any[] = [],
  adminName: string = "Equipe Programa Certo"
) {
  try {
    const enriched = enrichTicketsWithUserData(tickets, allUsersList, adminName);
    const doc = buildMultipleTicketsPdfDoc(enriched);
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

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    console.error("Erro ao abrir PDF múltiplo no navegador:", err);
  }
}

/**
 * Abre diretamente o painel nativo de impressão do sistema/navegador para 1 ou vários atendimentos.
 * Gera o documento PDF oficial com comando AutoPrint embutido (/OpenAction /Print + JS print)
 * e abre via Blob URL local, escapando de qualquer bloqueio de iframe (Google AI Studio)
 * e abrindo imediatamente a janela de impressão do navegador.
 */
export function printTicketsInBrowser(
  ticketsToPrint: AtendimentoItem[],
  adminName: string = "Equipe Programa Certo",
  allUsersList: any[] = []
) {
  if (!ticketsToPrint || ticketsToPrint.length === 0) return;

  try {
    const enrichedTickets = enrichTicketsWithUserData(ticketsToPrint, allUsersList, adminName);

    const doc =
      enrichedTickets.length === 1
        ? buildTicketPdfDoc(enrichedTickets[0])
        : buildMultipleTicketsPdfDoc(enrichedTickets);

    // Embutir instrução nativa de impressão automática no catálogo do PDF
    if (typeof doc.autoPrint === "function") {
      doc.autoPrint({ variant: "non-conform" });
      doc.autoPrint({ variant: "javascript" });
    }

    const arrayBuffer = doc.output("arraybuffer");
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);

    // Abre em nova guia via Blob URL (escapa do sandbox do iframe e aciona o painel de impressão nativo do Chrome)
    const link = document.createElement("a");
    link.href = blobUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
  } catch (err) {
    console.error("Erro ao preparar impressão em PDF:", err);
  }
}
