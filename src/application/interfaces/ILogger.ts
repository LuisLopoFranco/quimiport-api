/** Porta de log: os casos de uso registram eventos sem depender do pino. */
export interface ILogger {
  info(obj: object, msg: string): void;
  warn(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
}

export const loggerSilencioso: ILogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};