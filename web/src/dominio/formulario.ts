import { z } from "zod";

/** Texto opcional: string vazia vira null (limpa o campo no PATCH). */
export const textoOpc = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .transform((v) => (v === "" ? null : v));

export const urlOpc = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine(
    (v) => v === null || /^https?:\/\/\S+$/.test(v),
    "Use um endereço começando com https://",
  );

export const urlObrig = z
  .string()
  .trim()
  .regex(/^https?:\/\/\S+$/, "Use um endereço começando com https://");

/** Telefone em E.164 (+5511999999999); aceita espaços, traços e parênteses na digitação. */
export const telefoneOpc = z
  .string()
  .transform((v) => v.replace(/[\s().-]/g, ""))
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^\+[1-9]\d{7,14}$/.test(v), "Use o formato +55 11 99999-9999");

export const emailOpc = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || z.email().safeParse(v).success, "E-mail inválido");

export const digitosOpc = (n: number, msg: string) =>
  z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || v.length === n, msg);

/** Valor para o formulário: null/undefined vira string vazia. */
export const v = (x: string | null | undefined) => x ?? "";

/** Remove nulls (listas embutidas não usam semântica de PATCH). */
export function semNulos<T extends object>(o: T) {
  return Object.fromEntries(Object.entries(o).filter(([, x]) => x !== null)) as {
    [K in keyof T]: Exclude<T[K], null>;
  };
}
