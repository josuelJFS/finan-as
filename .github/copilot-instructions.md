<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://c2. **Implementar componentes**:
   - ✅ MoneyInput para valores
   - ✅ DatePicker para datas
   - ✅ CategorySelector
   - ✅ AccountSelector

3. **Funcionalidade core**:
   - ✅ Pull-to-refresh em listas
   - ✅ Atualização automática quando volta para a tela
   - ❌ Criar transação com atualização de saldo
   - ❌ Cálculo de saldos em tempo real
   - ❌ Filtros funcionaisstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# AppFinança - Personal Finance App

## ESPECIFICAÇÕES COMPLETAS DO PROJETO

Aplicativo de finanças pessoais, offline-first, usando Expo (React Native + TypeScript) com NativeWind para UI e SQLite para armazenamento local. O app deve ser rápido, acessível, fácil de usar, com foco em registrar despesas/receitas, orçamentos e relatórios.

## STACK E PADRÕES

- ✅ Expo SDK (última versão estável), TypeScript estrito, ESLint + Prettier
- ✅ Navegação: expo-router (tabs + stacks)
- ✅ UI: NativeWind (TailwindCSS) com tema claro/escuro; componentes acessíveis
- ✅ Estado: estado local por tela + Zustand para preferências/tema/filtros
- ✅ Banco: expo-sqlite com migrations versionadas e camada de acesso a dados (DAO)
- ✅ Segurança: expo-secure-store para dados sensíveis, opcional biometria (expo-local-authentication)
- ✅ Arquitetura: feature-first (features/transactions, features/budgets, etc.)
- ⚠️ Testes: unitários (Vitest/Jest) para utils/DAOs; e2e opcional
- ⚠️ i18n: pt-BR por padrão, pronto para multi-idioma
- ⚠️ Performance: listas virtualizadas, memoização, índices no SQLite

## FUNCIONALIDADES OBRIGATÓRIAS

1. ⚠️ **Onboarding**: simples com moeda padrão, conta inicial e tema (BÁSICO IMPLEMENTADO)
2. ✅ **CRUD de contas**: saldo inicial, tipos diferentes e saldo total (CONCLUÍDO + PULL-TO-REFRESH)
3. ✅ **CRUD de categorias**: hierárquicas (despesa/receita) (CONCLUÍDO + PULL-TO-REFRESH)
4. ⚠️ **CRUD de transações**: tipo, conta, valor, data/hora, categoria, notas, tags, anexos (PARCIAL)
5. ⚠️ **Busca e filtros**: com opção de salvar filtros (BÁSICO IMPLEMENTADO)
6. ⚠️ **Orçamentos**: por categoria com alerta visual 80%/100% (UI CRIADA, LÓGICA FALTANDO)
7. ❌ **Metas**: cálculo de progresso (NÃO IMPLEMENTADO)
8. ❌ **Transações recorrentes**: regras e materialização automática (NÃO IMPLEMENTADO)
9. ⚠️ **Dashboard**: saldo total, entradas/saídas, gráficos (BÁSICO IMPLEMENTADO)
10. ❌ **Anexos**: fotos de comprovantes com visualização (NÃO IMPLEMENTADO)
11. ❌ **Backup/restore**: JSON/CSV com validação de schema (NÃO IMPLEMENTADO)

## MODELAGEM DE DADOS (SQLite)

✅ **Tabelas implementadas**: settings, accounts, categories, transactions, budgets, goals, recurrences

- ✅ **settings**: moeda, tema, datas
- ✅ **accounts**: nome, tipo, saldo inicial, arquivada
- ✅ **categories**: nome, pai, tipo
- ✅ **transactions**: tipo, conta, conta destino, categoria, valor, data, nota, tags, anexo, recorrência
- ✅ **budgets**: categoria, período, valor
- ✅ **goals**: nome, valor alvo, data limite, valor alocado
- ✅ **recurrences**: template de transação, frequência, próxima execução
- ❌ **Índices**: em occurred_at e category_id (FALTANDO)

## TELAS E NAVEGAÇÃO

✅ **Tabs**: Dashboard, Transações, Orçamentos, Configurações
❌ **Stacks faltando**:

- Transações (detalhe, criar/editar)
- Orçamentos (criar/editar)
- Categorias (lista, criar/editar)
- Contas (lista, criar/editar)
- Recorrências (lista, criar/editar)
- Importar/Exportar

