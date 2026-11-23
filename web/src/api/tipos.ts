// Apelidos dos tipos gerados do contrato (src/api/gerado/esquema.ts — não editar à mão;
// regenerar com `pnpm api:gerar`).
import type { components, operations } from "./gerado/esquema";

type S = components["schemas"];

export type Sessao = S["Sessao"];
export type Permissao = S["Permissao"];
export type AtorResumo = S["AtorResumo"];
export type Ator = S["Ator"];
export type Problema = S["Problema"];

export type Empresa = S["Empresa"];
export type EmpresaResumo = S["EmpresaResumo"];
export type EmpresaEntrada = S["EmpresaEntrada"];
export type AtualizacaoEmpresa = S["EmpresaAtualizacao"];
export type StatusEmpresa = S["StatusEmpresa"];
export type Endereco = S["Endereco"];
export type Contato = S["ContatoEmpresa"];
export type LinkCanal = S["LinkEmpresa"];
export type TipoLink = S["TipoLink"];
export type Ferramenta = S["FerramentaEmpresa"];
export type CategoriaFerramenta = S["CategoriaFerramenta"];
export type StatusFerramenta = S["StatusFerramenta"];
export type Responsavel = S["ResponsavelEmpresa"];

export type Projeto = S["Projeto"];
export type NovoProjeto = S["ProjetoEntrada"];
export type AtualizacaoProjeto = S["ProjetoAtualizacao"];
export type StatusProjeto = S["StatusProjeto"];
export type FaseProjeto = S["Fase"];
export type Prioridade = S["Prioridade"];
export type NotaAndamento = S["NotaAndamento"];

export type Documento = S["Documento"];
export type DocumentoEntrada = S["DocumentoEntrada"];
export type DocumentoAtualizacao = S["DocumentoAtualizacao"];
export type TipoDocumento = S["TipoDocumento"];

export type Painel = S["Painel"];

export type FiltroEmpresas = NonNullable<operations["listarEmpresas"]["parameters"]["query"]>;
export type FiltroProjetos = NonNullable<operations["listarProjetos"]["parameters"]["query"]>;
export type FiltroDocumentos = NonNullable<operations["listarDocumentos"]["parameters"]["query"]>;
