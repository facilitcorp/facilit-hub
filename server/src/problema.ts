/** Erro que vira `application/problem+json` (schema `Problema` do contrato). */
export class Problema extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    readonly titulo: string,
    readonly campos?: { campo: string; codigo: string; mensagem: string }[],
  ) {
    super(titulo);
  }
}

export const naoAutenticado = () => new Problema(401, 'nao_autenticado', 'Sessão ausente ou expirada');
export const semPermissao = () => new Problema(403, 'sem_permissao', 'Sem permissão para esta ação');
