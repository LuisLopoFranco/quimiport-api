import { Pool } from 'pg';
import request from 'supertest';
import { executarMigracoes } from '../../src/infrastructure/database/migrar';
import { criarPool } from '../../src/infrastructure/database/pool';
import { repositoriosPostgres } from '../../src/main/container';
import { cargaValida } from '../fixtures/cargas';
import { produtoValido } from '../fixtures/produtos';
import { criarAppTeste } from '../helpers/criarAppTeste';

/**
 * Testes de integração com PostgreSQL REAL.
 * Rodam quando TEST_DATABASE_URL está definida (no CI um serviço postgres é
 * criado pelo GitHub Actions; localmente use `docker compose up -d db`).
 */
const url = process.env.TEST_DATABASE_URL;
const descrever = url ? describe : describe.skip;

descrever('Integração com PostgreSQL', () => {
  let pool: Pool;
  let app: ReturnType<typeof criarAppTeste>;

  beforeAll(async () => {
    pool = criarPool(url!);
    await executarMigracoes(pool);
    app = criarAppTeste(repositoriosPostgres(pool));
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE carga_status_historico, carga_documentos, cargas_quimicas, produtos_quimicos CASCADE');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('migrações são idempotentes', async () => {
    expect(await executarMigracoes(pool)).toEqual([]);
  });

  it('persiste produto e carga com documentos, relacionamento e histórico', async () => {
    const produto = (await request(app).post('/produtos-quimicos').send(produtoValido())).body;
    const carga = (await request(app).post('/cargas-quimicas').send(cargaValida(produto.id))).body;

    const { rows } = await pool.query(
      `SELECT c.codigo, c.quantidade, p.nome AS produto, count(d.id)::int AS documentos
         FROM cargas_quimicas c
         JOIN produtos_quimicos p ON p.id = c.produto_quimico_id
         LEFT JOIN carga_documentos d ON d.carga_id = c.id
        WHERE c.id = $1 GROUP BY c.id, p.nome`,
      [carga.id],
    );
    expect(rows[0]).toEqual({ codigo: carga.codigo, quantidade: 1500, produto: 'Etanol', documentos: 2 });

    const lida = (await request(app).get(`/cargas-quimicas/${carga.id}`)).body;
    expect(lida.documentos).toEqual([
      { tipo: 'FISPQ', numero: 'FISPQ-001', dataValidade: '2099-12-31' },
      { tipo: 'FICHA_EMERGENCIA', numero: 'FE-001', dataValidade: '2099-12-31' },
    ]);
  });

  it('executa o fluxo de status e grava o histórico no banco', async () => {
    const produto = (await request(app).post('/produtos-quimicos').send(produtoValido())).body;
    const carga = (await request(app).post('/cargas-quimicas').send(cargaValida(produto.id))).body;
    for (const status of ['EM_ANALISE', 'EM_INSPECAO']) {
      await request(app).patch(`/cargas-quimicas/${carga.id}/status`).send({ status });
    }
    await request(app).patch(`/cargas-quimicas/${carga.id}/bloquear`).send({ motivo: 'Lacre violado' });
    const mover = await request(app).patch(`/cargas-quimicas/${carga.id}/status`).send({ status: 'EM_MOVIMENTACAO' });
    expect(mover.status).toBe(422);

    const { rows } = await pool.query(
      'SELECT status_novo, motivo FROM carga_status_historico WHERE carga_id = $1 ORDER BY id',
      [carga.id],
    );
    expect(rows.map((r) => r.status_novo)).toEqual(['REGISTRADA', 'EM_ANALISE', 'EM_INSPECAO', 'BLOQUEADA']);
    expect(rows[3].motivo).toBe('Lacre violado');
    expect((await request(app).get('/cargas-quimicas?status=BLOQUEADA')).body).toHaveLength(1);
  });

  it('a chave estrangeira impede carga com produto inexistente no banco', async () => {
    await expect(
      pool.query(
        `INSERT INTO cargas_quimicas (id, codigo, produto_quimico_id, quantidade, unidade_medida, origem, destino,
           responsavel_nome, responsavel_registro, status, data_entrada)
         VALUES (gen_random_uuid(), 'X', gen_random_uuid(), 1, 'L', 'a', 'b', 'c', 'd', 'REGISTRADA', now())`,
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it('a constraint CHECK impede quantidade <= 0 mesmo fora da API', async () => {
    const produto = (await request(app).post('/produtos-quimicos').send(produtoValido())).body;
    await expect(
      pool.query(
        `INSERT INTO cargas_quimicas (id, codigo, produto_quimico_id, quantidade, unidade_medida, origem, destino,
           responsavel_nome, responsavel_registro, status, data_entrada)
         VALUES (gen_random_uuid(), 'Y', $1, 0, 'L', 'a', 'b', 'c', 'd', 'REGISTRADA', now())`,
        [produto.id],
      ),
    ).rejects.toThrow(/check constraint/);
  });
});