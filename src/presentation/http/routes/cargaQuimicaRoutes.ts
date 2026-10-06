import { Router } from 'express';
import { CargaQuimicaController } from '../controllers/CargaQuimicaController';

export function cargaQuimicaRoutes(controller: CargaQuimicaController): Router {
  const router = Router();
  router.post('/', controller.registrar);
  router.get('/', controller.listar);
  router.get('/:id', controller.buscar);
  router.get('/:id/historico', controller.historico);
  router.post('/:id/documentos', controller.anexarDocumento);
  router.patch('/:id/status', controller.alterarStatus);
  router.patch('/:id/bloquear', controller.bloquear);
  router.patch('/:id/liberar', controller.liberar);
  router.patch('/:id/cancelar', controller.cancelar);
  return router;
}