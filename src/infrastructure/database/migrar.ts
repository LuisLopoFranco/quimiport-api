import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

/**
 * Executor de migrações simples: aplica, em ordem alfabética, os arquivos .sql
 * de db/migrations que ainda não constam na tabela schema_migrations.
 */
export async function executarMigracoes(pool: Pool, pasta = path.resolve(process.cwd(), 'db/migrations')) {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    nome VARCHAR(255) PRIMARY KEY,
    aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const { rows } = await pool.query<{ nome: string }>('SELECT nome FROM schema_migrations');
  const aplicadas = new Set(rows.map((r) => r.nome));
  const arquivos = (await readdir(pasta)).filter((f) => f.endsWith('.sql')).sort();
  const novas: string[] = [];

  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) continue;
    const sql = await readFile(path.join(pasta, arquivo), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (nome) VALUES ($1)', [arquivo]);
      await client.query('COMMIT');
      novas.push(arquivo);
    } catch (erro) {
      await client.query('ROLLBACK');
      throw erro;
    } finally {
      client.release();
    }
  }
  return novas;
}

export async function executarSeeds(pool: Pool, pasta = path.resolve(process.cwd(), 'db/seeds')) {
  const arquivos = (await readdir(pasta)).filter((f) => f.endsWith('.sql')).sort();
  for (const arquivo of arquivos) {
    await pool.query(await readFile(path.join(pasta, arquivo), 'utf8'));
  }
  return arquivos;
}