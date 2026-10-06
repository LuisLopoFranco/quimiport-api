import request from 'supertest';
import { cargaValida } from '../fixtures/cargas';
import { produtoValido } from '../fixtures/produtos';
import { criarAppTeste } from '../helpers/criarAppTeste';

/**
 * Testes ponta a ponta da API REST (Express + Supertest).
 * Usam repositórios em memória: rápidos e sem dependência de banco.
 * O mesmo fluxo roda contra o PostgreSQL em tests/integration.
 */
describe('API REST QuimiPort', () => {
  let app: ReturnType<typeof criarAppTeste>;

  beforeEach(() => {
    app = criarAppTeste();
  });

  const criarProduto = async (dados = produtoValido()) => {
    const res = await request(app).post('/produtos-quimicos').send(dados);
    expect(res.status).toBe(201);
    return res.body;
  };

  const registrarCarga = async (produtoId: string, extra = {}) => {
    const res = await request(app).post('/cargas-quimicas').send(cargaValida(produtoId, extra));
    expect(res.status).toBe(201);
    return res.body;
  };

  const mudarStatus = (id: string, status: string, motivo?: string) =>
    request(app).patch(`/cargas-quimicas/${id}/status`).send({ status, motivo });

  const levarAteInspecao = async (id: string) => {
    expect((await mudarStatus(id, 'EM_ANALISE')).status).toBe(200);
    expect((await mudarStatus(id, 'EM_INSPECAO')).status).toBe(200);
  };

  describe('Produtos químicos', () => {
    it('cadastra produto químico (201) e retorna Location', async () => {
      const res = await request(app).post('/produtos-quimicos').send(produtoValido());
      expect(res.status).toBe(201);
      expect(res.headers.location).toBe(`/produtos-quimicos/${res.body.id}`);
      expect(res.body).toMatchObject({ nome: 'Etanol', classeRisco: '3', status: 'ATIVO' });
    });

    it('bloqueia cadastro sem nome (400)', async () => {
      const res = await request(app).post('/produtos-quimicos').send(produtoValido({ nome: undefined }));
      expect(res.status).toBe(400);
      expect(res.body.erro.mensagem).toBe('Um produto químico não pode ser cadastrado sem nome');
    });

    it('bloqueia cadastro sem classe de risco (400)', async () => {
      const res = await request(app).post('/produtos-quimicos').send(produtoValido({ classeRisco: undefined }));
      expect(res.status).toBe(400);
      expect(res.body.erro.mensagem).toBe('Um produto químico não pode ser cadastrado sem classe de risco');
    });

    it('bloqueia cadastro com status inválido (400)', async () => {
      const res = await request(app).post('/produtos-quimicos').send(produtoValido({ status: 'TALVEZ' }));
      expect(res.status).toBe(400);
    });

    it('lista, busca, atualiza e inativa', async () => {
      const p = await criarProduto();
      expect((await request(app).get('/produtos-quimicos')).body).toHaveLength(1);
      expect((await request(app).get(`/produtos-quimicos/${p.id}`)).body.nome).toBe('Etanol');

      const put = await request(app).put(`/produtos-quimicos/${p.id}`).send(produtoValido({ nome: 'Metanol', numeroOnu: '1230' }));
      expect(put.status).toBe(200);
      expect(put.body.nome).toBe('Metanol');

      const inativo = await request(app).patch(`/produtos-quimicos/${p.id}/inativar`);
      expect(inativo.body.status).toBe('INATIVO');
      expect((await request(app).get('/produtos-quimicos?status=ATIVO')).body).toHaveLength(0);
      expect((await request(app).patch(`/produtos-quimicos/${p.id}/inativar`)).status).toBe(422);
    });

    it('retorna 404 para produto inexistente e 400 para id malformado', async () => {
      expect((await request(app).get('/produtos-quimicos/00000000-0000-4000-8000-000000000000')).status).toBe(404);
      expect((await request(app).get('/produtos-quimicos/abc')).status).toBe(400);
    });
  });

  describe('Cargas químicas', () => {
    it('registra carga química (201) com status REGISTRADA', async () => {
      const p = await criarProduto();
      const res = await request(app).post('/cargas-quimicas').send(cargaValida(p.id));
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ status: 'REGISTRADA', produtoQuimicoId: p.id, documentosPendentes: [] });
      expect(res.body.proximosStatusPermitidos).toEqual(['EM_ANALISE', 'CANCELADA']);
      expect(res.body.produtoQuimico.nome).toBe('Etanol');
    });

    it('bloqueia carga com produto químico inativo (422)', async () => {
      const p = await criarProduto();
      await request(app).patch(`/produtos-quimicos/${p.id}/inativar`);
      const res = await request(app).post('/cargas-quimicas').send(cargaValida(p.id));
      expect(res.status).toBe(422);
      expect(res.body.erro.mensagem).toBe('Uma carga química não pode ser registrada com produto químico inativo');
    });

    it.each([0, -10])('bloqueia carga com quantidade %p (400)', async (quantidade) => {
      const p = await criarProduto();
      const res = await request(app).post('/cargas-quimicas').send(cargaValida(p.id, { quantidade }));
      expect(res.status).toBe(400);
      expect(res.body.erro.mensagem).toBe('A quantidade da carga deve ser maior que zero');
    });

    it('bloqueia carga sem produto associado e sem responsável técnico (400)', async () => {
      const p = await criarProduto();
      const semProduto = await request(app)
        .post('/cargas-quimicas')
        .send(cargaValida('', { produtoQuimicoId: undefined }));
      expect(semProduto.status).toBe(400);
      expect(semProduto.body.erro.mensagem).toMatch(/sem produto químico associado/);

      const semResponsavel = await request(app)
        .post('/cargas-quimicas')
        .send(cargaValida(p.id, { responsavelTecnico: undefined }));
      expect(semResponsavel.status).toBe(400);
      expect(semResponsavel.body.erro.mensagem).toBe('Toda carga deve possuir responsável técnico informado');
    });

    it('bloqueia código de carga duplicado (409)', async () => {
      const p = await criarProduto();
      await registrarCarga(p.id, { codigo: 'QP-1' });
      const res = await request(app).post('/cargas-quimicas').send(cargaValida(p.id, { codigo: 'QP-1' }));
      expect(res.status).toBe(409);
    });

    it('lista cargas filtrando por status e busca por id', async () => {
      const p = await criarProduto();
      const c1 = await registrarCarga(p.id);
      await registrarCarga(p.id);
      await mudarStatus(c1.id, 'EM_ANALISE');
      const emAnalise = await request(app).get('/cargas-quimicas?status=EM_ANALISE');
      expect(emAnalise.body.map((c: { id: string }) => c.id)).toEqual([c1.id]);
      expect((await request(app).get('/cargas-quimicas')).body).toHaveLength(2);
      expect((await request(app).get(`/cargas-quimicas/${c1.id}`)).body.status).toBe('EM_ANALISE');
      expect((await request(app).get('/cargas-quimicas?status=XPTO')).status).toBe(400);
    });

    it('atualiza status pelo fluxo principal completo até FINALIZADA', async () => {
      const p = await criarProduto();
      const c = await registrarCarga(p.id);
      for (const status of ['EM_ANALISE', 'EM_INSPECAO', 'LIBERADA', 'EM_MOVIMENTACAO', 'FINALIZADA']) {
        const res = await mudarStatus(c.id, status);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe(status);
      }
      const historico = await request(app).get(`/cargas-quimicas/${c.id}/historico`);
      expect(historico.body).toHaveLength(6);
    });

    it.each([
      ['REGISTRADA', 'FINALIZADA'],
      ['REGISTRADA', 'LIBERADA'],
      ['REGISTRADA', 'EM_MOVIMENTACAO'],
    ])('bloqueia transição proibida %s → %s (422)', async (_de, para) => {
      const p = await criarProduto();
      const c = await registrarCarga(p.id);
      const res = await mudarStatus(c.id, para);
      expect(res.status).toBe(422);
      expect(res.body.erro.detalhes).toMatchObject({ statusAtual: 'REGISTRADA', statusSolicitado: para });
    });

    it('bloqueia liberação sem documentação obrigatória (422) e libera após anexar', async () => {
      const p = await criarProduto();
      const c = await registrarCarga(p.id, { documentos: [] });
      await levarAteInspecao(c.id);

      const negado = await request(app).patch(`/cargas-quimicas/${c.id}/liberar`);
      expect(negado.status).toBe(422);
      expect(negado.body.erro.mensagem).toBe('Uma carga não pode ser liberada sem documentação obrigatória');
      expect(negado.body.erro.detalhes.documentosPendentesOuVencidos).toEqual(['FISPQ', 'FICHA_EMERGENCIA']);

      for (const tipo of ['FISPQ', 'FICHA_EMERGENCIA']) {
        const doc = await request(app)
          .post(`/cargas-quimicas/${c.id}/documentos`)
          .send({ tipo, numero: `${tipo}-1`, dataValidade: '2099-01-01' });
        expect(doc.status).toBe(201);
      }
      const liberado = await request(app).patch(`/cargas-quimicas/${c.id}/liberar`);
      expect(liberado.status).toBe(200);
      expect(liberado.body.status).toBe('LIBERADA');
    });

    it('bloqueia carga (exige motivo) e impede movimentar carga bloqueada', async () => {
      const p = await criarProduto();
      const c = await registrarCarga(p.id);
      await levarAteInspecao(c.id);

      expect((await request(app).patch(`/cargas-quimicas/${c.id}/bloquear`).send({})).status).toBe(400);
      const bloqueada = await request(app).patch(`/cargas-quimicas/${c.id}/bloquear`).send({ motivo: 'Vazamento' });
      expect(bloqueada.status).toBe(200);
      expect(bloqueada.body).toMatchObject({ status: 'BLOQUEADA', motivoBloqueio: 'Vazamento' });

      const mover = await mudarStatus(c.id, 'EM_MOVIMENTACAO');
      expect(mover.status).toBe(422);
      expect(mover.body.erro.mensagem).toBe('Uma carga bloqueada não pode entrar em movimentação');
    });

    it('cancela carga e impede liberar ou alterar uma carga cancelada', async () => {
      const p = await criarProduto();
      const c = await registrarCarga(p.id);
      const cancelada = await request(app).patch(`/cargas-quimicas/${c.id}/cancelar`).send({ motivo: 'Desistência' });
      expect(cancelada.status).toBe(200);
      expect(cancelada.body.status).toBe('CANCELADA');

      const liberar = await request(app).patch(`/cargas-quimicas/${c.id}/liberar`);
      expect(liberar.status).toBe(422);
      expect(liberar.body.erro.mensagem).toBe('Uma carga cancelada não pode ser liberada');
      expect((await mudarStatus(c.id, 'EM_ANALISE')).status).toBe(422);
    });

    it('retorna 404 ao alterar status de carga inexistente', async () => {
      const res = await mudarStatus('00000000-0000-4000-8000-000000000000', 'EM_ANALISE');
      expect(res.status).toBe(404);
    });
  });

  describe('Infra e diferenciais', () => {
    it('GET /health, /metrics e /docs.json', async () => {
      expect((await request(app).get('/health')).body.status).toBe('ok');
      expect((await request(app).get('/metrics')).text).toContain('quimiport_http_request_duration_seconds');
      expect((await request(app).get('/docs.json')).body.info.title).toBe('QuimiPort API');
    });

    it('rota inexistente e JSON malformado', async () => {
      expect((await request(app).get('/nao-existe')).status).toBe(404);
      const res = await request(app).post('/produtos-quimicos').set('content-type', 'application/json').send('{ruim');
      expect(res.status).toBe(400);
      expect(res.body.erro.codigo).toBe('JSON_INVALIDO');
    });

    it('GraphQL: cargasPorStatus com produto e validarTransicao', async () => {
      const p = await criarProduto();
      await registrarCarga(p.id, { codigo: 'GQL-1' });
      const res = await request(app)
        .post('/graphql')
        .send({
          query: `{
            cargasPorStatus(status: REGISTRADA) { codigo produtoQuimico { nome } }
            produtoQuimico(id: "${p.id}") { nome classeRisco }
            validarTransicao(de: BLOQUEADA, para: EM_MOVIMENTACAO) { permitida }
          }`,
        });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        cargasPorStatus: [{ codigo: 'GQL-1', produtoQuimico: { nome: 'Etanol' } }],
        produtoQuimico: { nome: 'Etanol', classeRisco: '3' },
        validarTransicao: { permitida: false },
      });
    });
  });
});