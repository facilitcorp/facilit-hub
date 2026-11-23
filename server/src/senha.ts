import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const scrypt = (senha: string, sal: Buffer, tam: number, opcoes: ScryptOptions) =>
  new Promise<Buffer>((ok, erro) =>
    scryptCb(senha, sal, tam, opcoes, (e, chave) => (e ? erro(e) : ok(chave))),
  );

const OPCOES = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Formato: scrypt$N$r$p$sal$hash (base64url). Os parâmetros vão junto para poder subir o custo depois. */
export async function gerarHash(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scrypt(senha, sal, 32, OPCOES);
  return ['scrypt', OPCOES.N, OPCOES.r, OPCOES.p, sal.toString('base64url'), hash.toString('base64url')].join('$');
}

export async function conferir(senha: string, guardado: string): Promise<boolean> {
  const [alg, n, r, p, sal, hash] = guardado.split('$');
  if (alg !== 'scrypt' || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'base64url');
  const obtido = await scrypt(senha, Buffer.from(sal, 'base64url'), esperado.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: OPCOES.maxmem,
  });
  return timingSafeEqual(obtido, esperado);
}

/** Hash fixo para gastar o mesmo tempo quando o e-mail não existe (não revela quem tem conta). */
export const HASH_FALSO = await gerarHash(randomBytes(16).toString('hex'));
