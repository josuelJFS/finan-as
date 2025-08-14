<!-- Instruções específicas do projeto para orientar desenvolvimento e AI assistants.
Mantido atualizado: Agosto 2025. -->

# AppFinança - Personal Finance App

**Legenda de Status (1.0):**
✅ = Concluído | ❌ = Faltando (Obrigatório p/ 1.0) | 🟡 = Opcional / Pós 1.0 | 🔶 = Parcial (ainda exige complemento)

## MANIFESTO DE DESIGN & UX (Adicionar em toda nova feature)

Objetivo: cada tela deve ser clara em 5s, executável em até 3 toques para a ação principal e consistente em todos os estados (loading, vazio, erro, sucesso).

Princípios obrigatórios:

- Consistência visual: seguir tipografia, espaçamentos (múltiplos de 4 — preferir 4/8/12/16/24), cores e padrões já definidos.
- Hierarquia clara: 1 ação primária por tela (botão destacado), secundárias em menor ênfase, destrutivas em vermelho.
- Feedback imediato: toda ação que leva >150ms deve ter indicador (spinner, skeleton, shimmer) e estado desabilitado claro.
- Estados completos: implementar para cada lista/form: loading, vazio (mensagem + CTA), erro (retry), conteúdo.
- Acessibilidade: toques mínimos 44x44dp, contraste AA, labels descritivos, ícones não semânticos sempre com texto.
- Dark mode: paridade funcional e contraste revisado (não usar puro #000 em superfícies elevadas; usar tons neutros da paleta).
- Microinterações leves: evitar animações longas (>300ms); transições suaves em modais e feedback de toque.
- Redução de fricção: inputs pré-preenchidos quando possível (datas, contas padrão, último filtro usado).
- Previsibilidade: nada “pula” após load tardio; reservar espaço (layout shift zero) usando skeletons.

Checklist rápido antes de finalizar uma tela/componente:

1. Loading visível e não bloqueante? (Skeleton > Spinner isolado quando houver estrutura previsível)
2. Estado vazio educativo com CTA direto?
3. Erro recuperável com botão Tentar Novamente?
4. Ação principal claramente destacada?
5. Campos alinhados e espaçamentos consistentes (grid de 4)?
6. Toque confortável (≥44dp) e texto legível (≥14sp)?
7. Dark mode revisado manualmente?
8. Sem over-scroll branco/flash em dark? (usar cores de fundo corretas)
9. Logs de debug removidos ou reduzidos a warnings essenciais?
10. Performance: listas virtualizadas e sem renders desnecessários (memo/useCallback onde faz sentido)?

Padrões visuais resumidos:

- Espaçamento vertical entre blocos: 16
- Espaçamento interno de cartões: 16
- Gap entre inputs consecutivos: 12
- Raio padrão: 8 (botões, cartões) / 12 (modais top-sheet)
- Ícones: 20 (inline), 24 (botão), 32–40 (avatar/círculo)

Evitar:

- Texto cinza claro demais em dark (#6b7280 ok; evitar < #4b5563 em body).
- Excesso de cores na mesma tela (máx 1 primária + estados semânticos).
- Placeholder como label (usar label sempre que input persistir valor).

Sempre que criar/alterar componente, validar com este manifesto antes do commit.

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

## FUNCIONALIDADES (Visão 1.0)

1. ✅ **Onboarding** (básico ok – refinar preferências depois 🟡)
2. ✅ **CRUD de contas**
3. ✅ **CRUD de categorias**
4. ✅ **CRUD de transações** (despesas/receitas/transferências + notas + tags básicas)
5. ✅ **Busca e filtros Fase 1** (período, tipo, contas, multi categoria, texto, tags, faixa valor, pendentes, filtros salvos)
6. ✅ **Orçamentos** (CRUD + progresso + alertas básicos + cache fase 1)
7. 🔶 **Transações recorrentes** (DAO + cálculo próxima ocorrência + materialização básica no startup + telas lista/form esqueleto; faltam: seleção real de contas/categorias, edição, toggle ativa/inativa, dias semana, transferências, UI completa, marcação nas transações)
8. ❌ **Backup & Restore (export/import JSON + validação)**
9. 🔶 **Dashboard** (básico pronto; faltam comparativos adicionais / toggle 6-12m / linha tendência)
10. ❌ **Alertas de orçamento consolidados (painel unificado)**
11. 🔶 **Exportação CSV v2** (tags + separador + marcador transfer OK; falta formatação regional números)
12. ❌ **Filtros avançados Fase 2** (UX chips refinada, presets rápidos, AND/OR tags, destaque transfers, reset 1 toque)
13. 🟡 **Metas (Goals)** (postergável para pós 1.0 se necessário)
14. 🟡 **Anexos** (captura/preview/limpeza órfãos – MVP pós 1.0)
15. 🟡 **Multi-idioma completo (além pt-BR)**

## MODELAGEM DE DADOS (SQLite)

✅ **Tabelas**: settings, accounts, categories, transactions, budgets, goals, recurrences

- settings (moeda, tema, datas)
- accounts (nome, tipo, saldo_inicial, arquivada)
- categories (nome, parent_id, tipo)
- transactions (tipo, account_id, to_account_id, category_id, amount, occurred_at, note, tags, attachment, recurrence_id)
- budgets (category_id, period_key, amount)
- goals (nome, target_amount, deadline, allocated_amount)
- recurrences (template_json, frequency, next_run_at)

⚠️ **Índices**:

- (001) Criados: transactions(occurred_at), transactions(account_id), transactions(category_id), transactions(type), categories(parent_id), categories(type), budgets(category_id), budgets(period_start, period_end)
- (002) Adicionados: transactions(destination_account_id), transactions(account_id, type, occurred_at), budgets(category_id, period_start, period_end)

Benefício: aceleração de filtros por período/conta/categoria/tipo e cálculos agregados de orçamentos.

## TELAS E NAVEGAÇÃO

✅ **Tabs**: Dashboard, Transações, Orçamentos, Configurações
❌ **Stacks faltando**:

- Transações (detalhe, criar/editar)
- Orçamentos (criar/editar)
- Categorias (lista, criar/editar)
- Contas (lista, criar/editar)
- Recorrências (lista, criar/editar)
- Importar/Exportar

## STATUS RECENTE (Conquistas Novas)

✅ Atualização atômica de saldos ao criar/editar/excluir transações (transações + contas em uma DB transaction)  
✅ Reatividade: event bus (transactions:\* / accounts:balancesChanged) atualiza listas e dashboard  
✅ Filtros persistentes (lastUsedFilters) com restauração automática  
✅ Filtros salvos (add/aplicar/remover) – versão mínima  
✅ Indicador de filtros ativos no Dashboard  
✅ Exportação CSV respeitando filtros + compartilhamento (expo-sharing / Share fallback)  
✅ Query de progresso de orçamentos otimizada (redução de round-trips)
✅ Cache incremental de progresso de orçamentos (tabela budget_progress_cache + invalidação simples por transação)

## PENDENTES OBRIGATÓRIOS 1.0

🔶 Recorrências (engine base + DAO + materialização inicial feitos; faltar UI completa + edição + toggle + weekly UX + seleção contas/categorias)
❌ Backup & Restore (export JSON versionado + import com validação e overwrite seguro)
❌ Alertas de orçamento consolidados (lista de categorias em risco / excedidas)
❌ Filtros avançados Fase 2 (UX refinada, presets, AND/OR tags, destaque transfers, reset rápido)
❌ Invalidação seletiva cache de orçamentos (categoria/período) – fase 2
❌ Dashboard melhorias: toggle 6/12 meses + linha tendência simples
🔶 Export CSV v2: formatação regional números pendente

## OPCIONAIS (PÓS 1.0)

🟡 Goals (CRUD + progresso + integração dashboard)
🟡 Anexos (captura, preview, limpeza órfãos)
🟡 Multi-idioma completo
🟡 Heatmap / drilldown avançado no Dashboard
🟡 Automação / regras inteligentes futuras
🟡 Criptografia de backup
🟡 TagInput avançado + CategoryPill estética
🟡 Métricas de performance / logger estruturado avançado

## COMPONENTES REUTILIZÁVEIS

✅ MoneyInput  
✅ DatePicker  
✅ CategorySelector  
✅ AccountSelector  
✅ FilterChips (extraído)  
✅ AdvancedFilterModal (extraído)  
❌ CategoryPill  
🟡 TagInput (planejado)

### 🎨 PADRÃO DE BOTÕES EM FORMULÁRIOS (OBRIGATÓRIO)

Para formulários de criar/editar, SEMPRE usar botões dentro do ScrollView com espaçamento seguro:

**Estrutura obrigatória:**

```tsx
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const insets = useSafeAreaInsets();
const bottomPadding = insets.bottom + 24; // espaço para botões dentro do scroll

return (
  <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        {/* Conteúdo do formulário */}

        {/* Botões dentro do scroll */}
        <View className="mt-2 flex-row gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
          <TouchableOpacity
            onPress={handleCancel}
            className="flex-1 rounded-md bg-gray-200 py-3 dark:bg-gray-700"
          >
            <Text className="text-center font-semibold text-gray-900 dark:text-white">
              Cancelar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className={`flex-1 rounded-md py-3 ${
              loading ? "bg-gray-300 dark:bg-gray-600" : "bg-blue-500"
            }`}
          >
            <Text className="text-center font-semibold text-white">
              {loading ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>
);
```

**Pontos críticos:**

- `paddingBottom: insets.bottom + 24` no ScrollView para espaço dos botões
- Botões DENTRO do ScrollView (rolam junto com o conteúdo)
- `border-t` + `pt-3` para separar visualmente dos campos
- `py-3` nos botões para área de toque adequada
- `keyboardShouldPersistTaps="handled"` para funcionamento do teclado
- Botões sempre clicáveis acima da navigation bar do sistema

**Aplicar em:** TransactionForm ✅, AccountForm, CategoryForm, BudgetForm, GoalForm

## DESENVOLVIMENTO ATUAL

### ✅ CONCLUÍDO (Passo 0-4)

- Setup do projeto com Expo + TypeScript
- Configuração do NativeWind
- Infra de banco com migrations e DAOs
- Navegação e layout base (tabs)
- Telas básicas com className
- CRUD de contas completo (UI + lógica) ✅ BUG CORRIGIDO
- CRUD de categorias completo (UI + lógica hierárquica)
- CRUD de transações completo (receitas, despesas, transferências)
- Componentes reutilizáveis: MoneyInput, DatePicker, AccountSelector, CategorySelector
- Padrão de botões em formulários documentado e implementado

### 🔶 EM PROGRESSO (Passo 5)

- Dashboard melhorias (toggle período / linha tendência)
- Cache de orçamentos fase 2 (invalidação seletiva)
- Export CSV v2 (finalizar formatação números)

### ❌ PENDENTE (Passo 5-9)

- Recorrências (engine + UI)
- Backup & Restore
- Alertas de orçamento consolidados
- Filtros avançados fase 2
- Invalidação seletiva cache budgets
- Dashboard: melhorias (comparativos extras / linha)
- (Opcional) Goals
- (Opcional) Anexos

## PRIORIDADES IMEDIATAS (Atualizadas)

1. 🔶 Recorrências (engine base/materialização inicial prontos; implementar UI completa + edição/toggle + weekly days + seleção contas/categorias)
2. ❌ Backup & Restore (fluxo mínimo)
3. ❌ Invalidação seletiva cache budgets
4. 🔶 Dashboard: toggle 6/12m + linha tendência
5. ❌ Filtros avançados Fase 2 (após refactor concluído ✅)
6. 🔶 Export CSV v2: formatação números
7. ❌ Alertas de orçamento consolidados (painel)

✅ Concluído recentemente: Extração FilterChips + AdvancedFilterModal; Deltas mês atual vs anterior no gráfico; Badge alerta orçamento; Base Recorrências (DAO + engine + materialização inicial + telas lista/form esqueleto)

## BACKLOG DE MELHORIAS (Não Essenciais / Agendar Depois)

Foco primeiro no essencial (prioridades imediatas). Itens abaixo são incrementais e não bloqueiam as entregas principais:

- Debounce/throttle (100–300ms) para recomputar badge de orçamentos em rajadas de eventos.
- Persistir contagem de alertas em Zustand para evitar flash inicial (hidratar do store antes da primeira query).
- Acessibilidade do badge: `accessibilityLabel` descrevendo número de alertas (ex: "3 orçamentos em risco").
- Testes unitários para `BudgetDAO.getActiveBudgetsProgressOptimized` (caminho cache hit/miss).
- Enum central para motivos (`reason`) de `budgets:progressInvalidated` (ex: 'transaction', 'budgetUpdate', 'delete', 'create', 'selective').
- Limite visual para contagens altas: exibir "99+" se > 99 (hoje limitado a 9+).
- Medição de desempenho: log de duração do cálculo de progresso quando > 40ms para tunar cache.
- Substituir `console.log`/`console.warn` por util de logger com níveis e toggle por ambiente.
- Pré-cálculo incremental seletivo: mapear budgets ativos por categoria para invalidar apenas os afetados por uma transação (fase 2 do cache).
- Remover logs verbosos (`findAll` de budgets) em builds de produção.

Sequência após concluir acima: Recorrências → Backup/Restore → Anexos → Goals → Filtros Avançados Fase 2.

## GUIDELINES DE DESENVOLVIMENTO

- **SEMPRE usar className do NativeWind** ao invés de StyleSheet
- **TypeScript strict mode** - todos os tipos definidos
- **Atomic operations** - transações de banco sempre em transaction
- **Feature-first structure** - organização por funcionalidade
- **Acessibilidade** - todos os componentes com labels adequados
- **Performance** - usar React.memo, useCallback quando necessário
- **UX Consistente** - aplicar o Manifesto de Design & UX: estados (loading/vazio/erro), ação primária clara, spacing padronizado, dark mode testado
- **Feedback Imediato** - qualquer operação assíncrona >150ms deve sinalizar progresso
- **Estados Vazios Educativos** - sempre incluir mensagem + CTA para criar conteúdo

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

## ROADMAP ALTO NÍVEL

Curto prazo (1-2 sprints): Índices, filtros avançados (fase 1), gráfico dashboard, cache budgets.  
Médio prazo (3-4 sprints): Recorrências, Backup/Restore, Anexos (MVP).  
Longo prazo: Goals, analytics avançados (comparativos YTD, previsão), automações (reglas inteligentes), multi-idioma completo.

## DESIGN E UX

- **Paleta neutra** com tons de cinza e azul
- **Botões grandes** para facilitar toque
- **Feedback tátil** em ações importantes
- **Skeletons** durante carregamento
- **Estados vazios educativos** com calls-to-action
- **Tema claro/escuro** automático baseado no sistema

## NOTAS PARA CONTRIBUIDORES / AI

- Antes de criar novo utilitário para export, verificar `exportCsv` existente (estender ao invés de duplicar).
- Evitar recalcular agregados de orçamento completos em cada mudança de transação: implementar camada de cache (ex: tabela budget_progress_cache com invalidation por categoria/período).
- Reaproveitar event bus existente para disparar eventos específicos de orçamento (`budgets:progressInvalidated`).
- Ao adicionar filtros avançados, manter objeto `TransactionFilters` serializável e versionado (incluir `version` para migrações futuras).
- Toda nova migration deve ser idempotente e registrar versão incremental clara.

## QUALIDADE / CHECKLIST DE PR PARA NOVAS FEATURES

1. Cobertura de estados (loading, vazio, erro, sucesso)
2. Ação primária evidente (até 3 toques para fluxo principal)
3. Acessibilidade: labels, tamanho toque ≥44dp, contraste
4. Dark mode conferido manualmente
5. Sem warnings de TypeScript (strict) novos
6. Consultas SQL analisadas para necessidade de índices
7. Operações de escrita dentro de transaction
8. Eventos emitidos para atualizar telas afetadas
9. Tests unitários para lógica pura (se aplicável)
10. Documentação (este arquivo) ajustada se mudar roadmap

Fim do documento.
