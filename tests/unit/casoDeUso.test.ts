import { ILogger } from '../../src/application/interfaces/ILogger';
import { metricasNulas } from '../../src/application/interfaces/IMetricas';
import { AlterarStatusCarga } from '../../src/application/use-cases/cargas/AlterarStatusCarga';
import { ConsultarHistoricoCarga } from '../../src/application/use-cases/cargas/ConsultarHistoricoCarga';
import { RegistrarCargaQuimica } from '../../src/application/use-cases/cargas/RegistrarCargaQuimica';
import { BuscarProdutoQuimico } from '../../src/application/use-cases/produtos/BuscarProdutoQuimico';
import { CriarProdutoQuimico } from '../../src/application/use-cases/produtos/CriarProdutoQuimico';
import { InativarProdutoQuimico } from '../../src/application/use-cases/produtos/InativarProdutoQuimico';
import { ListarProdutosQuimicos } from '../../src/application/use-cases/produtos/ListarProdutosQuimicos';
import { ConflictError, NotFoundError } from '../../src/domain/errors/DomainError';
import { InMemoryCargaQuimicaRepository } from '../../src/infrastructure/repositories/in-memory/InMemoryCargaQuimicaRepository';
import { InMemoryProdutoQuimicoRepository } from '../../src/infrastructure/repositories/in-memory/InMemoryProdutoQuimicoRepository';
import { cargaValida } from '../fixtures/cargas';
import { produtoValido } from '../fixtures/produtos';

/**
 * Casos de uso testados isoladamente: repositórios em memória e logger falso
 * (sem banco, sem HTTP e sem o container da aplicação).
 */
function montar() {
  const logger: jest.Mocked<ILogger> = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const produtos = new InMemoryProdutoQuimicoRepository();
  const cargas = new InMemoryCargaQuimicaRepository();
  const uc = {
    criarProduto: new CriarProdutoQuimico(produtos, logger, metricasNulas),
    listarProdutos: new ListarProdutosQuimicos(produtos),
    buscarProduto: new BuscarProdutoQuimico(produtos),
    inativarProduto: new InativarProdutoQuimico(produtos, logger),
    registrarCarga: new RegistrarCargaQuimica(cargas, produtos, logger, metricasNulas),
    alterarStatus: new AlterarStatusCarga(cargas, logger, metricasNulas),
    historico: new ConsultarHistoricoCarga(cargas),
  };
  return { uc, logger };
}

describe('Casos de uso', () => {
  it('CriarProdutoQuimico persiste e registra log', async () => {
    const { uc, logger } = montar();
    const criado = await uc.criarProduto.executar(produtoValido());
    expect(await uc.buscarProduto.executar(criado.id)).toEqual(criado);
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ produtoQuimicoId: criado.id }), 'Produto químico criado');
  });

  it('ListarProdutosQuimicos filtra por status', async () => {
    const { uc } = montar();
    const a = await uc.criarProduto.executar(produtoValido({ nome: 'A' }));
    await uc.criarProduto.executar(produtoValido({ nome: 'B' }));
    await uc.inativarProduto.executar(a.id);
    expect((await uc.listarProdutos.executar({ status: 'INATIVO' })).map((p) => p.nome)).toEqual(['A']);
    expect(await uc.listarProdutos.executar()).toHaveLength(2);
  });

  it('RegistrarCargaQuimica falha se o produto não existe', async () => {
    const { uc } = montar();
    await expect(
      uc.registrarCarga.executar(cargaValida('00000000-0000-4000-8000-000000000000')),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('RegistrarCargaQuimica impede código duplicado', async () => {
    const { uc } = montar();
    const p = await uc.criarProduto.executar(produtoValido());
    await uc.registrarCarga.executar(cargaValida(p.id, { codigo: 'DUP-1' }));
    await expect(uc.registrarCarga.executar(cargaValida(p.id, { codigo: 'dup-1' }))).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('produto inativado deixa de ser aceito em novas cargas', async () => {
    const { uc } = montar();
    const p = await uc.criarProduto.executar(produtoValido());
    await uc.registrarCarga.executar(cargaValida(p.id));
    await uc.inativarProduto.executar(p.id);
    await expect(uc.registrarCarga.executar(cargaValida(p.id))).rejects.toThrow(/produto químico inativo/);
  });

  it('AlterarStatusCarga registra histórico e loga recusas', async () => {
    const { uc, logger } = montar();
    const p = await uc.criarProduto.executar(produtoValido());
    const carga = await uc.registrarCarga.executar(cargaValida(p.id));
    await uc.alterarStatus.executar(carga.id, 'EM_ANALISE');
    await expect(uc.alterarStatus.executar(carga.id, 'FINALIZADA')).rejects.toThrow(/inválida/);
    expect(logger.warn).toHaveBeenCalledWith(expect.anything(), 'Alteração de status recusada');

    const historico = await uc.historico.executar(carga.id);
    expect(historico.map((h) => h.statusNovo)).toEqual(['REGISTRADA', 'EM_ANALISE']);
  });

  it('AlterarStatusCarga rejeita status desconhecido', async () => {
    const { uc } = montar();
    await expect(uc.alterarStatus.executar('x', 'VOANDO')).rejects.toThrow(/Status inválido/);
  });
});