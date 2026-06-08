---
date: 2026-02-14
topic: Admin Security Architecture & Database Permissions
tags: [admin, security, rls, database, architecture]
status: active
---

# Admin Security Architecture & Database Permissions

## 1. Contexto do Sistema

O sistema utiliza **Supabase** para backend (Auth + Database) e **React** para o frontend. A segurança é imposta em duas camadas principais:

1. **Frontend**: Proteção de rotas e verificações de UI via `RoleContext`.
2. **Database**: Row Level Security (RLS) policies no PostgreSQL.

## 2. Componentes Analisados

### 2.1. Controle de Acesso Frontend (`RoleContext.tsx`)

- **Localização**: `src/contexts/RoleContext.tsx`
- **Função**: Gerencia o estado de autenticação e autorização do usuário no cliente.
- **Mecanismo**:
  - Define papéis (`AppRole`): `admin`, `editor`, `content_creator`, `coordinator`, `user`.
  - Define permissões por papel (`ROLE_PERMISSIONS`).
  - Mapeia rotas para permissões (`PAGE_PERMISSION_MAP`).
  - Expõe hooks `useRole()` para verificar acesso (`canAccessPage`, `hasPermission`).
  - Sincroniza com o Supabase Auth e tabela `user_roles`.

### 2.2. Layout Administrativo (`AdminLayout.tsx`)

- **Localização**: `src/components/admin/AdminLayout.tsx`
- **Função**: Wrapper para todas as páginas `/admin`.
- **Mecanismo**:
  - Verifica autenticação na montagem.
  - Redireciona para login se não autenticado.
  - Verifica permissões de acesso baseadas no `RoleContext`.
  - Renderiza navegação lateral baseada nas permissões do usuário logado.

### 2.3. Segurança de Dados (Database Migrations)

#### Tabela `content_blocks` (Conteúdo CMS)

- **Arquivo Recente**: `supabase/migrations/20260214_fix_content_blocks_permissions.sql`
- **Estado Atual**:
  - RLS Habilitado.
  - **Leitura**: Pública (`anon`, `authenticated`).
  - **Escrita (Insert/Update/Delete)**: Restrita a usuários com papéis `admin`, `editor`, `content_creator` na tabela `public.user_roles`.
  - **Política**: Check explícito `auth.uid() IN (SELECT user_id FROM public.user_roles ...)`

#### Tabela `teachers` (Equipe Docente)

- **Arquivo Recente**: `supabase/migrations/20260214_secure_teachers_table.sql`
- **Estado Atual**:
  - RLS Habilitado.
  - **Leitura**: Pública.
  - **Escrita**: Restrita a usuários com papéis `admin`, `editor`.
  - **Política**: Substituiu políticas anteriores que permitiam escrita para qualquer `authenticated`.

## 3. Padrões Identificados

- **Role-Based Access Control (RBAC)**: O sistema migrou de um modelo permissivo ("autenticado pode tudo") para um modelo RBAC estrito verificado contra uma tabela de junção `user_roles`.
- **Dever de Conformidade**: Novas tabelas ou funcionalidades administrativas devem seguir o padrão de RLS estrito checando `user_roles` ou usando funções auxiliares (`is_admin`) se aplicável.

## 4. Observações

- A função `is_admin` e `check_enrollment_rate_limit` foram auditadas e identificadas como seguras (parametrizadas).
- O sistema de frontend (`RoleContext`) reflete as permissões do banco, mas a segurança real é garantida pelo RLS no PostgreSQL.
