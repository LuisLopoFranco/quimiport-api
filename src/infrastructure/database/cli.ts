/* Uso: `npm run db:migrate` ou `npm run db:seed` */
import { env } from '../config/env';
import { logger } from '../logger/logger';
import { executarMigracoes, executarSeeds } from './migrar';
import { criarPool } from './pool';

async function main() {
  const comando = process.argv[2] ?? 'migrate';
  const pool = criarPool(env.databaseUrl);
  try {
    if (comando === 'migrate') {
      const novas = await executarMigracoes(pool);
      logger.info({ migracoes: novas }, novas.length ? 'Migrações aplicadas' : 'Banco já está atualizado');
    } else if (comando === 'seed') {
      const arquivos = await executarSeeds(pool);
      logger.info({ seeds: arquivos }, 'Seeds aplicados');
    } else {
      throw new Error(`Comando desconhecido: ${comando}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  logger.error({ err: erro }, 'Falha ao executar comando de banco');
  process.exit(1);
});