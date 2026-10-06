import { Pool } from 'pg';
import { ILogger } from '../application/interfaces/ILogger';
import { IMetricas } from '../application/interfaces/IMetricas';
import { AlterarStatusCarga } from '../application/use-cases/cargas/AlterarStatusCarga';
import { AnexarDocumentoCarga } from '../application/use-cases/cargas/AnexarDocumentoCarga';
import { BuscarCargaQuimica } from '../application/use-cases/cargas/BuscarCargaQuimica';
import { ConsultarHistoricoCarga } from '../application/use-cases/cargas/ConsultarHistoricoCarga';
import { ListarCargasQuimicas } from '../application/use-cases/cargas/ListarCargasQuimicas';
import { RegistrarCargaQuimica } from '../application/use-cases/cargas/RegistrarCargaQuimica';
import { AtualizarProdutoQuimico } from '../application/use-cases/produtos/AtualizarProdutoQuimico';
import { BuscarProdutoQuimico } from '../application/use-cases/produtos/BuscarProdutoQuimico';
import { CriarProdutoQuimico } from '../application/use-cases/produtos/CriarProdutoQuimico';
import { InativarProdutoQuimico } from '../application/use-cases/produtos/InativarProdutoQuimico';
import { ListarProdutosQuimicos } from '../application/use-cases/produtos/ListarProdutosQuimicos';
import { ICargaQuimicaRepository } from '../domain/repositories/ICargaQuimicaRepository';
import { IProdutoQuimicoRepository } from '../domain/repositories/IProdutoQuimicoRepository';
import { InMemoryCargaQuimicaRepository } from '../infrastructure/repositories/in-memory/InMemoryCargaQuimicaRepository';
import { InMemoryProdutoQuimicoRepository } from '../infrastructure/repositories/in-memory/InMemoryProdutoQuimicoRepository';
import { PgCargaQuimicaRepository } from '../infrastructure/repositories/postgres/PgCargaQuimicaRepository';
import { PgProdutoQuimicoRepository } from '../infrastructure/repositories/postgres/PgProdutoQuimicoRepository';
import { CargaQuimicaController } from '../presentation/http/controllers/CargaQuimicaController';
import { ProdutoQuimicoController } from '../presentation/http/controllers/ProdutoQuimicoController';

export interface Repositorios {
  produtos: IProdutoQuimicoRepository;
  cargas: ICargaQuimicaRepository;
}

export function repositoriosPostgres(pool: Pool): Repositorios {
  return { produtos: new PgProdutoQuimicoRepository(pool), cargas: new PgCargaQuimicaRepository(pool) };
}

export function repositoriosEmMemoria(): Repositorios {
  return { produtos: new InMemoryProdutoQuimicoRepository(), cargas: new InMemoryCargaQuimicaRepository() };
}

/**
 * Composition Root (injeção de dependência manual).
 * É o ÚNICO lugar que conhece as implementações concretas e "monta" o sistema.
 */
export function criarContainer(repos: Repositorios, logger: ILogger, metricas: IMetricas) {
  const { produtos, cargas } = repos;

  const casosDeUso = {
    criarProduto: new CriarProdutoQuimico(produtos, logger, metricas),
    listarProdutos: new ListarProdutosQuimicos(produtos),
    buscarProduto: new BuscarProdutoQuimico(produtos),
    atualizarProduto: new AtualizarProdutoQuimico(produtos, logger),
    inativarProduto: new InativarProdutoQuimico(produtos, logger),
    registrarCarga: new RegistrarCargaQuimica(cargas, produtos, logger, metricas),
    listarCargas: new ListarCargasQuimicas(cargas),
    buscarCarga: new BuscarCargaQuimica(cargas, produtos),
    alterarStatus: new AlterarStatusCarga(cargas, logger, metricas),
    anexarDocumento: new AnexarDocumentoCarga(cargas, logger),
    historico: new ConsultarHistoricoCarga(cargas),
  };

  const u = casosDeUso;
  return {
    casosDeUso,
    produtoController: new ProdutoQuimicoController(
      u.criarProduto, u.listarProdutos, u.buscarProduto, u.atualizarProduto, u.inativarProduto,
    ),
    cargaController: new CargaQuimicaController(
      u.registrarCarga, u.listarCargas, u.buscarCarga, u.alterarStatus, u.anexarDocumento, u.historico,
    ),
  };
}

export type Container = ReturnType<typeof criarContainer>;