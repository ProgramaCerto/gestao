// server.ts
import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { createClient as createClient2 } from "@supabase/supabase-js";

// src/lib/generateTicketPdf.ts
import * as jspdfLib from "jspdf";

// src/lib/logoBase64.ts
var LOGO_PROGRAMA_CERTO_BASE64 = "data:image/png;base64,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";

// src/lib/generateTicketPdf.ts
var JsPdfClass = jspdfLib.jsPDF || jspdfLib.default || jspdfLib;
function extractMatricula(rawValue, allUsersList) {
  if (!rawValue || rawValue === "ID n\xE3o registrado" || rawValue === "N\xE3o informada") return "000000";
  const cleaned = String(rawValue).trim();
  if (/^\d{6}$/.test(cleaned)) {
    return cleaned;
  }
  const dotMatch = cleaned.match(/\.(\d{6})$/);
  if (dotMatch) return dotMatch[1];
  const alnum = cleaned.replace(/[^a-zA-Z0-9]/g, "");
  const last6 = alnum.slice(-6);
  if (/^\d{6}$/.test(last6)) {
    return last6;
  }
  let hash = 0;
  for (let i = 0; i < cleaned.length; i++) {
    hash = (hash * 31 + cleaned.charCodeAt(i)) % 9e5;
  }
  let num = 1e5 + Math.abs(hash);
  if (allUsersList && allUsersList.length > 0) {
    const usedMatriculas = /* @__PURE__ */ new Set();
    for (const u of allUsersList) {
      const uMat = String(u?.matricula || u?.id || "").trim();
      if (!uMat || uMat === cleaned) continue;
      const uAlnum = uMat.replace(/[^a-zA-Z0-9]/g, "");
      const uLast6 = uAlnum.slice(-6);
      if (/^\d{6}$/.test(uLast6)) {
        usedMatriculas.add(uLast6);
      }
    }
    while (usedMatriculas.has(String(num).padStart(6, "0"))) {
      num = (num - 1e5 + 1) % 9e5 + 1e5;
    }
  }
  return String(num).padStart(6, "0");
}
function renderTicketOnPdfPage(doc, ticket) {
  const cleanProtocol = ticket.id.startsWith("#") ? ticket.id : `#${ticket.id}`;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const rightX = margin + contentWidth;
  const footerY = 278;
  const maxContentY = 271;
  const lineHeight = 4.4;
  const formatDt = (iso) => {
    if (!iso) return "N\xE3o informado";
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
  const rawUserId = ticket.matricula_usuario || ticket.user_id || ticket.id_do_usuario || "";
  const effectiveMatricula = rawUserId && rawUserId !== "N\xE3o informada" && rawUserId !== "ID n\xE3o registrado" ? extractMatricula(rawUserId) : "N\xE3o informada";
  const effectiveEmail = ticket.email?.trim() || "E-mail n\xE3o informado";
  const effectiveName = ticket.nome || "N\xE3o informado";
  const startPageNumber = doc.internal.getCurrentPageInfo().pageNumber;
  const ticketPageNumbers = [startPageNumber];
  const drawPageHeader = (pageIdxInTicket) => {
    let curY = 18;
    try {
      doc.addImage(LOGO_PROGRAMA_CERTO_BASE64, "PNG", margin, curY, 14, 14);
    } catch {
      doc.setFillColor(11, 67, 156);
      doc.roundedRect(margin, curY, 14, 14, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("PC", margin + 7, curY + 9, { align: "center" });
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
    doc.text("REGISTRO E DESPACHO ADMINISTRATIVO DE ATENDIMENTO", margin + 17, curY + 11.5);
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(rightX - 42, curY, 42, 6.5, 3, 3, "FD");
    doc.setTextColor(11, 67, 156);
    doc.setFontSize(6.8);
    doc.setFont("helvetica", "bold");
    doc.text(
      pageIdxInTicket === 1 ? "DESPACHO OFICIAL" : `CONTINUA\xC7\xC3O \u2022 P\xC1G. ${pageIdxInTicket}`,
      rightX - 21,
      curY + 4.5,
      { align: "center" }
    );
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text(`Protocolo: ${cleanProtocol}`, rightX, curY + 13, { align: "right" });
    curY += 17;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, curY, rightX, curY);
    curY += 5;
    if (pageIdxInTicket > 1) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, curY, contentWidth, 9, 2.5, 2.5, "FD");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Continua\xE7\xE3o do Chamado ${cleanProtocol}  \u2022  Solicitante: ${String(effectiveName).slice(0, 28)}  \u2022  Matr\xEDcula: ${effectiveMatricula}`,
        margin + 4,
        curY + 5.8
      );
      curY += 14;
    }
    return curY;
  };
  const addNewTicketPage = () => {
    doc.addPage();
    const newPageNum = doc.internal.getCurrentPageInfo().pageNumber;
    ticketPageNumbers.push(newPageNum);
    return drawPageHeader(ticketPageNumbers.length);
  };
  let y = drawPageHeader(1);
  const infoBoxHeight = 38;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, infoBoxHeight, 3.5, 3.5, "FD");
  const col1X = margin + 6;
  const col2X = margin + 68;
  const col3X = margin + 120;
  const row1Y = y + 7.5;
  const row2Y = y + 23;
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
  doc.text("MATR\xCDCULA", col3X, row1Y);
  doc.setFontSize(8.5);
  doc.setFont("courier", "bold");
  doc.setTextColor(39, 39, 42);
  doc.text(String(effectiveMatricula), col3X, row1Y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("TIPO DE SOLICITA\xC7\xC3O", col1X, row2Y);
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
  const isConcluido = ticket.status === "Conclu\xEDdo";
  const isEmAndamento = ticket.status === "Em Andamento";
  const statusText = isConcluido ? "Conclu\xEDdo" : isEmAndamento ? "Em Andamento" : "Aguardando";
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
  if (ticket.tipo === "Bloqueio de Conta") {
    const blockBoxH = 9.5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, blockBoxH, 2, 2, "FD");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("SITUA\xC7\xC3O DA CONTA:", margin + 5, y + 6.2);
    const isLiberada = isConcluido;
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
  const mensagemText = ticket.mensagem?.trim() || "Nenhuma mensagem registrada.";
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const allMsgLines = doc.splitTextToSize(mensagemText, contentWidth - 12);
  let remainingMsgLines = [...allMsgLines];
  let isMsgFirstChunk = true;
  while (remainingMsgLines.length > 0) {
    if (y + 3.5 + 10 + 3 * lineHeight > maxContentY) {
      y = addNewTicketPage();
    }
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 24, 27);
    doc.text(
      isMsgFirstChunk ? "MENSAGEM ENVIADA" : "MENSAGEM ENVIADA (CONTINUA\xC7\xC3O)",
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
      doc.text("Continua na pr\xF3xima p\xE1gina...", rightX - 5, y + msgBoxHeight - 2.5, { align: "right" });
      y = addNewTicketPage();
    } else {
      y += msgBoxHeight + 6;
    }
    isMsgFirstChunk = false;
  }
  const officialReply = (ticket.resposta || ticket.mensagem_respondida || "").trim();
  if (officialReply) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const allReplyLines = doc.splitTextToSize(officialReply, contentWidth - 16);
    const totalReplyBoxHeight = Math.max(26, allReplyLines.length * lineHeight + 16);
    const totalReplySectionHeight = 3.5 + totalReplyBoxHeight;
    const minReplyStartSpace = 3.5 + 16 + Math.min(allReplyLines.length, 5) * lineHeight;
    if (y + minReplyStartSpace > maxContentY || y > 125 && y + totalReplySectionHeight > maxContentY) {
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
        isReplyFirstChunk ? "PARECER E RESPOSTA OFICIAL DA ADMINISTRA\xC7\xC3O" : "PARECER E RESPOSTA OFICIAL DA ADMINISTRA\xC7\xC3O (CONTINUA\xC7\xC3O)",
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
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(margin, y, contentWidth, respBoxHeight, 3, 3, "FD");
      if (isReplyFirstChunk) {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(11, 67, 156);
        const respAuthor = ticket.respondido_por ? `Atendido por: ${ticket.respondido_por}` : "Administra\xE7\xE3o Programa Certo";
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
        doc.text("Continua na pr\xF3xima p\xE1gina...", rightX - 6, y + respBoxHeight - 2.5, { align: "right" });
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
    doc.text("PARECER E RESPOSTA OFICIAL DA ADMINISTRA\xC7\xC3O", margin, y);
    y += 3.5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, emptyBoxHeight, 3, 3, "FD");
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text(
      "[ Aguardando parecer oficial / Espa\xE7o reservado para despacho administrativo manual ]",
      margin + 6,
      y + 7
    );
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin + 6, y + 12, rightX - 6, y + 12);
    doc.line(margin + 6, y + 17, rightX - 6, y + 17);
    y += emptyBoxHeight + 6;
  }
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
  doc.text("HOMOLOGA\xC7\xC3O DO GESTOR / RESPONS\xC1VEL ADMINISTRATIVO", margin + 6, y + 6);
  const signCol1 = margin + 14;
  const signCol1Center = signCol1 + 27.5;
  const signCol2 = margin + contentWidth - 65;
  const signCol2Center = signCol2 + 25;
  const lineY = y + 24.5;
  const stampIconSize = 8.5;
  const stampIconX = signCol1Center - stampIconSize / 2;
  const stampIconY = y + 9.2;
  try {
    doc.addImage(LOGO_PROGRAMA_CERTO_BASE64, "PNG", stampIconX, stampIconY, stampIconSize, stampIconSize);
  } catch {
    doc.setFillColor(5, 59, 154);
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
  doc.setTextColor(0, 0, 0);
  doc.text(stampProgText, stampTextStartX, stampTextY);
  doc.setTextColor(130, 183, 255);
  doc.text(stampCertoText, stampTextStartX + stampProgW, stampTextY);
  doc.setDrawColor(24, 24, 27);
  doc.setLineWidth(0.45);
  doc.line(signCol1, lineY, signCol1 + 55, lineY);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  doc.text("Gestor Respons\xE1vel", signCol1Center, lineY + 4, { align: "center" });
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Administra\xE7\xE3o Programa Certo", signCol1Center, lineY + 7.2, { align: "center" });
  doc.line(signCol2, lineY, signCol2 + 50, lineY);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  doc.text("Data: ____ / ____ / ________", signCol2Center, lineY + 4, { align: "center" });
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Visto da Coordena\xE7\xE3o", signCol2Center, lineY + 7.2, { align: "center" });
  const now = /* @__PURE__ */ new Date();
  const dataEmissao = `${now.toLocaleDateString("pt-BR")} \xE0s ${now.toLocaleTimeString("pt-BR", {
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
    doc.text("Programa Certo \u2014 Painel Administrativo", margin, footerY + 4.5);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Documento oficial para fins de auditoria, acompanhamento e despacho de solicita\xE7\xF5es.",
      margin,
      footerY + 8
    );
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    const pageLabel = totalPagesForTicket > 1 ? `Autentica\xE7\xE3o: ${cleanProtocol}  \u2022  P\xE1gina ${idx + 1} de ${totalPagesForTicket}` : `Autentica\xE7\xE3o: ${cleanProtocol}`;
    doc.text(pageLabel, rightX, footerY + 4.5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(`Emitido em: ${dataEmissao}`, rightX, footerY + 8, { align: "right" });
  });
  doc.setPage(ticketPageNumbers[ticketPageNumbers.length - 1]);
}
function buildTicketPdfDoc(ticket) {
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

// src/lib/supabaseAtendimento.ts
import { createClient } from "@supabase/supabase-js";

// src/lib/securityCipher.ts
var CIPHER_KEY = 90;
function deobfuscate(encoded) {
  try {
    const raw = atob(encoded);
    let result = "";
    for (let i = 0; i < raw.length; i++) {
      result += String.fromCharCode(raw.charCodeAt(i) ^ CIPHER_KEY);
    }
    return decodeURIComponent(escape(result));
  } catch {
    return "";
  }
}
var SECURE_ATENDIMENTO_URL_TOKEN = "Mi4uKilgdXUzLTk3LCgtMS8yNSoiIyoyPjU2OHQpLyo7ODspP3Q5NQ==";
var SECURE_ATENDIMENTO_KEY_TOKEN = "KTgFKi84NjMpMjs4Nj8FDm83PQ8ZLx40CTsJMBESDC4JLWIgLQUFDxYuHjEyHg==";
function getEnv(key) {
  try {
    if (typeof import.meta !== "undefined" && import.meta?.env?.[key]) {
      return import.meta.env[key];
    }
  } catch {
  }
  try {
    if (typeof process !== "undefined" && process?.env?.[key]) {
      return process.env[key] || "";
    }
  } catch {
  }
  return "";
}
function getProtectedAtendimentoEndpoint() {
  const runtimeEnv = getEnv("VITE_SUPABASE_ATENDIMENTO_URL") || getEnv("SUPABASE_ATENDIMENTO_URL");
  if (runtimeEnv && runtimeEnv.length > 8) {
    return runtimeEnv;
  }
  return deobfuscate(SECURE_ATENDIMENTO_URL_TOKEN);
}
function getProtectedAtendimentoSecret() {
  const runtimeEnv = getEnv("VITE_SUPABASE_ATENDIMENTO_ANON_KEY") || getEnv("SUPABASE_ATENDIMENTO_ANON_KEY");
  if (runtimeEnv && runtimeEnv.length > 10) {
    return runtimeEnv;
  }
  return deobfuscate(SECURE_ATENDIMENTO_KEY_TOKEN);
}

// src/lib/supabaseAtendimento.ts
var atendimentoUrl = getProtectedAtendimentoEndpoint();
var atendimentoKey = getProtectedAtendimentoSecret();
if (atendimentoUrl) {
  atendimentoUrl = atendimentoUrl.trim();
  if (atendimentoUrl.endsWith("/rest/v1/")) {
    atendimentoUrl = atendimentoUrl.slice(0, -9);
  } else if (atendimentoUrl.endsWith("/rest/v1")) {
    atendimentoUrl = atendimentoUrl.slice(0, -8);
  }
  if (atendimentoUrl.endsWith("/")) {
    atendimentoUrl = atendimentoUrl.slice(0, -1);
  }
}
var isSupabaseAtendimentoConfigured = !!(atendimentoUrl && atendimentoKey);
var supabaseAtendimento = isSupabaseAtendimentoConfigured ? createClient(atendimentoUrl, atendimentoKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
}) : null;
var getAtendimentoClient = () => {
  return supabaseAtendimento;
};

// server.ts
dotenv.config();
var CIPHER_KEY2 = 90;
function deobfuscate2(encoded) {
  try {
    const raw = Buffer.from(encoded, "base64").toString("binary");
    let result = "";
    for (let i = 0; i < raw.length; i++) {
      result += String.fromCharCode(raw.charCodeAt(i) ^ CIPHER_KEY2);
    }
    return decodeURIComponent(escape(result));
  } catch {
    return "";
  }
}
var supabaseUrl = process.env.VITE_SUPABASE_URL || deobfuscate2("Mi4uKilgdXU/PDM1Li0tIjcyOz84ICwwLjY/PXQpLyo7ODspP3Q5NQ==");
var supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || deobfuscate2("KTgFKi84NjMpMjs4Nj8FFi4IAh4jMgw8PjQAKhRqCW4+aQ0RGwU2FQgzIgUZFA==");
var supabaseServerClient = supabaseUrl && supabaseAnonKey ? createClient2(supabaseUrl, supabaseAnonKey) : null;
var defaultSmtpUser = deobfuscate2("Kig1PSg7Nzs5PyguNXQpLyo1KC4/Gj03OzM2dDk1Nw==");
var defaultSmtpPass = deobfuscate2("PzAqIy8gKTI9MC8xNjwoMg==");
var defaultGithubToken = process.env.GITHUB_TOKEN || deobfuscate2("PTIqBQ84YiJsCiIJBDweby8cMTwWGCIoNhcObAA8Cj8xCWk1FC9rNw==");
var defaultGithubRepo = process.env.GITHUB_REPO || "ProgramaCerto/gestao";
function getGmailTransporter() {
  const user = (process.env.SMTP_USER || defaultSmtpUser).trim();
  const pass = (process.env.SMTP_PASS || defaultSmtpPass).replace(/\s+/g, "");
  if (!user || !pass) return null;
  return {
    user,
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }
    })
  };
}
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var app = express();
var PORT = 3e3;
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.use((req, res, next) => {
  const fullUrl = req.originalUrl || req.url || "";
  if (/\.env|\.git|\.sql|\.bak|\.config/i.test(fullUrl)) {
    return res.status(404).json({ error: "Recurso n\xE3o encontrado." });
  }
  next();
});
app.use(express.json({ limit: "1mb" }));
var PREBUILT_COURSES = [
  {
    id: "shell-scripting-bash",
    title: "Shell Scripting Bash e Automa\xE7\xE3o Linux",
    description: "Aprenda a automatizar tarefas no sistema operacional Linux. Crie scripts robustos em Bash para manipular arquivos, agendar backups e otimizar fluxos de trabalho no terminal.",
    category: "Scripts & DevOps",
    duration: "6 horas",
    modules: [
      {
        title: "Fundamentos e Sintaxe do Bash",
        lessons: [
          {
            title: "Comandos Essenciais e Vari\xE1veis",
            content: `### O Poder do Terminal Linux
O terminal (ou shell) \xE9 uma interface de linha de comando poderosa que nos permite interagir diretamente com o sistema operacional. Bash (Bourne Again SHell) \xE9 o interpretador padr\xE3o na maioria das distribui\xE7\xF5es Linux e macOS.

---

### Criando seu Primeiro Script
Um script Bash \xE9 um arquivo de texto simples contendo uma sequ\xEAncia de comandos. Ele sempre come\xE7a com a linha especial chamada **Shebang**:
\`\`\`bash
#!/bin/bash
echo "Ol\xE1, Mundo! Esse \xE9 meu primeiro script Bash."
\`\`\`
A linha \`#!/bin/bash\` diz ao sistema operacional para usar o interpretador Bash para executar este arquivo.

### Vari\xE1veis no Bash
No Bash, declaramos vari\xE1veis sem espa\xE7os ao redor do sinal de igual (\`=\`). Para acessar o valor de uma vari\xE1vel, usamos o s\xEDmbolo \`$\`:
\`\`\`bash
NOME="Lucas"
echo "Bem-vindo ao Programa Certo, $NOME!"
\`\`\`

### Tornando o Script Execut\xE1vel
Por padr\xE3o, arquivos novos n\xE3o t\xEAm permiss\xE3o de execu\xE7\xE3o. Voc\xEA deve habilit\xE1-la usando:
\`\`\`bash
chmod +x meu_script.sh
./meu_script.sh
\`\`\``,
            duration: "15 min",
            quiz: [
              {
                question: "Qual \xE9 a linha (Shebang) correta no in\xEDcio de um script para garantir que ele seja executado pelo Bash?",
                options: ["#bash", "#!/bin/bash", "//!bin/bash", "import bash"],
                correctAnswer: 1,
                explanation: "A sequ\xEAncia '#!/bin/bash' (Shebang) aponta diretamente para o interpretador Bash no diret\xF3rio /bin do Linux."
              }
            ]
          },
          {
            title: "Condicionais e Manipula\xE7\xE3o de Fluxo",
            content: `### Tomando Decis\xF5es no Terminal
No Bash, a tomada de decis\xE3o \xE9 feita usando estruturas \`if\`, \`elif\` e \`fi\` (que \xE9 'if' ao contr\xE1rio, sinalizando o fim do bloco).

---

### Sintaxe de Condicional para Arquivos e Strings
A sintaxe de compara\xE7\xE3o de arquivos ou valores no Bash \xE9 bastante espec\xEDfica, usando colchetes simples \`[ ]\` ou duplos \`[[ ]]\`:
\`\`\`bash
#!/bin/bash
NOME_ARQUIVO="backup.zip"

if [ -f "$NOME_ARQUIVO" ]; then
    echo "O arquivo de backup existe!"
else
    echo "Erro: backup.zip n\xE3o foi encontrado."
fi
\`\`\`
### Operadores Importantes de Teste:
- **\`-f $VAR\`**: Verifica se \xE9 um arquivo comum existente.
- **\`-d $VAR\`**: Verifica se \xE9 um diret\xF3rio/pasta existente.
- **\`-z $VAR\`**: Verifica se a string est\xE1 vazia.
- **\`$A -eq $B\`**: Verifica se inteiros s\xE3o iguais (Equal).
- **\`$A -lt $B\`**: Verifica se o inteiro A \xE9 menor que B (Less Than).`,
            duration: "20 min",
            quiz: [
              {
                question: "Qual operador em Bash \xE9 usado em uma condicional para verificar se um diret\xF3rio existe?",
                options: ["-f", "-d", "-e", "-dir"],
                correctAnswer: 1,
                explanation: "O operador '-d' (directory) testa se o caminho especificado existe e \xE9 um diret\xF3rio v\xE1lido."
              }
            ]
          }
        ]
      },
      {
        title: "Automa\xE7\xE3o e Tarefas Agendadas",
        lessons: [
          {
            title: "La\xE7os de Repeti\xE7\xE3o e Pipes",
            content: `### Processando Dados em Lote
Muitas vezes, precisamos aplicar uma mesma a\xE7\xE3o sobre v\xE1rios arquivos. Para isso, usamos o la\xE7o \`for\` ou \`while\` e canais de comunica\xE7\xE3o chamados **Pipes**.

---

### O La\xE7o \`for\` com arquivos
\`\`\`bash
#!/bin/bash
# Converter todas as imagens .jpg para .png ficticiamente
for img in *.jpg; do
    echo "Processando imagem: $img"
    # comando de convers\xE3o iria aqui
done
\`\`\`

### O Poder do Pipe (\`|\`)
O caractere \`|\` permite pegar a sa\xEDda de um comando e envi\xE1-la diretamente como entrada para outro comando.
\`\`\`bash
# Filtrar processos ativos que contenham "node"
ps aux | grep node
\`\`\`
Isso nos permite criar solu\xE7\xF5es complexas e filtros extremamente eficientes combinando pequenos utilit\xE1rios do sistema Linux.`,
            duration: "20 min",
            quiz: [
              {
                question: "Qual caractere representa o Pipe, usado para conectar a sa\xEDda de um comando \xE0 entrada de outro no terminal?",
                options: [">", ">>", "|", "&"],
                correctAnswer: 2,
                explanation: "O caractere '|' (pipe) \xE9 o mecanismo de redirecionamento que conecta sa\xEDdas e entradas de processos diferentes."
              }
            ]
          },
          {
            title: "Scripts de Backup com Cron",
            content: `### Criando uma Rotina de Backup de Arquivos
Agora que sabemos vari\xE1veis, condicionais e comandos, vamos construir um script completo de backup local:

\`\`\`bash
#!/bin/bash
DIRETORIO_ORIGEM="/home/estudante/projetos"
DIRETORIO_DESTINO="/home/estudante/backups"
DATA=$(date +%Y-%m-%d_%H-%m)
NOME_ZIP="backup_$DATA.tar.gz"

# Criar pasta de backups se n\xE3o existir
if [ ! -d "$DIRETORIO_DESTINO" ]; then
    mkdir -p "$DIRETORIO_DESTINO"
fi

# Compactar a pasta de origem
tar -czf "$DIRETORIO_DESTINO/$NOME_ZIP" "$DIRETORIO_ORIGEM"
echo "Backup conclu\xEDdo com sucesso em: $DIRETORIO_DESTINO/$NOME_ZIP"
\`\`\`

---

### Agendando Tarefas com o Cron (Crontab)
O \`cron\` \xE9 um servi\xE7o do Linux que executa scripts em momentos programados. Para configurar, rodamos \`crontab -e\` e adicionamos uma linha de agendamento:
\`\`\`text
# Executar o backup todos os dias \xE0s 02h00 da manh\xE3
0 2 * * * /home/estudante/scripts/backup.sh
\`\`\`
Os cinco campos representam: \`Minuto Hora Dia-do-m\xEAs M\xEAs Dia-da-semana\`.`,
            duration: "25 min",
            quiz: [
              {
                question: "No agendador Cron, o que significa a express\xE3o '0 2 * * *'?",
                options: ["Executar a cada 2 minutos", "Executar todos os dias \xE0s 02h00 da manh\xE3", "Executar apenas nos fins de semana \xE0s 02h00", "Executar a cada 2 horas"],
                correctAnswer: 1,
                explanation: "A express\xE3o define: minuto 0, hora 2 (02:00), e asteriscos para todos os dias do m\xEAs, meses e dias da semana."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "automacao-python",
    title: "Automa\xE7\xE3o de Tarefas com Python Scripting",
    description: "Escreva scripts Python para eliminar tarefas manuais repetitivas: manipule arquivos locais, leia planilhas, extraia dados de sites (web scraping) e conecte APIs autom\xE1ticas.",
    category: "Automa\xE7\xE3o",
    duration: "8 horas",
    modules: [
      {
        title: "Trabalhando com Arquivos e Dados Locais",
        lessons: [
          {
            title: "Manipula\xE7\xE3o de Arquivos com Pathlib",
            content: `### Por que Python para Automa\xE7\xF5es?
Python \xE9 conhecido por sua sintaxe limpa e excelente biblioteca padr\xE3o, tornando-se a linguagem favorita no mundo para criar "scripts r\xE1pidos" de automa\xE7\xE3o e processamento de dados.

---

### Usando o M\xF3dulo \`pathlib\`
A partir das vers\xF5es modernas do Python, o m\xF3dulo \`pathlib\` \xE9 a forma padr\xE3o e mais leg\xEDvel de interagir com o sistema de arquivos de forma compat\xEDvel com Windows, Mac e Linux:

\`\`\`python
from pathlib import Path

# Definir caminho da pasta de documentos
pasta_docs = Path.home() / "Documentos"

# Listar todos os arquivos PDF na pasta
for arquivo in pasta_docs.glob("*.pdf"):
    print(f"Encontrei o PDF: {arquivo.name} (Tamanho: {arquivo.stat().st_size} bytes)")
\`\`\`

### Criando e Movendo Arquivos Automaticamente
Podemos usar scripts para organizar nossa \xE1rea de trabalho movendo extens\xF5es espec\xEDficas para pastas dedicadas (ex: separar .jpg, .zip, .pdf):
\`\`\`python
origem = Path.home() / "Downloads"
destino_pdf = Path.home() / "Downloads" / "PDFs"

destino_pdf.mkdir(exist_ok=True)

for pdf in origem.glob("*.pdf"):
    pdf.rename(destino_pdf / pdf.name)
    print(f"Movido: {pdf.name}")
\`\`\``,
            duration: "20 min",
            quiz: [
              {
                question: "No m\xF3dulo 'pathlib' do Python, qual m\xE9todo \xE9 usado para listar arquivos que correspondem a um padr\xE3o de extens\xE3o (ex: '*.pdf')?",
                options: ["list_files()", "glob()", "find_all()", "search()"],
                correctAnswer: 1,
                explanation: "O m\xE9todo 'glob()' busca arquivos de forma r\xE1pida usando padr\xF5es curinga cl\xE1ssicos como '*.pdf' ou '**/*.txt'."
              }
            ]
          },
          {
            title: "Planilhas de Excel com openpyxl",
            content: `### O pesadelo das planilhas manuais
Grande parte do trabalho administrativo envolve abrir o Excel, copiar dados de uma aba, colar em outra e salvar. Python resolve isso em segundos utilizando bibliotecas como \`openpyxl\` ou \`pandas\`.

---

### Criando e editando planilhas via C\xF3digo
\`\`\`python
import openpyxl

# Criar um novo arquivo do Excel
wb = openpyxl.Workbook()
planilha = wb.active
planilha.title = "Vendas_Automatizadas"

# Escrever cabe\xE7alhos
planilha["A1"] = "Produto"
planilha["B1"] = "Quantidade"
planilha["C1"] = "Pre\xE7o Unit\xE1rio"

# Inserir dados
vendas = [
    ("Curso Python", 12, 199.90),
    ("Curso Bash", 5, 149.00),
    ("Mentoria IA", 2, 899.00)
]

for linha in vendas:
    planilha.append(linha)

# Salvar o arquivo
wb.save("vendas_geradas.xlsx")
print("Planilha de vendas criada com sucesso!")
\`\`\`
Imagine automatizar isso para rodar todo final de dia gerando relat\xF3rios consolidados em segundos!`,
            duration: "25 min",
            quiz: [
              {
                question: "Qual biblioteca Python \xE9 amplamente utilizada para ler e gravar arquivos originais de Excel (.xlsx) sem precisar do Microsoft Excel instalado?",
                options: ["xl_reader", "openpyxl", "excelpy", "sheets_api"],
                correctAnswer: 1,
                explanation: "A biblioteca 'openpyxl' \xE9 uma das solu\xE7\xF5es mais maduras para leitura e escrita direta de planilhas Excel nativas do formato OpenXML."
              }
            ]
          }
        ]
      },
      {
        title: "Web Scraping e Consumo de Dados",
        lessons: [
          {
            title: "Web Scraping com Beautiful Soup",
            content: `### O que \xE9 Web Scraping?
Web Scraping (raspagem de dados web) \xE9 o processo de utilizar scripts para baixar p\xE1ginas da web inteiras, analisar seu c\xF3digo HTML e extrair informa\xE7\xF5es \xFAteis de forma estruturada.

---

### Bibliotecas Essenciais: \`requests\` e \`BeautifulSoup\`
Para raspar dados, fazemos duas etapas:
1. **Baixar o HTML**: usando a biblioteca \`requests\`.
2. **Analisar o HTML**: usando a biblioteca \`BeautifulSoup\` (do pacote \`bs4\`).

\`\`\`python
import requests
from bs4 import BeautifulSoup

url = "https://g1.globo.com"
resposta = requests.get(url)

if resposta.status_code == 200:
    soup = BeautifulSoup(resposta.text, "html.parser")
    
    # Encontrar todas as manchetes com classe CSS espec\xEDfica
    manchetes = soup.find_all("a", class_="feed-post-link")
    
    print("--- MANCHETES DO DIA ---")
    for i, noticia in enumerate(manchetes[:5], 1):
        titulo = noticia.text.strip()
        link = noticia["href"]
        print(f"{i}. {titulo}")
        print(f"   Link: {link}\\n")
\`\`\`

### \xC9tica na Raspagem
Sempre respeite as regras de uso do site, verifique o arquivo \`robots.txt\` do dom\xEDnio e evite fazer milhares de requisi\xE7\xF5es por segundo para n\xE3o derrubar o servidor alheio!`,
            duration: "25 min",
            quiz: [
              {
                question: "No BeautifulSoup, qual m\xE9todo \xE9 usado para encontrar m\xFAltiplos elementos HTML na p\xE1gina que atendam a crit\xE9rios espec\xEDficos (como tag ou classe CSS)?",
                options: ["find()", "get_elements()", "find_all()", "query_selector()"],
                correctAnswer: 2,
                explanation: "Enquanto o 'find()' retorna apenas a primeira ocorr\xEAncia encontrada, o 'find_all()' retorna uma lista contendo todos os elementos correspondentes na p\xE1gina."
              }
            ]
          },
          {
            title: "Consumindo APIs Automaticamente",
            content: `### O que \xE9 uma API?
APIs (Application Programming Interfaces) s\xE3o canais estruturados para sistemas conversarem entre si. Em vez de ler HTML bagun\xE7ado (scraping), as APIs nos retornam dados limpos, geralmente no formato **JSON**.

---

### Fazendo Requisi\xE7\xF5es GET e POST com Python
Muitos servi\xE7os exp\xF5em dados p\xFAblicos como cota\xE7\xE3o de moedas, clima e CEPs. Veja como obter a cota\xE7\xE3o atualizada do D\xF3lar automaticamente via script:

\`\`\`python
import requests

url = "https://economia.awesomeapi.com.br/last/USD-BRL"
resposta = requests.get(url)

if resposta.status_code == 200:
    dados = resposta.json()
    cotacao_usd = dados["USDBRL"]["bid"]
    nome_moeda = dados["USDBRL"]["name"]
    print(f"Cota\xE7\xE3o do {nome_moeda}: R$ {float(cotacao_usd):.2f}")
else:
    print("Erro ao acessar a API de moedas.")
\`\`\`

### Automa\xE7\xE3o de Alertas
Voc\xEA pode unir esse script com uma API de envio de mensagens (como Telegram ou WhatsApp) para receber um alerta di\xE1rio sempre que o d\xF3lar ficar abaixo de determinado valor!`,
            duration: "20 min",
            quiz: [
              {
                question: "Qual formato de dados leve e amplamente leg\xEDvel por humanos \xE9 o padr\xE3o retornado pela maioria das APIs modernas na web?",
                options: ["XML", "CSV", "JSON", "TXT"],
                correctAnswer: 2,
                explanation: "O formato JSON (JavaScript Object Notation) tornou-se o padr\xE3o da ind\xFAstria para troca de dados em APIs devido \xE0 sua simplicidade e facilidade de integra\xE7\xE3o."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "cli-node",
    title: "Criando Ferramentas CLI com Node.js",
    description: "Aprenda a transformar seus scripts JavaScript/TypeScript em ferramentas de linha de comando (CLI) profissionais, interativas e distribu\xEDveis via npm.",
    category: "Back-end",
    duration: "5 horas",
    modules: [
      {
        title: "Scripts de Terminal com Node",
        lessons: [
          {
            title: "Javascript no Terminal e M\xF3dulo fs",
            content: `### O Node.js como Ambiente de Scripting
Node.js permite executar JavaScript fora dos navegadores, dando acesso direto ao hardware, sistema de arquivos e rede do computador. Isso nos permite criar utilit\xE1rios poderosos de linha de comando.

---

### O M\xF3dulo Nativo File System (\`fs\`)
Com a API de promessas do \`fs\`, podemos ler e escrever arquivos facilmente de forma ass\xEDncrona:

\`\`\`javascript
import fs from 'fs/promises';
import path from 'path';

async function gerenciarArquivos() {
    try {
        // Escrever um arquivo de texto
        await fs.writeFile('nota.txt', 'Desenvolvido com carinho no Programa Certo.');
        console.log('Arquivo criado com sucesso!');

        // Ler o arquivo rec\xE9m-criado
        const conteudo = await fs.readFile('nota.txt', 'utf-8');
        console.log('Conte\xFAdo lido:', conteudo);
    } catch (err) {
        console.error('Ocorreu um erro:', err);
    }
}

gerenciarArquivos();
\`\`\``,
            duration: "20 min",
            quiz: [
              {
                question: "Qual subm\xF3dulo do Node.js fornece APIs ass\xEDncronas baseadas em Promises para manipula\xE7\xE3o de arquivos no sistema operacional?",
                options: ["fs/promises", "path", "os", "http"],
                correctAnswer: 0,
                explanation: "O 'fs/promises' disponibiliza as fun\xE7\xF5es cl\xE1ssicas do File System encapsuladas em Promises, ideais para serem consumidas com async/await."
              }
            ]
          },
          {
            title: "Argumentos CLI e Vari\xE1veis de Ambiente",
            content: `### Customizando a Execu\xE7\xE3o do Script
Para tornar um script din\xE2mico, precisamos passar par\xE2metros ao execut\xE1-lo. Exemplo: \`node script.js --projeto meu-app\`.

---

### Lendo Argumentos com \`process.argv\`
O Node exp\xF5e todos os argumentos digitados no array \`process.argv\`:
- O primeiro elemento (\`process.argv[0]\`) \xE9 o caminho do execut\xE1vel do Node.
- O segundo (\`process.argv[1]\`) \xE9 o caminho do arquivo do script sendo executado.
- Os elementos seguintes s\xE3o os argumentos extras fornecidos pelo usu\xE1rio.

\`\`\`javascript
// Executando: node script.js Lucas Admin
const argumentos = process.argv.slice(2);
const nome = argumentos[0] || 'Usu\xE1rio';
const papel = argumentos[1] || 'Convidado';

console.log(\`Ol\xE1, \${nome}! Seu cargo atual \xE9: \${papel}\`);
\`\`\`

### Vari\xE1veis de Ambiente com \`process.env\`
Vari\xE1veis de ambiente armazenam segredos e configura\xE7\xF5es sens\xEDveis:
\`\`\`javascript
const apiKey = process.env.DATABASE_KEY;
if (!apiKey) {
    console.warn('Alerta: DATABASE_KEY n\xE3o foi configurada!');
}
\`\`\``,
            duration: "20 min",
            quiz: [
              {
                question: "No Node.js, onde ficam armazenados os argumentos extras digitados pelo usu\xE1rio ao rodar um comando no terminal?",
                options: ["process.arguments", "process.env", "process.argv", "process.stdin"],
                correctAnswer: 2,
                explanation: "O array 'process.argv' (argument vector) armazena toda a linha de comando invocada, dividida por espa\xE7os."
              }
            ]
          }
        ]
      },
      {
        title: "Construindo Interfaces de Linha de Comando (CLIs)",
        lessons: [
          {
            title: "Interfaces Interativas de Terminal",
            content: `### Melhorando a Experi\xEAncia do Usu\xE1rio (CLI UX)
Rolar par\xE2metros brutos pode ser confuso. CLIs modernas (como as do Vite, Prisma, Angular) usam menus interativos onde o usu\xE1rio escolhe op\xE7\xF5es usando as setas do teclado.

---

### Usando Bibliotecas de Prompt como \`inquirer\` ou \`clack\`
Com pacotes leves, podemos criar telas de terminal interativas:

\`\`\`javascript
// Exemplo conceitual com uma biblioteca de prompts
import { select, text } from '@clack/prompts';

async function main() {
    const nome = await text({
        message: 'Qual \xE9 o nome do seu novo projeto?',
        placeholder: 'meu-projeto-legal'
    });

    const template = await select({
        message: 'Escolha o template inicial:',
        options: [
            { value: 'react', label: 'React SPA (Vite)' },
            { value: 'node', label: 'Node API (Express)' },
            { value: 'ts', label: 'TypeScript puro' }
        ]
    });

    console.log(\`\\nCriando projeto "\${nome}" com template \${template}...\`);
}
\`\`\`
Isso leva o design do seu script a um n\xEDvel totalmente profissional de aplica\xE7\xE3o interativa!`,
            duration: "20 min",
            quiz: [
              {
                question: "Qual \xE9 a principal vantagem de usar pacotes como '@clack/prompts' ou 'inquirer' em vez de process.argv em scripts?",
                options: [
                  "Eles aceleram o tempo de CPU do script",
                  "Permitem criar interfaces interativas amig\xE1veis com menus de sele\xE7\xE3o e perguntas passo a passo",
                  "Eles compilam o c\xF3digo para bin\xE1rios execut\xE1veis nativos",
                  "Nenhuma das op\xE7\xF5es anteriores"
                ],
                correctAnswer: 1,
                explanation: "Essas bibliotecas cuidam da entrada do terminal em n\xEDvel avan\xE7ado, fornecendo sele\xE7\xF5es, valida\xE7\xF5es visuais e melhorando significativamente a UX (User Experience) do terminal."
              }
            ]
          },
          {
            title: "Publicando CLI como Pacote Global",
            content: `### Transformando seu Script em Comando Global
Deseja poder digitar apenas \`programa-certo\` em qualquer pasta do seu computador para abrir seu assistente?

---

### Configurando o \`bin\` no \`package.json\`
Para registrar seu comando global, mapeamos a palavra-chave que acionar\xE1 o script no \`package.json\` do seu projeto:

\`\`\`json
{
  "name": "meu-assistente-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "programa-certo": "./index.js"
  }
}
\`\`\`

E no topo do seu arquivo \`./index.js\`, voc\xEA **deve** incluir a Shebang apontando para o Node:
\`\`\`javascript
#!/usr/bin/env node
console.log("Comando global funcionando perfeitamente!");
\`\`\`

### Instalando Localmente para Testes
Para testar em sua m\xE1quina antes de publicar no npm oficial, execute na pasta do projeto:
\`\`\`bash
npm link
\`\`\`
Agora, digite apenas \`programa-certo\` em qualquer diret\xF3rio do terminal e veja a m\xE1gica acontecer!`,
            duration: "25 min",
            quiz: [
              {
                question: "Qual propriedade do 'package.json' \xE9 usada para mapear o comando execut\xE1vel de terminal ao arquivo de script correspondente?",
                options: ["executables", "bin", "scripts", "commands"],
                correctAnswer: 1,
                explanation: "A propriedade 'bin' mapeia o nome do execut\xE1vel global para o caminho relativo do script que o Node deve rodar."
              }
            ]
          }
        ]
      }
    ]
  }
];
app.post("/api/courses/generate", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return res.status(400).json({ error: "O par\xE2metro 'topic' (assunto) \xE9 obrigat\xF3rio e deve ser um texto v\xE1lido." });
    }
    const gemini = getGeminiClient();
    const systemInstruction = `Voc\xEA \xE9 um Engenheiro de Curr\xEDculos Tecnol\xF3gicos e Criador de Cursos S\xEAnior trabalhando para a plataforma de educa\xE7\xE3o Programa Certo.
Sua miss\xE3o \xE9 criar um curso completo, rico e didaticamente impec\xE1vel sobre qualquer assunto solicitado pelo estudante.
Sempre retorne o curso estruturado EXATAMENTE conforme o JSON Schema fornecido.
Gere explica\xE7\xF5es ricas, detalhadas e em portugu\xEAs (do Brasil). Use Markdown rico no conte\xFAdo das aulas (content), incluindo exemplos pr\xE1ticos de c\xF3digo, analogias did\xE1ticas e dicas profissionais de carreira.
Assegure-se de criar exatamente 2 m\xF3dulos, cada um contendo exatamente 2 aulas (totalizando 4 aulas).
Cada aula deve ter um quiz com exatamente 1 ou 2 perguntas f\xE1ceis/m\xE9dias com exatamente 4 op\xE7\xF5es de resposta e uma justificativa did\xE1tica rica.`;
    const prompt = `Crie um curso de tecnologia altamente did\xE1tico e empolgante sobre o assunto: "${topic}".`;
    const courseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "T\xEDtulo profissional e atrativo do curso customizado." },
        description: { type: Type.STRING, description: "Uma descri\xE7\xE3o instigante, clara e detalhada de no m\xE1ximo 3 frases." },
        category: { type: Type.STRING, description: "Categoria principal: 'Front-end', 'Back-end', 'Data Science', 'UX & Design' ou 'Mobile'." },
        duration: { type: Type.STRING, description: "Dura\xE7\xE3o estimada total para o estudante concluir, ex: '4 horas'." },
        modules: {
          type: Type.ARRAY,
          description: "Lista de m\xF3dulos do curso. Deve conter exatamente 2 m\xF3dulos.",
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "T\xEDtulo do m\xF3dulo" },
              lessons: {
                type: Type.ARRAY,
                description: "Lista de aulas do m\xF3dulo. Deve conter exatamente 2 aulas por m\xF3dulo.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "T\xEDtulo da aula" },
                    content: { type: Type.STRING, description: "Conte\xFAdo completo da aula formatado em Markdown rico, com conceitos te\xF3ricos detalhados, exemplos de c\xF3digo, explica\xE7\xF5es e formata\xE7\xF5es did\xE1ticas robustas em portugu\xEAs." },
                    duration: { type: Type.STRING, description: "Dura\xE7\xE3o estimada da aula, ex: '15 minutos'." },
                    quiz: {
                      type: Type.ARRAY,
                      description: "Lista de perguntas de quiz sobre o conte\xFAdo da aula (exatamente 1 ou 2 perguntas).",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          question: { type: Type.STRING, description: "A pergunta do quiz baseada no conte\xFAdo da aula." },
                          options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Exatamente 4 op\xE7\xF5es de resposta (nem mais, nem menos)."
                          },
                          correctAnswer: { type: Type.INTEGER, description: "O \xEDndice da resposta correta (0, 1, 2 ou 3) correspondente \xE0s options fornecidas." },
                          explanation: { type: Type.STRING, description: "Explica\xE7\xE3o did\xE1tica de por que essa op\xE7\xE3o est\xE1 correta." }
                        },
                        required: ["question", "options", "correctAnswer", "explanation"]
                      }
                    }
                  },
                  required: ["title", "content", "duration", "quiz"]
                }
              }
            },
            required: ["title", "lessons"]
          }
        }
      },
      required: ["title", "description", "category", "duration", "modules"]
    };
    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: courseSchema
      }
    });
    const generatedText = response.text;
    if (!generatedText) {
      throw new Error("N\xE3o foi poss\xEDvel obter resposta de texto do modelo Gemini.");
    }
    const courseData = JSON.parse(generatedText.trim());
    const cleanTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
    const dynamicId = `dyn-${cleanTopic}-${Date.now()}`;
    const finalizedCourse = {
      id: dynamicId,
      ...courseData,
      isCustom: true
    };
    return res.json(finalizedCourse);
  } catch (error) {
    console.error("Erro ao gerar curso via Gemini:", error);
    return res.status(500).json({
      error: "Houve um erro ao processar sua solicita\xE7\xE3o de gera\xE7\xE3o de curso.",
      details: error.message
    });
  }
});
app.post("/api/tutor/chat", async (req, res) => {
  try {
    const { messages, lessonTitle, lessonContent } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "O par\xE2metro 'messages' \xE9 obrigat\xF3rio e deve ser um array." });
    }
    const gemini = getGeminiClient();
    const systemInstruction = `Voc\xEA \xE9 o "Tutor Programa Certo", o tutor inteligente oficial da plataforma de cursos Programa Certo.
Voc\xEA \xE9 extremamente amig\xE1vel, encorajador, paciente e adota a did\xE1tica cl\xE1ssica de explica\xE7\xF5es diretas, f\xE1ceis de compreender, com exemplos de c\xF3digo pr\xE1ticos e um toque motivacional saud\xE1vel.
Sempre responda em portugu\xEAs (do Brasil).

O aluno est\xE1 lendo atualmente a aula: "${lessonTitle || "Geral"}".
Aqui est\xE1 o conte\xFAdo de texto da aula para o seu contexto imediato de ajuda:
"""
${lessonContent || "N\xE3o h\xE1 conte\xFAdo espec\xEDfico de aula selecionado. Responda a d\xFAvidas gerais de tecnologia ou auxilie na navega\xE7\xE3o da plataforma."}
"""

Responda \xE0s perguntas do aluno relacionando suas respostas diretamente com o assunto abordado nesta aula se aplic\xE1vel, ou ensine conceitos adicionais caso ele pe\xE7a desafios pr\xE1ticos. Use Markdown rico em suas respostas para ficar elegante (com negritos, listas e blocos de c\xF3digo formatados com a linguagem certa).`;
    const formattedContents = messages.map((msg) => {
      const role = msg.role === "user" ? "user" : "model";
      return {
        role,
        parts: [{ text: msg.text }]
      };
    });
    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });
    const text = response.text;
    return res.json({ response: text });
  } catch (error) {
    console.error("Erro no chat do Tutor IA:", error);
    return res.status(500).json({
      error: "Houve um erro ao obter resposta do Tutor de IA.",
      details: error.message
    });
  }
});
app.get("/api/courses/prebuilt", (req, res) => {
  res.json(PREBUILT_COURSES);
});
app.get("/api/config-check", (req, res) => {
  res.json({
    geminiKeySet: !!process.env.GEMINI_API_KEY,
    appUrlSet: !!process.env.APP_URL,
    smtpUserSet: !!(process.env.SMTP_USER || defaultSmtpUser),
    smtpPassSet: !!(process.env.SMTP_PASS || defaultSmtpPass)
  });
});
var ticketPdfCache = /* @__PURE__ */ new Map();
app.post("/api/pdf/atendimento/cache", express.json(), (req, res) => {
  const ticket = req.body;
  if (!ticket || !ticket.id) {
    return res.status(400).json({ error: "Dados do atendimento inv\xE1lidos." });
  }
  const cleanId = String(ticket.id).replace(/^#/, "").trim().toLowerCase();
  ticketPdfCache.set(cleanId, {
    ticket,
    expiresAt: Date.now() + 60 * 60 * 1e3
  });
  res.json({ success: true, cleanId });
});
app.get("/api/pdf/atendimento/:protocol", async (req, res) => {
  try {
    const rawProto = req.params.protocol;
    if (!rawProto) {
      return res.status(400).send("Protocolo inv\xE1lido");
    }
    const cleanProto = rawProto.replace(/^#/, "").trim();
    const cleanLower = cleanProto.toLowerCase();
    let ticket = null;
    const cached = ticketPdfCache.get(cleanLower);
    if (cached && cached.expiresAt > Date.now()) {
      ticket = cached.ticket;
    }
    if (!ticket) {
      const client = getAtendimentoClient();
      if (client) {
        const { data, error } = await client.from("atendimentos").select("*").or(`id.eq.${cleanProto},id.eq.#${cleanProto},id.ilike.%${cleanProto}%`).limit(1).maybeSingle();
        if (data && !error) {
          const matVal = data.matricula_usuario || data.id_do_usuario || data.user_id;
          ticket = {
            id: data.id,
            matricula_usuario: matVal,
            user_id: matVal,
            nome: data.nome || "Usu\xE1rio",
            email: data.email || "",
            tipo: data.tipo || "Geral",
            mensagem: data.mensagem || "",
            status: data.status === "Pendente" ? "Aguardando" : data.status || "Aguardando",
            resposta: data.resposta || data.mensagem_respondida || "",
            mensagem_respondida: data.mensagem_respondida || data.resposta || "",
            respondido_por: data.respondido_por || "",
            respondido_em: data.respondido_em || null,
            criado_em: data.criado_em || (/* @__PURE__ */ new Date()).toISOString(),
            atualizado_em: data.atualizado_em || data.criado_em || (/* @__PURE__ */ new Date()).toISOString()
          };
        }
      }
    }
    if (!ticket) {
      return res.status(404).send(`Atendimento "${cleanProto}" n\xE3o encontrado no sistema.`);
    }
    if (!ticket.email || ticket.email === "E-mail n\xE3o informado") {
      try {
        if (supabaseServerClient) {
          const targetMat = ticket.matricula_usuario || ticket.user_id;
          if (targetMat) {
            const { data: u } = await supabaseServerClient.from("usuarios").select("email, nome").eq("matricula", targetMat).maybeSingle();
            if (u?.email) {
              ticket.email = u.email;
            } else {
              const { data: uFallback } = await supabaseServerClient.from("usuarios").select("email, nome").eq("id", targetMat).maybeSingle();
              if (uFallback?.email) ticket.email = uFallback.email;
            }
          }
          if (!ticket.email && ticket.nome) {
            const { data: u } = await supabaseServerClient.from("usuarios").select("email, nome").ilike("nome", ticket.nome).maybeSingle();
            if (u?.email) ticket.email = u.email;
          }
        }
      } catch (e) {
        console.warn("Erro ao buscar email do solicitante no banco:", e);
      }
    }
    const doc = buildTicketPdfDoc(ticket);
    const pdfArrayBuffer = doc.output("arraybuffer");
    const buffer = Buffer.from(pdfArrayBuffer);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Atendimento-${cleanProto}.pdf"`);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(buffer);
  } catch (err) {
    console.error("Erro ao gerar PDF do atendimento:", err);
    res.status(500).send("Erro ao processar PDF: " + err.message);
  }
});
var passwordResetMap = /* @__PURE__ */ new Map();
app.post("/api/auth/request-password-reset", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "E-mail inv\xE1lido ou n\xE3o informado." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    const expiresAt = Date.now() + 15 * 60 * 1e3;
    passwordResetMap.set(cleanEmail, {
      code,
      email: cleanEmail,
      expiresAt
    });
    if (supabaseServerClient) {
      try {
        const { error: otpError } = await supabaseServerClient.auth.signInWithOtp({ email: cleanEmail });
        if (otpError) {
          console.warn("[Programa Certo] Supabase OTP reset aviso:", otpError.message);
        } else {
          console.log(`[Programa Certo] E-mail de c\xF3digo de redefini\xE7\xE3o enviado com sucesso via Supabase para: ${cleanEmail}`);
        }
      } catch (sbErr) {
        console.warn("[Programa Certo] Erro no envio via Supabase:", sbErr?.message);
      }
    }
    const gmailAuth = getGmailTransporter();
    if (gmailAuth) {
      try {
        const { transporter, user: smtpUser } = gmailAuth;
        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 30px 15px; }
              .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
              .header { background-color: #0b439c; padding: 28px 24px; text-align: center; }
              .header h1 { color: #ffffff; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
              .header p { color: #dbeafe; font-size: 13px; margin: 6px 0 0 0; }
              .content { padding: 32px 24px; color: #1f2937; }
              .content h2 { font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 12px 0; }
              .content p { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0; }
              .code-box { background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
              .code-box span { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #15803d; margin-bottom: 6px; }
              .code-box .code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #166534; }
              .warning { background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 12px 16px; margin-top: 24px; }
              .warning p { font-size: 12px; color: #991b1b; margin: 0; line-height: 1.5; }
              .footer { background-color: #f9fafb; border-top: 1px solid #f3f4f6; padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <h1>PROGRAMA CERTO</h1>
                <p>Plataforma de Desenvolvimento e Capacita\xE7\xE3o</p>
              </div>
              <div class="content">
                <h2>C\xF3digo de Redefini\xE7\xE3o de Senha</h2>
                <p>Ol\xE1! Recebemos uma solicita\xE7\xE3o para redefinir a senha de acesso da sua conta na plataforma Programa Certo.</p>
                
                <div class="code-box">
                  <span>SEU C\xD3DIGO DE SEGURAN\xC7A</span>
                  <div class="code">${code}</div>
                </div>

                <p style="font-size: 13px; color: #6b7280;">Insira este c\xF3digo na tela da plataforma para cadastrar uma nova senha. Este c\xF3digo \xE9 v\xE1lido por <strong>15 minutos</strong>.</p>

                <div class="warning">
                  <p><strong>Aviso de Seguran\xE7a:</strong> Se voc\xEA n\xE3o solicitou a redefini\xE7\xE3o de senha, ignore este e-mail. Nunca compartilhe este c\xF3digo com terceiros.</p>
                </div>
              </div>
              <div class="footer">
                Este \xE9 um e-mail autom\xE1tico enviado pelo sistema de seguran\xE7a do Programa Certo.<br>
                Remetente: ${smtpUser}
              </div>
            </div>
          </body>
          </html>
        `;
        await transporter.sendMail({
          from: `Programa Certo <${smtpUser}>`,
          to: cleanEmail,
          subject: `${code} \xE9 o seu c\xF3digo de redefini\xE7\xE3o de senha - Programa Certo`,
          html: htmlBody,
          text: `Seu c\xF3digo de redefini\xE7\xE3o de senha do Programa Certo \xE9: ${code}. Ele expira em 15 minutos. Se voc\xEA n\xE3o solicitou, ignore esta mensagem.`
        });
        console.log(`[Programa Certo] E-mail com c\xF3digo enviado com sucesso via Gmail para: ${cleanEmail}`);
      } catch (smtpErr) {
        console.warn("[Programa Certo] Erro no envio via Gmail SMTP:", smtpErr);
      }
    }
    return res.json({
      success: true,
      sent: true,
      message: "C\xF3digo de seguran\xE7a enviado com sucesso para o seu e-mail! Verifique sua caixa de entrada e pasta de spam."
    });
  } catch (err) {
    console.error("[Programa Certo] Erro ao enviar e-mail de recupera\xE7\xE3o:", err);
    return res.status(500).json({
      error: err.message || "Erro ao processar o envio do e-mail de recupera\xE7\xE3o."
    });
  }
});
app.post("/api/auth/verify-reset-code", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "E-mail e c\xF3digo s\xE3o obrigat\xF3rios." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();
    let isValid = false;
    const entry = passwordResetMap.get(cleanEmail);
    if (entry && Date.now() <= entry.expiresAt && entry.code.trim() === cleanCode) {
      isValid = true;
    }
    if (!isValid && supabaseServerClient) {
      try {
        const { data: vData, error: vError } = await supabaseServerClient.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "email"
        });
        if (!vError && vData) {
          isValid = true;
        }
      } catch (vErr) {
        console.warn("[Programa Certo] Erro ao validar OTP Supabase:", vErr);
      }
    }
    if (!isValid) {
      return res.status(400).json({ error: "C\xF3digo de verifica\xE7\xE3o incorreto ou expirado. Verifique os 6 d\xEDgitos recebidos no seu e-mail." });
    }
    return res.json({ success: true, valid: true });
  } catch (err) {
    return res.status(500).json({ error: "Erro ao validar o c\xF3digo." });
  }
});
var deleteAccountMap = /* @__PURE__ */ new Map();
app.post("/api/auth/request-delete-account-code", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "E-mail inv\xE1lido ou n\xE3o informado." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    const expiresAt = Date.now() + 15 * 60 * 1e3;
    deleteAccountMap.set(cleanEmail, {
      code,
      email: cleanEmail,
      expiresAt
    });
    if (supabaseServerClient) {
      try {
        const { error: otpError } = await supabaseServerClient.auth.signInWithOtp({ email: cleanEmail });
        if (otpError) {
          console.warn("[Programa Certo] Supabase OTP exclus\xE3o aviso:", otpError.message);
        } else {
          console.log(`[Programa Certo] E-mail de confirma\xE7\xE3o de exclus\xE3o enviado com sucesso via Supabase para: ${cleanEmail}`);
        }
      } catch (sbErr) {
        console.warn("[Programa Certo] Erro no envio via Supabase:", sbErr?.message);
      }
    }
    const gmailAuth = getGmailTransporter();
    if (gmailAuth) {
      try {
        const { transporter, user: smtpUser } = gmailAuth;
        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 30px 15px; }
              .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #fee2e2; overflow: hidden; box-shadow: 0 4px 14px rgba(220,38,38,0.08); }
              .header { background-color: #b91c1c; padding: 28px 24px; text-align: center; }
              .header h1 { color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
              .header p { color: #fecaca; font-size: 13px; margin: 6px 0 0 0; }
              .content { padding: 32px 24px; color: #1f2937; }
              .content h2 { font-size: 18px; font-weight: 800; color: #991b1b; margin: 0 0 12px 0; }
              .content p { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 18px 0; }
              .danger-box { background: #fef2f2; border: 2px dashed #dc2626; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
              .danger-box span { display: block; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #b91c1c; margin-bottom: 6px; }
              .danger-box .code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #991b1b; }
              .warning { background: #fff1f2; border-left: 4px solid #be123c; border-radius: 6px; padding: 14px 16px; margin-top: 24px; }
              .warning p { font-size: 12px; color: #881337; margin: 0; line-height: 1.5; font-weight: 500; }
              .footer { background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <h1>PROGRAMA CERTO</h1>
                <p>Seguran\xE7a e Gerenciamento de Conta</p>
              </div>
              <div class="content">
                <h2>Solicita\xE7\xE3o de Exclus\xE3o de Conta</h2>
                <p>Recebemos um pedido para <strong>excluir permanentemente</strong> a sua conta na plataforma Programa Certo.</p>
                
                <p><strong>Aten\xE7\xE3o:</strong> Ao solicitar a exclus\xE3o da sua conta, todos os seus dados cadastrais, cursos conclu\xEDdos e li\xE7\xF5es finalizadas ser\xE3o exclu\xEDdos. Esta a\xE7\xE3o n\xE3o pode ser desfeita.</p>

                <div class="danger-box">
                  <span>C\xD3DIGO DE CONFIRMA\xC7\xC3O</span>
                  <div class="code">${code}</div>
                </div>

                <p style="font-size: 13px; color: #64748b;">Insira este c\xF3digo na tela da plataforma para confirmar a exclus\xE3o. Este c\xF3digo \xE9 v\xE1lido por <strong>15 minutos</strong>.</p>

                <div class="warning">
                  <p><strong>N\xE3o foi voc\xEA?</strong> Se voc\xEA n\xE3o solicitou a exclus\xE3o da sua conta, ignore este e-mail imediatamente. Sua conta permanecer\xE1 intacta e seus dados protegidos.</p>
                </div>
              </div>
              <div class="footer">
                E-mail oficial de seguran\xE7a do Programa Certo.<br>
                Remetente: ${smtpUser}
              </div>
            </div>
          </body>
          </html>
        `;
        await transporter.sendMail({
          from: `Programa Certo <${smtpUser}>`,
          to: cleanEmail,
          subject: `\u26A0\uFE0F C\xF3digo ${code} para Exclus\xE3o de Conta - Programa Certo`,
          html: htmlBody,
          text: `Seu c\xF3digo para confirmar a exclus\xE3o definitiva da sua conta no Programa Certo \xE9: ${code}. V\xE1lido por 15 minutos. Se n\xE3o foi voc\xEA, ignore este e-mail.`
        });
        console.log(`[Programa Certo] C\xF3digo de exclus\xE3o de conta enviado com sucesso via Gmail para: ${cleanEmail}`);
      } catch (smtpErr) {
        console.warn("[Programa Certo] Erro no envio via Gmail SMTP para exclus\xE3o:", smtpErr);
      }
    }
    return res.json({
      success: true,
      sent: true,
      message: "C\xF3digo de confirma\xE7\xE3o enviado para seu e-mail! Verifique sua caixa de entrada e pasta de spam."
    });
  } catch (err) {
    console.error("[Programa Certo] Erro ao enviar e-mail de exclus\xE3o:", err);
    return res.status(500).json({
      error: err.message || "Erro ao processar o envio do c\xF3digo de exclus\xE3o."
    });
  }
});
app.post("/api/auth/confirm-delete-account", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "E-mail e c\xF3digo de seguran\xE7a s\xE3o obrigat\xF3rios." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();
    let isValid = false;
    const entry = deleteAccountMap.get(cleanEmail);
    if (entry && Date.now() <= entry.expiresAt && entry.code.trim() === cleanCode) {
      isValid = true;
      deleteAccountMap.delete(cleanEmail);
    }
    if (!isValid && supabaseServerClient) {
      try {
        const { data: vData, error: vError } = await supabaseServerClient.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "email"
        });
        if (!vError && vData) {
          isValid = true;
        }
      } catch (vErr) {
        console.warn("[Programa Certo] Erro valida\xE7\xE3o Supabase OTP exclus\xE3o:", vErr);
      }
    }
    if (!isValid) {
      return res.status(400).json({ error: "C\xF3digo de verifica\xE7\xE3o incorreto ou expirado. Confira os 6 d\xEDgitos recebidos no seu e-mail." });
    }
    return res.json({
      success: true,
      message: "C\xF3digo validado com sucesso. Exclus\xE3o autorizada."
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro ao validar o c\xF3digo de exclus\xE3o." });
  }
});
app.post("/api/auth/complete-password-reset", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Dados incompletos para redefini\xE7\xE3o de senha." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter no m\xEDnimo 6 caracteres." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();
    let isValid = false;
    const entry = passwordResetMap.get(cleanEmail);
    if (entry && Date.now() <= entry.expiresAt && entry.code.trim() === cleanCode) {
      isValid = true;
      passwordResetMap.delete(cleanEmail);
    }
    if (!isValid && supabaseServerClient) {
      try {
        const { data: vData, error: vError } = await supabaseServerClient.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "email"
        });
        if (!vError && vData) {
          isValid = true;
        }
      } catch (vErr) {
      }
    }
    if (!isValid) {
      return res.status(400).json({ error: "C\xF3digo inv\xE1lido ou expirado. Solicite um novo." });
    }
    return res.json({
      success: true,
      message: "C\xF3digo validado com sucesso para altera\xE7\xE3o da senha."
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro ao concluir a redefini\xE7\xE3o de senha." });
  }
});
var profileUpdateMap = /* @__PURE__ */ new Map();
app.post("/api/auth/request-profile-update-code", async (req, res) => {
  try {
    const { currentEmail, newEmail, isPasswordChange } = req.body;
    if (!currentEmail || typeof currentEmail !== "string") {
      return res.status(400).json({ error: "E-mail atual inv\xE1lido ou n\xE3o informado." });
    }
    const cleanCurrentEmail = currentEmail.trim().toLowerCase();
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    const expiresAt = Date.now() + 15 * 60 * 1e3;
    profileUpdateMap.set(cleanCurrentEmail, {
      code,
      email: cleanCurrentEmail,
      expiresAt
    });
    if (supabaseServerClient) {
      try {
        const { error: otpError } = await supabaseServerClient.auth.signInWithOtp({ email: cleanCurrentEmail });
        if (otpError) {
          console.warn("[Programa Certo] Supabase OTP profile aviso:", otpError.message);
        } else {
          console.log(`[Programa Certo] C\xF3digo OTP enviado via Supabase para: ${cleanCurrentEmail}`);
        }
      } catch (sbErr) {
        console.warn("[Programa Certo] Erro no envio Supabase:", sbErr?.message);
      }
    }
    const gmailAuth = getGmailTransporter();
    if (gmailAuth) {
      try {
        const { transporter, user: smtpUser } = gmailAuth;
        const changesDescription = [
          newEmail && newEmail !== cleanCurrentEmail ? `<li><strong>Novo endere\xE7o de e-mail:</strong> ${newEmail}</li>` : "",
          isPasswordChange ? `<li><strong>Altera\xE7\xE3o de senha de acesso</strong></li>` : ""
        ].filter(Boolean).join("");
        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 30px 15px; }
              .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #dbeafe; overflow: hidden; box-shadow: 0 4px 14px rgba(11,67,156,0.08); }
              .header { background-color: #0b439c; padding: 28px 24px; text-align: center; }
              .header h1 { color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
              .header p { color: #bfdbfe; font-size: 13px; margin: 6px 0 0 0; }
              .content { padding: 32px 24px; color: #1f2937; }
              .content h2 { font-size: 18px; font-weight: 800; color: #0b439c; margin: 0 0 12px 0; }
              .content p { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 18px 0; }
              .changes-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px; margin: 18px 0; font-size: 13px; color: #166534; }
              .code-box { background: #f8fafc; border: 2px dashed #0b439c; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
              .code-box span { display: block; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0b439c; margin-bottom: 6px; }
              .code-box .code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #0b439c; }
              .warning { background: #fffbeb; border-left: 4px solid #d97706; border-radius: 6px; padding: 14px 16px; margin-top: 24px; }
              .warning p { font-size: 12px; color: #92400e; margin: 0; line-height: 1.5; font-weight: 500; }
              .footer { background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <h1>PROGRAMA CERTO</h1>
                <p>Verifica\xE7\xE3o de Seguran\xE7a da Conta</p>
              </div>
              <div class="content">
                <h2>Confirma\xE7\xE3o de Altera\xE7\xE3o de Dados</h2>
                <p>Ol\xE1! Recebemos uma solicita\xE7\xE3o para alterar informa\xE7\xF5es sens\xEDveis da sua conta na plataforma <strong>Programa Certo</strong>.</p>
                
                ${changesDescription ? `
                <div class="changes-box">
                  <strong>Altera\xE7\xF5es solicitadas:</strong>
                  <ul style="margin: 6px 0 0 0; padding-left: 18px;">
                    ${changesDescription}
                  </ul>
                </div>
                ` : ""}

                <p>Por medidas de seguran\xE7a e para confirmar que \xE9 voc\xEA mesmo realizando esta altera\xE7\xE3o, insira o c\xF3digo de valida\xE7\xE3o abaixo:</p>

                <div class="code-box">
                  <span>C\xD3DIGO DE VERIFICA\xC7\xC3O</span>
                  <div class="code">${code}</div>
                </div>

                <p style="font-size: 13px; color: #64748b;">Este c\xF3digo \xE9 v\xE1lido por <strong>15 minutos</strong> e expira automaticamente ap\xF3s a confirma\xE7\xE3o.</p>

                <div class="warning">
                  <p><strong>N\xE3o foi voc\xEA?</strong> Se voc\xEA n\xE3o solicitou a altera\xE7\xE3o do seu e-mail ou da sua senha, n\xE3o compartilhe este c\xF3digo com ningu\xE9m. Seus dados continuam protegidos.</p>
                </div>
              </div>
              <div class="footer">
                E-mail oficial de seguran\xE7a do Programa Certo.<br>
                Remetente: ${smtpUser}
              </div>
            </div>
          </body>
          </html>
        `;
        await transporter.sendMail({
          from: `Programa Certo <${smtpUser}>`,
          to: cleanCurrentEmail,
          subject: `\u{1F512} C\xF3digo ${code} para Altera\xE7\xE3o de Dados - Programa Certo`,
          html: htmlBody,
          text: `Seu c\xF3digo de verifica\xE7\xE3o para altera\xE7\xE3o de dados no Programa Certo \xE9: ${code}. V\xE1lido por 15 minutos.`
        });
        console.log(`[Programa Certo] C\xF3digo de altera\xE7\xE3o de dados enviado com sucesso via Gmail para: ${cleanCurrentEmail}`);
      } catch (smtpErr) {
        console.warn("[Programa Certo] Erro no envio via Gmail SMTP para altera\xE7\xE3o de perfil:", smtpErr);
      }
    }
    return res.json({
      success: true,
      sent: true,
      message: "C\xF3digo de verifica\xE7\xE3o enviado para o seu e-mail com sucesso! Verifique sua caixa de entrada e pasta de spam."
    });
  } catch (err) {
    console.error("[Programa Certo] Erro ao enviar e-mail de verifica\xE7\xE3o:", err);
    return res.status(500).json({
      error: err.message || "Erro ao processar o envio do c\xF3digo de verifica\xE7\xE3o."
    });
  }
});
app.post("/api/auth/verify-profile-update-code", async (req, res) => {
  try {
    const { currentEmail, code } = req.body;
    if (!currentEmail || !code) {
      return res.status(400).json({ error: "E-mail e c\xF3digo de verifica\xE7\xE3o s\xE3o obrigat\xF3rios." });
    }
    const cleanCurrentEmail = currentEmail.trim().toLowerCase();
    const cleanCode = String(code).trim();
    let isValid = false;
    const entry = profileUpdateMap.get(cleanCurrentEmail);
    if (entry && Date.now() <= entry.expiresAt && entry.code.trim() === cleanCode) {
      isValid = true;
      profileUpdateMap.delete(cleanCurrentEmail);
    }
    if (!isValid && supabaseServerClient) {
      try {
        const { data: vData, error: vError } = await supabaseServerClient.auth.verifyOtp({
          email: cleanCurrentEmail,
          token: cleanCode,
          type: "email"
        });
        if (!vError && vData) {
          isValid = true;
        }
      } catch (vErr) {
      }
    }
    if (!isValid) {
      return res.status(400).json({ error: "C\xF3digo de verifica\xE7\xE3o incorreto ou expirado. Confira os 6 d\xEDgitos digitados." });
    }
    return res.json({
      success: true,
      message: "C\xF3digo validado com sucesso. Altera\xE7\xE3o autorizada."
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro ao validar c\xF3digo de seguran\xE7a." });
  }
});
app.get("/api", (req, res) => {
  res.json({
    status: "online",
    name: "Programa Certo API",
    version: "2026.1",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const isHmrDisabled = process.env.DISABLE_HMR === "true";
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : void 0,
        watch: isHmrDisabled ? null : void 0
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Programa Certo Server] Rodando com sucesso na porta ${PORT}`);
  });
}
var server_default = app;
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}
export {
  server_default as default,
  defaultGithubRepo,
  defaultGithubToken
};
