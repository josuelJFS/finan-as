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

## FUNCIONALIDADES OBRIGATÓRIAS

1. ⚠️ **Onboarding**: simples com moeda padrão, conta inicial e tema (BÁSICO IMPLEMENTADO)
2. ✅ **CRUD de contas**: saldo inicial, tipos diferentes e saldo total (CONCLUÍDO + PULL-TO-REFRESH)
3. ✅ **CRUD de categorias**: hierárquicas (despesa/receita) (CONCLUÍDO + PULL-TO-REFRESH)
4. ✅ **CRUD de transações**: tipo, conta, valor, data/hora, categoria, notas, tags, anexos (CONCLUÍDO)
5. ⚠️ **Busca e filtros**: com opção de salvar filtros (BÁSICO IMPLEMENTADO)
6. ✅ **Orçamentos**: CRUD completo (criar, editar, excluir) + progresso básico e alerta visual (refinar cálculo e alertas globais pendente)
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
⚠️ **Calcular progresso**: de orçamentos (otimização e cache incremental)
❌ **Exportar CSV**: do período atual
❌ **Alertas de orçamento**: surfaced no dashboard

## COMPONENTES REUTILIZÁVEIS

✅ **MoneyInput**: input para valores monetários  
✅ **DatePicker**: seletor de data  
✅ **CategorySelector**: modal bottom-sheet com scroll fixo  
✅ **AccountSelector**: modal bottom-sheet com scroll fixo  
❌ **CategoryPill**: chip de categoria

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

### ⚠️ EM PROGRESSO (Passo 5)

- Lógica de saldos em tempo real
- Dashboard com gráficos e KPIs (versão inicial)
- Otimização de cálculo de progresso de orçamentos

### ❌ PENDENTE (Passo 5-9)

- Dashboard avançado (drilldown, comparativos)
- Filtros salvos e busca avançada
- Alertas de orçamento consolidados (dashboard + badges)
- Transações recorrentes
- Anexos de comprovantes
- Backup e restore

## PRIORIDADES IMEDIATAS

1. **✅ CORRIGIDO - Bug AccountForm**:
   - ✅ AccountFormScreen: corrigido erro NOT NULL constraint failed: accounts.icon
   - ✅ Função getIconForType() implementada para garantir ícone baseado no tipo
   - ✅ Dados de criação/atualização sempre com ícone válido

2. **CRUDs**:

- ✅ Contas
- ✅ Categorias
- ✅ Transações
- ✅ Orçamentos
- ❌ Dashboard com gráficos e estatísticas

3. **Implementar componentes**:
   - ✅ MoneyInput para valores
   - ✅ DatePicker para datas
   - ✅ CategorySelector
   - ✅ AccountSelector

4. **Funcionalidade core (próximo)**:

- Atualização de saldo em criar/editar/excluir transações
- Recalcular saldos globais incrementalmente
- Filtros funcionais básicos (conta, tipo, período)
- Otimizar cálculo de progresso de orçamentos e alertas

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

## PRÓXIMOS PASSOS CRÍTICOS (Atualizado)

1. Lógica de saldos em tempo real (operações atômicas)
2. Dashboard: KPIs + gráfico entradas vs saídas
3. Progresso de orçamentos otimizado + alertas no dashboard
4. Filtros básicos persistentes (conta, categoria, tipo, período)
5. Exportação CSV (período atual)
6. Motor de recorrências (materialização idempotente)
7. Backup/Restore JSON
8. Suporte a anexos (estrutura de arquivo + preview)

## DESIGN E UX

- **Paleta neutra** com tons de cinza e azul
- **Botões grandes** para facilitar toque
- **Feedback tátil** em ações importantes
- **Skeletons** durante carregamento
- **Estados vazios educativos** com calls-to-action
- **Tema claro/escuro** automático baseado no sistema
