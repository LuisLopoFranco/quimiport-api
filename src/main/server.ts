import { env } from '../infrastructure/config/env';
import { executarMigracoes } from '../infrastructure/database/migrar';
import { criarPool } from '../infrastructure/database/pool';
import { logger } from '../infrastructure/logger/logger';
import { criarMetricas } from '../infrastructure/observability/metricas';
import { criarApp } from './app';
import { criarContainer, repositoriosEmMemoria, repositoriosPostgres } from './container';

async function iniciar() {
  const metricas = criarMetricas();
  const emMemoria = env.databaseUrl === 'memory';
  const pool = emMemoria ? null : criarPool(env.databaseUrl);

  if (pool) {
    const novas = await executarMigracoes(pool);
    if (novas.length) logger.info({ migracoes: novas }, 'Migrações aplicadas na inicialização');
  } else {
    logger.warn('DATABASE_URL=memory: usando repositórios em memória (os dados somem ao reiniciar)');
  }

  const repos = pool ? repositoriosPostgres(pool) : repositoriosEmMemoria();
  const container = criarContainer(repos, logger, metricas.metricasNegocio);
  const app = criarApp({
    container,
    metricas,
    verificarBanco: pool ? async () => void (await pool.query('SELECT 1')) : undefined,
  });

  const server = app.listen(env.port, () => {
    logger.info({ porta: env.port, docs: `http://localhost:${env.port}/docs` }, 'QuimiPort API no ar');
  });

  // Encerramento gracioso (docker stop envia SIGTERM)
  const encerrar = (sinal: string) => {
    logger.info({ sinal }, 'Encerrando a API');
    server.close(async () => {
      await pool?.end();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => encerrar('SIGTERM'));
  process.on('SIGINT', () => encerrar('SIGINT'));
}

iniciar().catch((erro) => {
  logger.error({ err: erro }, 'Falha ao iniciar a API');
  process.exit(1);
});