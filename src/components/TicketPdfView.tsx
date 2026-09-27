import React, { useEffect, useState } from "react";
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  ExternalLink,
  ShieldCheck, 
  FileText,
  Check,
  User,
  Mail
} from "lucide-react";
import { AtendimentoItem } from "../App";
import { getAtendimentoClient } from "../lib/supabaseAtendimento";
import { supabase } from "../lib/supabase";
import { generateTicketPdf, generateTicketPdfBlobUrl, openTicketPdfInBrowser, printTicketsInBrowser } from "../lib/generateTicketPdf";
import { LOGO_PROGRAMA_CERTO_URL } from "../lib/logoBase64";

interface TicketPdfViewProps {
  protocolo: string;
  initialTicket?: AtendimentoItem | null;
  onBack?: () => void;
}

export const TicketPdfView: React.FC<TicketPdfViewProps> = ({
  protocolo,
  initialTicket,
  onBack
}) => {
  const [ticket, setTicket] = useState<AtendimentoItem | null>(initialTicket || null);
  const [loading, setLoading] = useState<boolean>(!initialTicket);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  const cleanProtocol = protocolo.startsWith("#") ? protocolo : `#${protocolo}`;

  useEffect(() => {
    document.title = `Comprovante ${cleanProtocol} - Programa Certo`;
  }, [cleanProtocol]);

  // Carregar dados do atendimento se não fornecido
  useEffect(() => {
    let isMounted = true;

    const fetchTicket = async () => {
      // Se já temos o initialTicket e ele possui email, usa diretamente
      if (
        initialTicket && 
        (initialTicket.id.toLowerCase() === protocolo.toLowerCase() || 
         initialTicket.id.toLowerCase().replace("#", "") === protocolo.toLowerCase().replace("#", "") ||
         initialTicket.id.toLowerCase().replace("atend-", "") === protocolo.toLowerCase().replace("atend-", ""))
      ) {
        let t = { ...initialTicket };
        // Se faltar email, busca no usuarios
        if (!t.email?.trim() && (t.user_id || t.nome)) {
          try {
            const { data: usr } = await supabase
              .from("usuarios")
              .select("email, nome")
              .or(`id.eq.${t.user_id || "00000000-0000-0000-0000-000000000000"},nome.ilike.${t.nome}`)
              .limit(1)
              .maybeSingle();
            if (usr?.email) {
              t.email = usr.email;
            }
          } catch (e) {}
        }
        if (isMounted) {
          setTicket(t);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      // 1. Tenta recuperar do localStorage
      try {
        const stored = localStorage.getItem("programacerto_atendimentos");
        if (stored) {
          const list: AtendimentoItem[] = JSON.parse(stored);
          const found = list.find(t => 
            t.id.toLowerCase() === protocolo.toLowerCase() ||
            t.id.toLowerCase().replace("#", "") === protocolo.toLowerCase().replace("#", "") ||
            t.id.toLowerCase().replace("atend-", "") === protocolo.toLowerCase().replace("atend-", "")
          );
          if (found && isMounted) {
            let t = { ...found };
            if (!t.email?.trim() && (t.user_id || t.nome)) {
              try {
                const { data: usr } = await supabase
                  .from("usuarios")
                  .select("email, nome")
                  .or(`id.eq.${t.user_id || "00000000-0000-0000-0000-000000000000"},nome.ilike.${t.nome}`)
                  .limit(1)
                  .maybeSingle();
                if (usr?.email) t.email = usr.email;
              } catch (e) {}
            }
            setTicket(t);
            setLoading(false);
            return;
          }
        }
      } catch (e) {}

      // 2. Busca no banco Supabase
      try {
        const client = getAtendimentoClient();
        if (client) {
          const cleanP = protocolo.trim();
          const { data, error: dbError } = await client
            .from("atendimentos")
            .select("*")
            .or(`id.eq.${cleanP},id.ilike.%${cleanP}%`)
            .limit(1)
            .maybeSingle();

          if (dbError) {
            console.warn("Erro ao buscar no Supabase:", dbError);
          } else if (data && isMounted) {
            let userEmail = data.email || "";
            // Buscar email correspondente na tabela usuarios
            if (!userEmail && (data.id_do_usuario || data.nome)) {
              try {
                const { data: usr } = await supabase
                  .from("usuarios")
                  .select("email, nome")
                  .or(`id.eq.${data.id_do_usuario || "00000000-0000-0000-0000-000000000000"},nome.ilike.${data.nome}`)
                  .limit(1)
                  .maybeSingle();
                if (usr?.email) userEmail = usr.email;
              } catch (e) {}
            }

            const parsed: AtendimentoItem = {
              id: data.id,
              user_id: data.id_do_usuario || data.user_id,
              nome: data.nome || "Usuário",
              email: userEmail,
              tipo: data.tipo || "Geral",
              mensagem: data.mensagem || "",
              status: data.status === "Pendente" ? "Aguardando" : (data.status || "Aguardando"),
              resposta: data.resposta || data.mensagem_respondida || "",
              mensagem_respondida: data.mensagem_respondida || data.resposta || "",
              respondido_por: data.respondido_por || "",
              respondido_em: data.respondido_em || null,
              criado_em: data.criado_em || new Date().toISOString(),
              atualizado_em: data.atualizado_em || data.criado_em || new Date().toISOString()
            };
            setTicket(parsed);
            setLoading(false);
            return;
          }
        }
      } catch (err: any) {
        console.error("Falha ao carregar atendimento:", err);
      }

      if (isMounted) {
        setError(`Atendimento com o protocolo "${protocolo}" não foi localizado no sistema.`);
        setLoading(false);
      }
    };

    fetchTicket();

    return () => {
      isMounted = false;
    };
  }, [protocolo, initialTicket]);

  // Gerar o Blob URL do PDF oficial para o visualizador do Chrome
  useEffect(() => {
    if (!ticket) return;

    let active = true;
    let urlCreated: string | null = null;

    try {
      urlCreated = generateTicketPdfBlobUrl(ticket);
      if (active) {
        setPdfBlobUrl(urlCreated);
      }
    } catch (err) {
      console.error("Erro ao gerar PDF Blob:", err);
    }

    return () => {
      active = false;
      if (urlCreated) {
        URL.revokeObjectURL(urlCreated);
      }
    };
  }, [ticket]);

  const handleDownloadPdf = () => {
    if (!ticket) return;
    const success = generateTicketPdf(ticket);
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    }
  };

  const handleOpenInNewTab = () => {
    if (ticket) {
      openTicketPdfInBrowser(ticket);
    }
  };

  const handlePrint = () => {
    if (!ticket) return;
    setPrintFeedback("Abrindo painel de impressão...");
    printTicketsInBrowser([ticket]);
    setTimeout(() => setPrintFeedback(null), 2500);
  };

  const handleBackToApp = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = "/atendimento";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="bg-zinc-800 text-white rounded-2xl p-8 border border-zinc-700 shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full text-center">
          <div className="w-10 h-10 border-3 border-zinc-600 border-t-[#0b439c] rounded-full animate-spin" />
          <div>
            <h3 className="font-bold text-white text-sm">Carregando arquivo PDF...</h3>
            <p className="text-xs text-zinc-400 mt-1">Protocolo: {cleanProtocol}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="bg-zinc-800 text-white rounded-2xl p-8 border border-zinc-700 shadow-2xl flex flex-col items-center gap-4 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-white text-base">Atendimento não encontrado</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{error || "Não foi possível carregar os dados deste atendimento."}</p>
          </div>
          <button
            onClick={handleBackToApp}
            className="mt-2 px-5 py-2.5 bg-[#0b439c] text-white font-bold text-xs rounded-xl hover:bg-blue-800 transition-all cursor-pointer flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Central de Atendimento</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-zinc-900 text-white font-sans overflow-hidden">
      
      {/* Barra de Ferramentas Superior Oficial do Visualizador PDF */}
      <header className="h-16 bg-zinc-900 border-b border-zinc-800 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20">
        
        {/* Lado Esquerdo: Voltar + Logo + Identificação do Documento */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleBackToApp}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
            title="Voltar para a tela anterior"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
            <span className="hidden sm:inline">Voltar</span>
          </button>

          <div className="h-6 w-px bg-zinc-800 hidden sm:block shrink-0" />

          {/* Logo e Nome do Documento */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white p-0.5 border border-zinc-700 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src={LOGO_PROGRAMA_CERTO_URL}
                alt="Logo Programa Certo"
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/logo-programa-certo.png";
                }}
              />
            </div>
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black text-xs sm:text-sm text-white truncate leading-none">
                  Programa Certo
                </span>
                <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800 shrink-0">
                  {ticket.id}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1 truncate">
                <span className="flex items-center gap-1 truncate">
                  <User className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span className="font-semibold text-zinc-300">{ticket.nome || "Não informado"}</span>
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1 truncate font-mono text-[10px] text-zinc-400">
                  <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span>{ticket.email || "E-mail não informado"}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Ações de PDF (Abrir em Nova Aba, Imprimir, Baixar) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Botão para Abrir em Nova Aba do Navegador (Sem bloqueio de conta Google AI Studio) */}
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Abrir PDF em outra aba para qualquer usuário"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">Abrir em Outra Aba</span>
          </button>

          {/* Botão de Impressão Nativa */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Imprimir documento"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          {/* Botão para Baixar o arquivo PDF */}
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 bg-[#0b439c] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="Baixar arquivo PDF no computador ou celular"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Baixar PDF</span>
          </button>
        </div>
      </header>

      {/* Banner de Feedback Transitório */}
      {(downloadSuccess || printFeedback) && (
        <div className="bg-emerald-950/80 border-b border-emerald-800 px-4 py-2 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1 shrink-0">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{printFeedback || "Arquivo PDF baixado com sucesso no seu dispositivo!"}</span>
        </div>
      )}

      {/* Área Central: Visualizador Nativo do Chrome do Arquivo PDF */}
      <main className="flex-1 w-full h-[calc(100vh-64px)] bg-[#323639] relative overflow-hidden flex flex-col">
        {pdfBlobUrl ? (
          <iframe
            id="native-pdf-iframe"
            src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full flex-1 border-0 bg-[#323639]"
            title={`Comprovante ${ticket.id} - Programa Certo`}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-6 text-center">
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin mb-3" />
            <p className="text-xs">Renderizando arquivo PDF oficial...</p>
          </div>
        )}
      </main>
    </div>
  );
};
