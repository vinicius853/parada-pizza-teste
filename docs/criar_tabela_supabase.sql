-- ══════════════════════════════════════════════
-- PARADA DA PIZZA — Script SQL Supabase
-- Execute no SQL Editor do seu projeto Supabase
-- ══════════════════════════════════════════════

-- Criar tabela pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido   BIGINT NOT NULL,
  data_criacao    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nome            TEXT NOT NULL,
  telefone        TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('retirada', 'entrega')),
  endereco        JSONB,
  itens           JSONB NOT NULL,
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxa_entrega    NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  pagamento       TEXT NOT NULL,
  troco           NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'impresso', 'cancelado')),
  impresso        BOOLEAN NOT NULL DEFAULT FALSE
);

-- Índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON pedidos (data_criacao DESC);

-- Índice para filtrar por status
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos (status);

-- ══════════════════════════════════════════════
-- RLS (Row Level Security)
-- Libera acesso público para INSERT (clientes)
-- e SELECT/UPDATE/DELETE (admin via anon key)
-- Para produção, considere usar service_role key
-- no admin e restringir o SELECT publico.
-- ══════════════════════════════════════════════

-- Habilitar RLS
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Política: qualquer um pode inserir (clientes enviando pedidos)
CREATE POLICY "insert_public"
  ON pedidos FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política: qualquer um pode ler (admin lê pelo painel)
-- Para maior segurança, use service_role key no admin
-- e remova esta política, criando uma policy autenticada.
CREATE POLICY "select_public"
  ON pedidos FOR SELECT
  TO anon
  USING (true);

-- Política: permite update (marcar como impresso)
CREATE POLICY "update_public"
  ON pedidos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Política: permite delete (remover pedido pelo admin)
CREATE POLICY "delete_public"
  ON pedidos FOR DELETE
  TO anon
  USING (true);
