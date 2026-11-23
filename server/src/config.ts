import pg from 'pg';
import { dbDoPool, type Db } from './db.js';

/** Configuração só por variável de ambiente (CONTRIBUTING: nada interno em código). */
export interface Config {
  /** Origem pública do Hub, ex. https://hub.exemplo.com; o `Origin` das mutações tem que bater. */
  origemPermitida: string;
  /** Duração da sessão, em horas. */
  sessaoHoras: number;
  /** Pasta do front compilado; sem ela, só a API sobe. */
  webDir?: string;
  logs?: boolean;
}

function obrigatoria(nome: string): string {
  const v = process.env[nome];
  if (!v) throw new Error(`variável de ambiente ${nome} não definida`);
  return v;
}

export function lerConfig(): Config {
  return {
    origemPermitida: obrigatoria('HUB_ORIGEM'),
    sessaoHoras: Number(process.env.HUB_SESSAO_HORAS ?? 12),
    webDir: process.env.HUB_WEB_DIR || undefined,
    logs: true,
  };
}

export function conectar(): { db: Db; fechar: () => Promise<void> } {
  const pool = new pg.Pool({ connectionString: obrigatoria('DATABASE_URL') });
  return { db: dbDoPool(pool), fechar: () => pool.end() };
}
