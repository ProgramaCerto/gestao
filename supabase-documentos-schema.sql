-- ==============================================================================
-- ESTRUTURA COMPLETA: TABELAS PASTAS E DOCUMENTOS COM POLÍTICAS ALL (RLS)
-- ==============================================================================

-- 1. CRIAR TABELA PASTAS
CREATE TABLE IF NOT EXISTS public.pastas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS (Row Level Security) na tabela pastas
ALTER TABLE public.pastas ENABLE ROW LEVEL SECURITY;

-- Política ALL para tabela pastas: permite SELECT, INSERT, UPDATE e DELETE para o dono
DROP POLICY IF EXISTS "pastas_policy_all" ON public.pastas;
CREATE POLICY "pastas_policy_all"
  ON public.pastas
  FOR ALL
  TO authenticated
  USING (auth.uid() = id_usuario)
  WITH CHECK (auth.uid() = id_usuario);


-- 2. CRIAR TABELA DOCUMENTOS
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pasta_id UUID REFERENCES public.pastas(id) ON DELETE SET NULL, -- Se a pasta for excluída, fica NULL (fora de pasta)
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  incluir_assinatura_programa_certo BOOLEAN DEFAULT true,
  incluir_assinatura_cordenacao BOOLEAN DEFAULT true,
  incluir_campo_assinatura_aluno BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'emitido',
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS (Row Level Security) na tabela documentos
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Política ALL para tabela documentos: permite SELECT, INSERT, UPDATE e DELETE para o dono
DROP POLICY IF EXISTS "documentos_policy_all" ON public.documentos;
CREATE POLICY "documentos_policy_all"
  ON public.documentos
  FOR ALL
  TO authenticated
  USING (auth.uid() = id_usuario)
  WITH CHECK (auth.uid() = id_usuario);


-- 3. ÍNDICES DE PERFORMANCE (Opcional, acelera consultas rápidas)
CREATE INDEX IF NOT EXISTS idx_pastas_id_usuario ON public.pastas(id_usuario);
CREATE INDEX IF NOT EXISTS idx_documentos_id_usuario ON public.documentos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_documentos_pasta_id ON public.documentos(pasta_id);
