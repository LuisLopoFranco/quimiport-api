import { RequestHandler } from 'express';
import { Histogram } from 'prom-client';

/** Mede a duração de cada requisição usando o padrão da rota (ex.: /cargas-quimicas/:id). */
export function metricsMiddleware(histograma: Histogram): RequestHandler {
  return (req, res, next) => {
    const fim = histograma.startTimer();
    res.on('finish', () => {
      const rota = req.route?.path ? `${req.baseUrl}${req.route.path}` : 'nao_mapeada';
      fim({ method: req.method, route: rota, status_code: String(res.statusCode) });
    });
    next();
  };
}