/** Porta de métricas de negócio (implementada com prom-client na infraestrutura). */
export interface IMetricas {
  produtoCriado(): void;
  cargaRegistrada(): void;
  statusAlterado(de: string, para: string): void;
}

export const metricasNulas: IMetricas = {
  produtoCriado: () => undefined,
  cargaRegistrada: () => undefined,
  statusAlterado: () => undefined,
};