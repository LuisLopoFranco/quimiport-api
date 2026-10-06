import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { IMetricas } from '../../application/interfaces/IMetricas';

/** Métricas no formato Prometheus, expostas em GET /metrics. */
export function criarMetricas() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: 'quimiport_' });

  const duracaoHttp = new Histogram({
    name: 'quimiport_http_request_duration_seconds',
    help: 'Duração das requisições HTTP',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [registry],
  });
  const produtosCriados = new Counter({
    name: 'quimiport_produtos_criados_total',
    help: 'Produtos químicos criados',
    registers: [registry],
  });
  const cargasRegistradas = new Counter({
    name: 'quimiport_cargas_registradas_total',
    help: 'Cargas químicas registradas',
    registers: [registry],
  });
  const mudancasStatus = new Counter({
    name: 'quimiport_mudancas_status_total',
    help: 'Mudanças de status de carga',
    labelNames: ['de', 'para'],
    registers: [registry],
  });

  const metricasNegocio: IMetricas = {
    produtoCriado: () => produtosCriados.inc(),
    cargaRegistrada: () => cargasRegistradas.inc(),
    statusAlterado: (de, para) => mudancasStatus.inc({ de, para }),
  };

  return { registry, duracaoHttp, metricasNegocio };
}

export type Metricas = ReturnType<typeof criarMetricas>;