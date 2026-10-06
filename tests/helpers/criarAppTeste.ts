import { loggerSilencioso } from '../../src/application/interfaces/ILogger';
import { criarMetricas } from '../../src/infrastructure/observability/metricas';
import { criarApp } from '../../src/main/app';
import { criarContainer, Repositorios, repositoriosEmMemoria } from '../../src/main/container';

/** Monta a aplicação Express completa com os repositórios informados (padrão: memória). */
export function criarAppTeste(repos: Repositorios = repositoriosEmMemoria()) {
  const metricas = criarMetricas();
  const container = criarContainer(repos, loggerSilencioso, metricas.metricasNegocio);
  return criarApp({ container, metricas });
}