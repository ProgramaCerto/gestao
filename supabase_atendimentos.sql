-- Script SQL para o Supabase (Central de Atendimento / Ouvidoria Exclusiva)
-- Execute este script no SQL Editor do seu novo projeto Supabase

CREATE TABLE IF NOT EXISTS public.atendimentos (
  id TEXT PRIMARY KEY,
  id_do_usuario UUID,
  nome TEXT,
  tipo TEXT,
  mensagem TEXT,
  status TEXT DEFAULT 'Aguardando',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  mensagem_respondida TEXT,
  respondido_em TIMESTAMPTZ
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- Política Única com FOR ALL (permissão total de leitura, inserção e atualização)
DROP POLICY IF EXISTS "Acesso total aos atendimentos" ON public.atendimentos;
CREATE POLICY "Acesso total aos atendimentos" ON public.atendimentos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_atendimentos_status ON public.atendimentos(status);
CREATE INDEX IF NOT EXISTS idx_atendimentos_criado_em ON public.atendimentos(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_atendimentos_id_do_usuario ON public.atendimentos(id_do_usuario);

