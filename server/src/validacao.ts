import { z } from 'zod';

/** Texto opcional: string vazia vira null (formulário sem preencher = apagar). */
export const textoOpc = (max: number) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), z.string().trim().max(max).nullable());

export const Telefone = z.string().regex(/^\+[1-9][0-9]{7,14}$/, 'Telefone em E.164, ex. +5511999999999');

/** http(s), sem `usuario:senha@` na URL: o Hub nunca guarda credencial (D-012). */
export const UrlExterna = z.string().max(500).refine((v) => {
  try {
    const u = new URL(v);
    return (u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password;
  } catch {
    return false;
  }
}, 'URL http(s) sem usuário e senha embutidos');

export function cnpjValido(c: string) {
  if (!/^[0-9]{14}$/.test(c) || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (base: string) => {
    let soma = 0;
    let peso = base.length - 7;
    for (const d of base) {
      soma += Number(d) * peso--;
      if (peso < 2) peso = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(c.slice(0, 12));
  const d2 = dv(c.slice(0, 12) + d1);
  return c.endsWith(`${d1}${d2}`);
}

export const Cnpj = z.string().refine(cnpjValido, 'CNPJ inválido (14 dígitos, sem pontuação)');
