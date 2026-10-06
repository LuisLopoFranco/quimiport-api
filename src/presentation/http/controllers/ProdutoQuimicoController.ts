import { Request, Response } from 'express';
import { AtualizarProdutoQuimico } from '../../../application/use-cases/produtos/AtualizarProdutoQuimico';
import { BuscarProdutoQuimico } from '../../../application/use-cases/produtos/BuscarProdutoQuimico';
import { CriarProdutoQuimico } from '../../../application/use-cases/produtos/CriarProdutoQuimico';
import { InativarProdutoQuimico } from '../../../application/use-cases/produtos/InativarProdutoQuimico';
import { ListarProdutosQuimicos } from '../../../application/use-cases/produtos/ListarProdutosQuimicos';
import { idParamSchema, produtoBodySchema, produtoQuerySchema } from '../validators/schemas';

/**
 * Controller: traduz HTTP → caso de uso → HTTP. Não contém regra de negócio.
 * Erros lançados aqui sobem para o errorHandler (Express 5 trata promessas rejeitadas).
 */
export class ProdutoQuimicoController {
  constructor(
    private readonly criarUC: CriarProdutoQuimico,
    private readonly listarUC: ListarProdutosQuimicos,
    private readonly buscarUC: BuscarProdutoQuimico,
    private readonly atualizarUC: AtualizarProdutoQuimico,
    private readonly inativarUC: InativarProdutoQuimico,
  ) {}

  criar = async (req: Request, res: Response) => {
    const body = produtoBodySchema.parse(req.body ?? {});
    const produto = await this.criarUC.executar(body as never);
    res.status(201).location(`/produtos-quimicos/${produto.id}`).json(produto);
  };

  listar = async (req: Request, res: Response) => {
    const filtros = produtoQuerySchema.parse(req.query);
    res.json(await this.listarUC.executar(filtros));
  };

  buscar = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await this.buscarUC.executar(id));
  };

  atualizar = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const body = produtoBodySchema.parse(req.body ?? {});
    res.json(await this.atualizarUC.executar(id, body as never));
  };

  inativar = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await this.inativarUC.executar(id));
  };
}