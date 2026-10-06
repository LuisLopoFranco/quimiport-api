import { Pool, types } from 'pg';

// Colunas DATE voltam como texto 'AAAA-MM-DD' (evita deslocamento de fuso horário).
types.setTypeParser(1082, (valor) => valor);
// NUMERIC volta como number (as quantidades cabem com folga em um double).
types.setTypeParser(1700, (valor) => Number(valor));

export function criarPool(connectionString: string): Pool {
  return new Pool({ connectionString, max: 10 });
}