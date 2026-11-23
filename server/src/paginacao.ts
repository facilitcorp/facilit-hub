import { z } from 'zod';
import { Problema } from './problema.js';

export const Limite = z.coerce.number().int().min(1).max(100).default(25);

/** Cursor opaco: base64url de JSON. Quem decide o conteúdo é a rota. */
export const codificarCursor = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');

export function decodificarCursor<T>(c: string | undefined, esquema: z.ZodType<T>): T | undefined {
  if (!c) return undefined;
  try {
    return esquema.parse(JSON.parse(Buffer.from(c, 'base64url').toString()));
  } catch {
    throw new Problema(400, 'cursor_invalido', 'Cursor inválido', [{ campo: 'cursor', codigo: 'invalido', mensagem: 'Cursor inválido' }]);
  }
}

/** Query string repetida (`?status=a&status=b`) ou única vira lista. */
export const lista = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]), z.array(item).optional());
