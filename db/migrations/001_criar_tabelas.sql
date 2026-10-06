-- =====================================================================
-- QuimiPort - Migração 001: estrutura inicial
-- Produtos químicos, cargas químicas, documentos e histórico de status
-- =====================================================================

CREATE TABLE IF NOT EXISTS produtos_quimicos (
  id                     UUID PRIMARY KEY,
  nome                   VARCHAR(150) NOT NULL CHECK (length(trim(nome)) > 0),
  descricao              TEXT,
  numero_onu             CHAR(4)      NOT NULL CHECK (numero_onu ~ '^[0-9]{4}$'),
  classe_risco           VARCHAR(3)   NOT NULL CHECK (classe_risco IN
                           ('1','2.1','2.2','2.3','3','4.1','4.2','4.3','5.1','5.2','6.1','6.2','7','8','9')),
  grupo_compatibilidade  CHAR(1)      CHECK (grupo_compatibilidade IN
                           ('A','B','C','D','E','F','G','H','J','K','L','N','S')),
  status                 VARCHAR(10)  NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO')),
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produtos_status ON produtos_quimicos (status);

CREATE TABLE IF NOT EXISTS cargas_quimicas (
  id                       UUID PRIMARY KEY,
  codigo                   VARCHAR(30)    NOT NULL UNIQUE,
  produto_quimico_id       UUID           NOT NULL REFERENCES produtos_quimicos (id) ON DELETE RESTRICT,
  quantidade               NUMERIC(14, 3) NOT NULL CHECK (quantidade > 0),
  unidade_medida           VARCHAR(3)     NOT NULL CHECK (unidade_medida IN ('KG','T','L','M3')),
  origem                   VARCHAR(150)   NOT NULL,
  destino                  VARCHAR(150)   NOT NULL,
  responsavel_nome         VARCHAR(150)   NOT NULL,
  responsavel_registro     VARCHAR(50)    NOT NULL,
  status                   VARCHAR(20)    NOT NULL CHECK (status IN
                             ('REGISTRADA','EM_ANALISE','EM_INSPECAO','LIBERADA',
                              'BLOQUEADA','EM_MOVIMENTACAO','FINALIZADA','CANCELADA')),
  motivo_bloqueio          TEXT,
  data_entrada             TIMESTAMPTZ    NOT NULL,
  created_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cargas_status  ON cargas_quimicas (status);
CREATE INDEX IF NOT EXISTS idx_cargas_produto ON cargas_quimicas (produto_quimico_id);

CREATE TABLE IF NOT EXISTS carga_documentos (
  id             SERIAL PRIMARY KEY,
  carga_id       UUID        NOT NULL REFERENCES cargas_quimicas (id) ON DELETE CASCADE,
  tipo           VARCHAR(30) NOT NULL CHECK (tipo IN
                   ('FISPQ','FICHA_EMERGENCIA','NOTA_FISCAL','LAUDO_TECNICO','CERTIFICADO_ANALISE','OUTRO')),
  numero         VARCHAR(60) NOT NULL,
  data_validade  DATE        NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documentos_carga ON carga_documentos (carga_id);

CREATE TABLE IF NOT EXISTS carga_status_historico (
  id               BIGSERIAL PRIMARY KEY,
  carga_id         UUID        NOT NULL REFERENCES cargas_quimicas (id) ON DELETE CASCADE,
  status_anterior  VARCHAR(20),
  status_novo      VARCHAR(20) NOT NULL,
  motivo           TEXT,
  alterado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_carga ON carga_status_historico (carga_id, alterado_em);