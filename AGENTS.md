# AGENTS

## Objetivo

Garantir evolução sustentável do monorepo com foco em qualidade, manutenção e compatibilidade de documentos.

## Princípios

- SOLID
- KISS
- Clean Architecture
- Testes automatizados para todo comportamento crítico
- Sem dependência de APIs terceiras de conversão

## Convenções

- Nome de arquivo em kebab-case
- Pastas por domínio/feature
- Evitar acoplamento entre camada de domínio e infraestrutura
- Tipos compartilhados em `packages/shared-types`

## Fluxo de desenvolvimento

1. Criar/usar branch `codex/*`
2. Implementar com testes
3. Rodar `pnpm typecheck`, `pnpm test`, `pnpm build`
4. Atualizar documentação afetada

## Frontend

- Consumir API por cliente gerado em `apps/web/src/lib/api-client`
- Evitar chamadas HTTP diretas fora de camada de API

## Backend

- Casos de uso em `application`
- Regras de negócio em `domain`
- Adapters em `infrastructure`
- Rotas/controladores em `interface`
