import { z } from "zod";

/** Texto opcional: string vazia vira null (o contrato aceita null para limpar). */
export const textoOpc = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .transform((v) => (v === "" ? null : v));

// Mesmo padrão de `UrlExterna` no contrato: http(s), sem usuário/senha embutidos.
const URL_EXTERNA = /^https?:\/\/[^@/\s]+(\/\S*)?$/;
const MSG_URL = "Use um endereço começando com https:// (sem usuário ou senha)";

export const urlObrig = z.string().trim().max(500).regex(URL_EXTERNA, MSG_URL);

export const urlOpc = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || URL_EXTERNA.test(v), MSG_URL);

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

export const ufOpc = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v.toUpperCase()))
  .refine((v) => v === null || /^[A-Z]{2}$/.test(v), "UF com 2 letras");

/** Valor para o formulário: null/undefined vira string vazia. */
export const v = (x: string | null | undefined) => x ?? "";
