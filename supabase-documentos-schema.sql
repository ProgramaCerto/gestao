-- ==============================================================================
-- 1. TABELA PASTAS
-- ==============================================================================
DROP TABLE IF EXISTS public.documentos CASCADE;
DROP TABLE IF EXISTS public.pastas CASCADE;

CREATE TABLE public.pastas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario TEXT,
  nome VARCHAR(255) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Ativar segurança em nível de linha (RLS)
ALTER TABLE public.pastas ENABLE ROW LEVEL SECURITY;

-- Política ALL: Permite SELECT, INSERT, UPDATE e DELETE total
CREATE POLICY "pastas_policy_all"
  ON public.pastas
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- 2. TABELA DOCUMENTOS (COM TAMANHOS, ALINHAMENTOS E ESTILO_CONTEUDO)
-- ==============================================================================
CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario TEXT,
  pasta_id UUID REFERENCES public.pastas(id) ON DELETE SET NULL,

  -- Configurações do Título
  titulo VARCHAR(255) NOT NULL,
  tamanho_titulo VARCHAR(50) DEFAULT 'medio',       -- 'pequeno', 'medio', 'grande'
  estilo_titulo VARCHAR(50) DEFAULT 'negrito',      -- 'negrito' (letra grossinha) ou 'normal'
  alinhamento_titulo VARCHAR(50) DEFAULT 'center',  -- 'center' (meio), 'left' (canto esquerdo), 'right' (canto direito)

  -- Conteúdo e Formatação
  conteudo TEXT NOT NULL,
  tamanho_conteudo VARCHAR(50) DEFAULT 'medio',     -- 'pequeno', 'medio', 'grande'
  alinhamento_conteudo VARCHAR(50) DEFAULT 'justify', -- 'justify' (justificado), 'left' (canto esquerdo), 'center' (meio)
  estilo_conteudo TEXT DEFAULT '',                 -- Palavras em negrito separadas por vírgula (ex: 'clima, ensolarado') ou 'tudo' se o texto todo for negrito

  -- Assinaturas Oficiais
  incluir_assinatura_programa_certo BOOLEAN DEFAULT true,
  incluir_assinatura_cordenacao BOOLEAN DEFAULT true,
  incluir_campo_assinatura_aluno BOOLEAN DEFAULT false,

  status VARCHAR(50) DEFAULT 'emitido',
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Ativar segurança em nível de linha (RLS)
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Política ALL: Permite SELECT, INSERT, UPDATE e DELETE total
CREATE POLICY "documentos_policy_all"
  ON public.documentos
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- 3. ÍNDICES DE BUSCA RÁPIDA
-- ==============================================================================
CREATE INDEX idx_pastas_id_usuario ON public.pastas(id_usuario);
CREATE INDEX idx_pastas_criado_em ON public.pastas(criado_em DESC);
CREATE INDEX idx_documentos_id_usuario ON public.documentos(id_usuario);
CREATE INDEX idx_documentos_pasta_id ON public.documentos(pasta_id);
CREATE INDEX idx_documentos_criado_em ON public.documentos(criado_em DESC);
