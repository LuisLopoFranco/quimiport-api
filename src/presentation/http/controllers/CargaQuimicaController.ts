import { Request, Response } from 'express';
import { AlterarStatusCarga } from '../../../application/use-cases/cargas/AlterarStatusCarga';
import { AnexarDocumentoCarga } from '../../../application/use-cases/cargas/AnexarDocumentoCarga';
import { BuscarCargaQuimica } from '../../../application/use-cases/cargas/BuscarCargaQuimica';
import { ConsultarHistoricoCarga } from '../../../application/use-cases/cargas/ConsultarHistoricoCarga';
import { ListarCargasQuimicas } from '../../../application/use-cases/cargas/ListarCargasQuimicas';
import { RegistrarCargaQuimica } from '../../../application/use-cases/cargas/RegistrarCargaQuimica';
import {
  alterarStatusSchema,
  cargaBodySchema,
  cargaQuerySchema,
  documentoBodySchema,
  idParamSchema,
  motivoSchema,
} from '../validators/schemas';

export class CargaQuimicaController {
  constructor(
    private readonly registrarUC: RegistrarCargaQuimica,
    private readonly listarUC: ListarCargasQuimicas,
    private readonly buscarUC: BuscarCargaQuimica,
    private readonly alterarStatusUC: AlterarStatusCarga,
    private readonly anexarDocumentoUC: AnexarDocumentoCarga,
    private readonly historicoUC: ConsultarHistoricoCarga,
  ) {}

  registrar = async (req: Request, res: Response) => {
    const body = cargaBodySchema.parse(req.body ?? {});
    const carga = await this.registrarUC.executar(body as never);
    res.status(201).location(`/cargas-quimicas/${carga.id}`).json(carga);
  };

  listar = async (req: Request, res: Response) => {
    const filtros = cargaQuerySchema.parse(req.query);
    res.json(await this.listarUC.executar(filtros));
  };

  buscar = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await this.buscarUC.executar(id));
  };

  alterarStatus = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const { status, motivo } = alterarStatusSchema.parse(req.body ?? {});
    res.json(await this.alterarStatusUC.executar(id, status, motivo));
  };

  bloquear = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const body = motivoSchema.parse(req.body);
    res.json(await this.alterarStatusUC.executar(id, 'BLOQUEADA', body?.motivo));
  };

  liberar = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await this.alterarStatusUC.executar(id, 'LIBERADA'));
  };

  cancelar = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const body = motivoSchema.parse(req.body);
    res.json(await this.alterarStatusUC.executar(id, 'CANCELADA', body?.motivo));
  };

  anexarDocumento = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const documento = documentoBodySchema.parse(req.body ?? {});
    res.status(201).json(await this.anexarDocumentoUC.executar(id, documento));
  };

  historico = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await this.historicoUC.executar(id));
  };
}