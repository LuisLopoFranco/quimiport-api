import { Router } from 'express';
import { ProdutoQuimicoController } from '../controllers/ProdutoQuimicoController';

export function produtoQuimicoRoutes(controller: ProdutoQuimicoController): Router {
  const router = Router();
  router.post('/', controller.criar);
  router.get('/', controller.listar);
  router.get('/:id', controller.buscar);
  router.put('/:id', controller.atualizar);
  router.patch('/:id/inativar', controller.inativar);
  return router;
}