import { Pool } from 'pg';
import { ProdutoQuimico } from '../../../domain/entities/ProdutoQuimico';
import { IProdutoQuimicoRepository } from '../../../domain/repositories/IProdutoQuimicoRepository';
import { ClasseRisco, GrupoCompatibilidade } from '../../../domain/value-objects/ClasseRisco';
import { StatusProduto } from '../../../domain/value-objects/StatusProduto';

interface ProdutoRow {
  id: string;
  nome: string;
  descricao: string | null;
  numero_onu: string;
  classe_risco: ClasseRisco;
  grupo_compatibilidade: GrupoCompatibilidade | null;
  status: StatusProduto;
  created_at: Date;
  updated_at: Date;
}

/** Mapeia a linha do banco (snake_case) para a entidade de domínio. */
function paraEntidade(row: ProdutoRow): ProdutoQuimico {
  return ProdutoQuimico.restaurar({
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    numeroOnu: row.numero_onu,
    classeRisco: row.classe_risco,
    grupoCompatibilidade: row.grupo_compatibilidade,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class PgProdutoQuimicoRepository implements IProdutoQuimicoRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(produto: ProdutoQuimico): Promise<void> {
    const p = produto.toJSON();
    // UPSERT: insere se não existe, atualiza se já existe.
    await this.pool.query(
      `INSERT INTO produtos_quimicos
         (id, nome, descricao, numero_onu, classe_risco, grupo_compatibilidade, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         nome = EXCLUDED.nome,
         descricao = EXCLUDED.descricao,
         numero_onu = EXCLUDED.numero_onu,
         classe_risco = EXCLUDED.classe_risco,
         grupo_compatibilidade = EXCLUDED.grupo_compatibilidade,
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at`,
      [p.id, p.nome, p.descricao, p.numeroOnu, p.classeRisco, p.grupoCompatibilidade, p.status, p.createdAt, p.updatedAt],
    );
  }

  async buscarPorId(id: string): Promise<ProdutoQuimico | null> {
    const { rows } = await this.pool.query<ProdutoRow>('SELECT * FROM produtos_quimicos WHERE id = $1', [id]);
    return rows[0] ? paraEntidade(rows[0]) : null;
  }

  async listar(filtros: { status?: StatusProduto } = {}): Promise<ProdutoQuimico[]> {
    const { rows } = filtros.status
      ? await this.pool.query<ProdutoRow>('SELECT * FROM produtos_quimicos WHERE status = $1 ORDER BY nome', [filtros.status])
      : await this.pool.query<ProdutoRow>('SELECT * FROM produtos_quimicos ORDER BY nome');
    return rows.map(paraEntidade);
  }
}