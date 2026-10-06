import { readFileSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { logger as loggerPadrao } from '../infrastructure/logger/logger';
import { Metricas } from '../infrastructure/observability/metricas';
import { criarGraphqlHandler } from '../presentation/graphql/schema';
import { errorHandler, notFoundHandler } from '../presentation/http/middlewares/errorHandler';
import { metricsMiddleware } from '../presentation/http/middlewares/metricsMiddleware';
import { cargaQuimicaRoutes } from '../presentation/http/routes/cargaQuimicaRoutes';
import { produtoQuimicoRoutes } from '../presentation/http/routes/produtoQuimicoRoutes';
import { Container } from './container';

interface AppDeps {
  container: Container;
  metricas: Metricas;
  logger?: typeof loggerPadrao;
  /** Verifica a saúde do banco (GET /health). */
  verificarBanco?: () => Promise<void>;
}

export function criarApp({ container, metricas, logger = loggerPadrao, verificarBanco }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  // Log de cada requisição recebida (método, rota, status, tempo de resposta)
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/metrics' },
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    }),
  );
  app.use(metricsMiddleware(metricas.duracaoHttp));

  // Documentação OpenAPI (Swagger UI em /docs e o JSON em /docs.json)
  const openapi = YAML.parse(readFileSync(path.resolve(process.cwd(), 'docs/api/openapi.yaml'), 'utf8'));
  app.get('/docs.json', (_req, res) => res.json(openapi));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'QuimiPort API' }));

  app.get('/', (_req, res) => res.redirect('/docs'));
  app.get('/health', async (_req, res) => {
    try {
      await verificarBanco?.();
      res.json({ status: 'ok', banco: verificarBanco ? 'ok' : 'memoria' });
    } catch {
      res.status(503).json({ status: 'erro', banco: 'indisponivel' });
    }
  });
  app.get('/metrics', async (_req, res) => {
    res.type(metricas.registry.contentType).send(await metricas.registry.metrics());
  });

  app.use('/produtos-quimicos', produtoQuimicoRoutes(container.produtoController));
  app.use('/cargas-quimicas', cargaQuimicaRoutes(container.cargaController));
  app.all(
    '/graphql',
    criarGraphqlHandler({
      listarCargas: container.casosDeUso.listarCargas,
      buscarProduto: container.casosDeUso.buscarProduto,
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}