## FLUXOS CRÍTICOS PENDENTES

❌ **Criar transação**: atualização de saldo atômica
❌ **Filtros salvos**: totais recalculados
❌ **Materializar recorrências**: na abertura do app
❌ **Calcular progresso**: de orçamentos
❌ **Exportar CSV**: do período atual

## COMPONENTES REUTILIZÁVEIS FALTANDO

❌ **MoneyInput**: input para valores monetários
❌ **DatePicker**: seletor de data
❌ **CategoryPill**: chip de categoria
❌ **AccountSelector**: seletor de conta

## DESENVOLVIMENTO ATUAL

### ✅ CONCLUÍDO (Passo 0-3)

- Setup do projeto com Expo + TypeScript
- Configuração do NativeWind
- Infra de banco com migrations e DAOs
- Navegação e layout base (tabs)
- Telas básicas com className
- CRUD de contas completo (UI + lógica)
- CRUD de categorias completo (UI + lógica hierárquica)

### ⚠️ EM PROGRESSO (Passo 4)

- CRUD completo de transações (próximo)

### ❌ PENDENTE (Passo 4-9)

- CRUD completo de transações
- Filtros salvos e busca avançada
- CRUD de orçamentos com alertas
- Transações recorrentes
- Dashboard com gráficos
- Anexos de comprovantes
- Backup e restore

## PRIORIDADES IMEDIATAS

1. **🐛 CORRIGIR BUG URGENTE**:
   - ❌ AccountFormScreen: erro NOT NULL constraint failed: accounts.icon ao salvar conta
   - ❌ Verificar se tipo/ícone está sendo enviado corretamente
   - ❌ Debug logs adicionados - testar no app

2. **Criar telas de CRUD**:
   - ✅ `/accounts` - Lista e criação de contas (COM BUG)
   - ✅ `/categories` - Lista e criação de categorias
   - ❌ `/transaction/create` - Criar transação
   - ❌ `/transaction/[id]` - Detalhe/edição

3. **Implementar componentes**:
   - ✅ MoneyInput para valores
   - ✅ DatePicker para datas
   - ✅ CategorySelector
   - ✅ AccountSelector

4. **Funcionalidade core**:
   - ❌ Criar transação com atualização de saldo
   - ❌ Cálculo de saldos em tempo real
   - ❌ Filtros funcionais

## GUIDELINES DE DESENVOLVIMENTO

- **SEMPRE usar className do NativeWind** ao invés de StyleSheet
- **TypeScript strict mode** - todos os tipos definidos
- **Atomic operations** - transações de banco sempre em transaction
- **Feature-first structure** - organização por funcionalidade
- **Acessibilidade** - todos os componentes com labels adequados
- **Performance** - usar React.memo, useCallback quando necessário

## ESTRUTURA DE ARQUIVOS ATUAL

```
src/
├── components/        # Componentes reutilizáveis (VAZIO - IMPLEMENTAR)
├── features/         # Features por módulo
│   ├── accounts/     # (IMPLEMENTAR UIs)
│   ├── transactions/ # (IMPLEMENTAR UIs)
│   ├── budgets/      # (IMPLEMENTAR UIs)
│   └── categories/   # (IMPLEMENTAR UIs)
├── lib/
│   ├── database/     # ✅ DAOs e migrations
│   ├── store.ts      # ✅ Zustand store
│   └── utils.ts      # ✅ Funções utilitárias
└── types/
    └── entities.ts   # ✅ Tipos das entidades
```

## PRÓXIMOS PASSOS CRÍTICOS

1. **Implementar CRUD de Contas** - Tela de lista e criação
2. **Implementar CRUD de Categorias** - Tela de lista e criação
3. **Implementar CRUD de Transações** - Formulário completo
4. **Criar componentes reutilizáveis** - MoneyInput, DatePicker, etc.
5. **Implementar lógica de saldos** - Atualização atômica
6. **Adicionar gráficos** - Charts para dashboard
7. **Implementar backup/restore** - Export/import JSON/CSV

## DESIGN E UX

- **Paleta neutra** com tons de cinza e azul
- **Botões grandes** para facilitar toque
- **Feedback tátil** em ações importantes
- **Skeletons** durante carregamento
- **Estados vazios educativos** com calls-to-action
- **Tema claro/escuro** automático baseado no sistema
