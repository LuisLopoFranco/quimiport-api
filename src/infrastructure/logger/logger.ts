import pino from 'pino';
import { env } from '../config/env';

/**
 * Logger estruturado (JSON) com pino.
 * - Em produção/Docker: uma linha JSON por evento, fácil de coletar (Loki, ELK, CloudWatch).
 * - Em desenvolvimento: saída colorida com pino-pretty.
 * - Em testes: silencioso.
 */
export const logger = pino({
  level: env.nodeEnv === 'test' ? 'silent' : env.logLevel,
  base: { servico: 'quimiport-api' },
  formatters: { level: (label) => ({ level: label }) },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ['req.headers.authorization'],
  ...(env.nodeEnv === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } } }
    : {}),
});