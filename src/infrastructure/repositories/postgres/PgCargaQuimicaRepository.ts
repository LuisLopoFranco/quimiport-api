import { Pool } from 'pg';
import { CargaQuimica } from '../../../domain/entities/CargaQuimica';
import {
  FiltrosCarga,
  HistoricoStatus,
  ICargaQuimicaRepository,
} from '../../../domain/repositories/ICargaQuimicaRepository';
import { DocumentoCarga } from '../../../domain/value-objects/DocumentoCarga';
import { Quantidade } from '../../../domain/value-objects/Quantidade';
import { ResponsavelTecnico } from '../../../domain/value-objects/ResponsavelTecnico';
import { StatusCarga } from '../../../domain/value-objects/StatusCarga';

interface CargaRow {
  id: string;
  codigo: string;
  produto_quimico_id: string;
  quantidade: number;
  unidade_medida: string;
  origem: string;
  destino: string;
  responsavel_nome: string;
  responsavel_registro: string;
  status: StatusCarga;
  motivo_bloqueio: string | null;
  data_entrada: Date;
  created_at: Date;
  updated_at: Date;
  documentos: { tipo: string; numero: string; dataValidade: string }[];
}

// Os documentos vêm agregados em JSON na mesma consulta, evitando N+1 queries.
const SELECT_CARGA = `
  SELECT c.*,
         COALESCE(
           (SELECT json_agg(json_build_object('tipo', d.tipo, 'numero', d.numero, 'dataValidade', d.data_validade)
                            ORDER BY d.id)
              FROM carga_documentos d WHERE d.carga_id = c.id),
           '[]'::json) AS documentos
    FROM cargas_quimicas c`;

function paraEntidade(row: CargaRow): CargaQuimica {
  return CargaQuimica.restaurar({
    id: row.id,
    codigo: row.codigo,
    produtoQuimicoId: row.produto_quimico_id,
    quantidade: Quantidade.criar(row.quantidade, row.unidade_medida),
    origem: row.origem,
    destino: row.destino,
    responsavelTecnico: ResponsavelTecnico.criar({
      nome: row.responsavel_nome,
      registroProfissional: row.responsavel_registro,
    }),
    documentos: row.documentos.map((d) => DocumentoCarga.criar(d)),
    status: row.status,
    motivoBloqueio: row.motivo_bloqueio,
    dataEntrada: row.data_entrada,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class PgCargaQuimicaRepository implements ICargaQuimicaRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Salva o agregado inteiro numa única transação:
   * carga + documentos + novas entradas de histórico de status.
   */
  async salvar(carga: CargaQuimica): Promise<void> {
    const c = carga.dados;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO cargas_quimicas
           (id, codigo, produto_quimico_id, quantidade, unidade_medida, origem, destino,
            responsavel_nome, responsavel_registro, status, motivo_bloqueio, data_entrada, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           motivo_bloqueio = EXCLUDED.motivo_bloqueio,
           updated_at = EXCLUDED.updated_at`,
        [
          c.id, c.codigo, c.produtoQuimicoId, c.quantidade.valor, c.quantidade.unidade, c.origem, c.destino,
          c.responsavelTecnico.nome, c.responsavelTecnico.registroProfissional, c.status, c.motivoBloqueio,
          c.dataEntrada, c.createdAt, c.updatedAt,
        ],
      );

      await client.query('DELETE FROM carga_documentos WHERE carga_id = $1', [c.id]);
      for (const d of c.documentos) {
        await client.query(
          'INSERT INTO carga_documentos (carga_id, tipo, numero, data_validade) VALUES ($1, $2, $3, $4)',
          [c.id, d.tipo, d.numero, d.dataValidade.toISOString().slice(0, 10)],
        );
      }

      for (const m of carga.retirarMudancasPendentes()) {
        await client.query(
          `INSERT INTO carga_status_historico (carga_id, status_anterior, status_novo, motivo, alterado_em)
           VALUES ($1, $2, $3, $4, $5)`,
          [c.id, m.statusAnterior, m.statusNovo, m.motivo, m.alteradoEm],
        );
      }
      await client.query('COMMIT');
    } catch (erro) {
      await client.query('ROLLBACK');
      throw erro;
    } finally {
      client.release();
    }
  }

  async buscarPorId(id: string): Promise<CargaQuimica | null> {
    const { rows } = await this.pool.query<CargaRow>(`${SELECT_CARGA} WHERE c.id = $1`, [id]);
    return rows[0] ? paraEntidade(rows[0]) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<CargaQuimica | null> {
    const { rows } = await this.pool.query<CargaRow>(`${SELECT_CARGA} WHERE c.codigo = $1`, [codigo]);
    return rows[0] ? paraEntidade(rows[0]) : null;
  }

  async listar(filtros: FiltrosCarga = {}): Promise<CargaQuimica[]> {
    const condicoes: string[] = [];
    const params: unknown[] = [];
    if (filtros.status) {
      params.push(filtros.status);
      condicoes.push(`c.status = $${params.length}`);
    }
    if (filtros.produtoQuimicoId) {
      params.push(filtros.produtoQuimicoId);
      condicoes.push(`c.produto_quimico_id = $${params.length}`);
    }
    const where = condicoes.length ? ` WHERE ${condicoes.join(' AND ')}` : '';
    const { rows } = await this.pool.query<CargaRow>(`${SELECT_CARGA}${where} ORDER BY c.created_at DESC`, params);
    return rows.map(paraEntidade);
  }

  async listarHistorico(cargaId: string): Promise<HistoricoStatus[]> {
    const { rows } = await this.pool.query(
      `SELECT id, status_anterior, status_novo, motivo, alterado_em
         FROM carga_status_historico WHERE carga_id = $1 ORDER BY alterado_em, id`,
      [cargaId],
    );
    return rows.map((r) => ({
      id: Number(r.id),
      statusAnterior: r.status_anterior,
      statusNovo: r.status_novo,
      motivo: r.motivo,
      alteradoEm: r.alterado_em,
    }));
  }
}