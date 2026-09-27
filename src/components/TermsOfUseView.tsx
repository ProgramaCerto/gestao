import React, { useState } from "react";
import {
  FileText,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react";
import {
  OFFICIAL_TERMS_CLAUSES,
  OFFICIAL_PRIVACY_CLAUSES,
  TERMS_PLAIN_TEXT_FOR_CLIPBOARD,
  PRIVACY_PLAIN_TEXT_FOR_CLIPBOARD,
} from "../data/termsOfUse";

interface TermsOfUseViewProps {
  isModal?: boolean;
  initialTab?: "termos" | "privacidade" | "lgpd";
  onAcceptAndClose?: () => void;
  onClose?: () => void;
  termsCopied?: boolean;
  onCopyTerms?: () => void;
}

export const TermsOfUseView: React.FC<TermsOfUseViewProps> = ({
  isModal = false,
  initialTab = "termos",
  onAcceptAndClose,
  onClose,
  termsCopied: externalTermsCopied,
  onCopyTerms,
}) => {
  const normalizedInitialTab = initialTab === "lgpd" ? "privacidade" : initialTab;
  const [activeDoc, setActiveDoc] = useState<"termos" | "privacidade">(normalizedInitialTab);
  const [internalCopied, setInternalCopied] = useState(false);

  const isCopied = externalTermsCopied !== undefined ? externalTermsCopied : internalCopied;
  const currentClauses = activeDoc === "termos" ? OFFICIAL_TERMS_CLAUSES : OFFICIAL_PRIVACY_CLAUSES;

  const handleCopy = () => {
    if (activeDoc === "termos" && onCopyTerms) {
      onCopyTerms();
    } else {
      const textToCopy =
        activeDoc === "termos"
          ? TERMS_PLAIN_TEXT_FOR_CLIPBOARD
          : PRIVACY_PLAIN_TEXT_FOR_CLIPBOARD;

      navigator.clipboard.writeText(textToCopy).then(() => {
        setInternalCopied(true);
        setTimeout(() => setInternalCopied(false), 2500);
      });
    }
  };

  return (
    <div className={`space-y-5 ${isModal ? "p-4 sm:p-6" : ""}`}>
      {/* Abas de Navegação e Ação de Copiar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-200">
        {/* Alternador entre Termo de Uso e Termo de Privacidade */}
        <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200/80">
          <button
            type="button"
            onClick={() => setActiveDoc("termos")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeDoc === "termos"
                ? "bg-white text-[#0b439c] shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Termo de Uso</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDoc("privacidade")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeDoc === "privacidade"
                ? "bg-white text-[#0b439c] shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Termo de Privacidade</span>
          </button>
        </div>

        {/* Apenas botão Copiar conforme solicitado */}
        <button
          type="button"
          onClick={handleCopy}
          className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          title={`Copiar ${activeDoc === "termos" ? "Termo de Uso" : "Termo de Privacidade"}`}
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-bold">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-500" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>

      {/* Subtítulo Simples e Direto */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
        <span>
          {activeDoc === "termos"
            ? "Diretrizes de utilização da plataforma e conduta"
            : "Proteção e transparência sobre o uso de dados pessoais"}
        </span>
        <span className="font-medium text-zinc-400">Atualizado: 2026</span>
      </div>

      {/* Lista de Cláusulas */}
      <div className="space-y-5 text-zinc-800">
        {currentClauses.map((clause) => (
          <article
            key={clause.number}
            className="space-y-2 pb-4 border-b border-zinc-100 last:border-b-0"
          >
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#0b439c] text-xs font-black inline-flex items-center justify-center shrink-0 border border-blue-100">
                {clause.number}
              </span>
              <span>{clause.title}</span>
            </h2>

            <div className="space-y-1.5 text-xs sm:text-sm text-zinc-600 leading-relaxed pl-8">
              {clause.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}

              {clause.subitems && clause.subitems.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {clause.subitems.map((sub, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2 text-zinc-600">
                      <span className="font-bold text-zinc-800 shrink-0">
                        {sub.letter})
                      </span>
                      <span>{sub.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Ações do Rodapé do Modal */}
      {isModal && (
        <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-zinc-500 text-center sm:text-left">
            Ao se cadastrar, você concorda com o Termo de Uso e com o Termo de Privacidade.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>
            )}
            {onAcceptAndClose && (
              <button
                type="button"
                onClick={onAcceptAndClose}
                className="flex-1 sm:flex-none px-5 py-2 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Aceitar e Continuar</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
