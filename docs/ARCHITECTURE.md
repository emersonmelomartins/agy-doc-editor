# Architecture

## Bounded Contexts

- Documents
- Import/Export
- Sync

## Backend Layers

- `domain`: entidades e contratos
- `application`: casos de uso
- `infrastructure`: sqlite/supabase/conversion engines
- `interface`: HTTP routes Fastify

## Frontend Modules

- `features/documents`
- `features/editor`
- `features/sync`

## Data Flow

1. Web chama SDK gerado por Kubb
2. API valida payloads
3. Use cases aplicam regras
4. Repositório persiste em SQLite
5. Sync opcional envia para Supabase
