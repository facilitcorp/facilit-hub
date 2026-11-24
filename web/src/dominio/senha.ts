/** Sem caracteres ambíguos (0/O, 1/l/I), para ditar ou digitar a senha sem erro. */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
export const TAMANHO_SENHA = 16;

/**
 * Senha provisória com `crypto.getRandomValues`. Descarta bytes fora do maior
 * múltiplo do alfabeto para não favorecer nenhum caractere.
 */
export function gerarSenha(tamanho = TAMANHO_SENHA) {
  const limite = 256 - (256 % ALFABETO.length);
  let senha = "";
  while (senha.length < tamanho) {
    for (const b of crypto.getRandomValues(new Uint8Array(tamanho * 2))) {
      if (b < limite && senha.length < tamanho) senha += ALFABETO[b % ALFABETO.length];
    }
  }
  return senha;
}
