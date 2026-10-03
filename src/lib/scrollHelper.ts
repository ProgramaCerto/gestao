/**
 * Função utilitária para rolar a janela e containers de rolagem principais
 * até o topo absoluto da página de forma instantânea e consistente.
 */
export const scrollToTop = () => {
  if (typeof window === "undefined") return;

  const performScroll = () => {
    // 1. Container principal de rolagem do painel
    const mainScrollContainer = document.getElementById("main-scroll-container");
    if (mainScrollContainer) {
      mainScrollContainer.scrollTop = 0;
      mainScrollContainer.scrollLeft = 0;
    }

    // 2. Elementos padrão do navegador
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    // 3. Fallbacks de outros possíveis wrappers
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
    const root = document.getElementById("root");
    if (root) root.scrollTop = 0;
  };

  // Execução imediata
  performScroll();

  // Execução no próximo frame de animação (quando o DOM começa a ser atualizado)
  requestAnimationFrame(performScroll);

  // Execução após pequeno delay para garantir que novos componentes renderizados e re-layouts fiquem no topo
  setTimeout(performScroll, 30);
  setTimeout(performScroll, 80);
};
