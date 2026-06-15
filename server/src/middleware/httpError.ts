// =====================================================================
// HttpError — erro com status HTTP, serializado pelo errorHandler como { erro }.
// Rotas/serviços lançam HttpError; o handler central traduz para a resposta.
// =====================================================================
export class HttpError extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.name = 'HttpError'
    this.status = status
  }
}

export const erro400 = (msg: string) => new HttpError(400, msg)
export const erro401 = (msg = 'Não autenticado') => new HttpError(401, msg)
export const erro403 = (msg = 'Sem permissão') => new HttpError(403, msg)
export const erro404 = (msg = 'Não encontrado') => new HttpError(404, msg)
export const erro409 = (msg: string) => new HttpError(409, msg)
