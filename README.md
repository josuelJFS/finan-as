# AppFinança

Aplicativo de finanças pessoais (offline-first) desenvolvido em **Expo + React Native + TypeScript**, com foco em cadastro rápido de transações, orçamentos, visualizações claras e exportação de dados. Este README consolida visão, instalação, arquitetura, padrões de UX, roadmap e contribuição.

---

## Sumário

1. Visão Geral
2. Principais Funcionalidades
3. Stack Técnica
4. Começando (Setup & Execução)
5. Scripts Disponíveis
6. Estrutura de Pastas
7. Banco de Dados & Migrations
8. Estado Global & Eventos
9. Padrões de UI/UX (Manifesto Resumido)
10. Componentes de Gráficos
11. Segurança & Biometria
12. Acessibilidade
13. Performance
14. Testes
15. Exportação & Backup
16. Roadmap (1.0 e Pós)
17. Contribuindo
18. Boas Práticas de Código
19. Troubleshooting
20. Licença

---

## 1. Visão Geral

App pessoal para controle de receitas, despesas, transferências, categorias, orçamentos e análise visual de tendências. Funciona **offline** com SQLite local e possibilita **backup/importação** via JSON + exportação CSV.

Objetivos principais:

- Fluxo rápido (até 3 toques) para registrar uma transação.
- Visualizações claras de gastos por categoria e evolução temporal.
- Orçamentos com alertas e recorrências de transações materializadas.
- Base sólida para features futuras (metas, anexos, multi-idioma, análises avançadas).

---

## 2. Principais Funcionalidades

✅ CRUD de Contas / Categorias / Transações (despesa, receita, transferência)
✅ Filtros avançados: período, tipo, contas, categorias múltiplas, tags, texto, faixa de valor, incluir/excluir transferências, AND/ALL tags
✅ Orçamentos com progresso + alertas configuráveis
✅ Recorrências (CRUD + materialização automática básica)
✅ Dashboard (12/6m toggle, linha de tendência, comparativos últimos 6m vs anteriores)
✅ Distribuição por categoria (Donut) & gráficos de tendências (barras / sparkline / área em evolução)
✅ Backup & Restore (JSON) + Export CSV v2 (locale numbers, tags, transfer marker)
✅ Tema claro/escuro + persistência de preferências
✅ Biometria opcional no start (Face/Touch/Impressão)
🔶 Em progresso: Tooltips interativos, animações finais de gráficos, skeleton loaders
❌ A implementar para 1.0: polish completo dos gráficos (ver Roadmap)
🟡 Pós 1.0: Goals (metas), Anexos, Heatmap avançado, Multi-idioma completo, TreeMap, Waterfall, MultiLine, export de gráficos como imagem

---

## 3. Stack Técnica

- **Expo SDK 53** (Gerenciamento, build EAS)
- **React Native 0.79 / React 19**
- **TypeScript (strict)**
- **expo-router** (Navegação tabs + stacks)
- **NativeWind (Tailwind)** para estilos utilitários
- **SQLite (expo-sqlite)** com migrations versionadas
- **Zustand** para preferências, filtros e flags globais
- **react-native-svg & reanimated** para gráficos e animações
- **expo-local-authentication** (biometria)
- **expo-file-system / sharing / document-picker** para export/import

---

## 4. Começando (Setup & Execução)

Pré‑requisitos: Node LTS, npm ou bun, Expo CLI (opcional).

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento com Expo
npm start
# Abrir em dispositivo
# Pressione 'a' (Android) ou 'i' (iOS) no terminal Expo
```

Builds EAS (exemplo):

```bash
# Login EAS (se aplicável)
# eas login
# Profile de desenvolvimento
# eas build -p android --profile development
```

---

## 5. Scripts

| Script                            | Descrição                             |
| --------------------------------- | ------------------------------------- |
| `npm start`                       | Inicia servidor Metro com Expo Router |
| `npm run android` / `ios` / `web` | Alvos específicos                     |
| `npm test`                        | Executa testes (Vitest)               |

---

## 6. Estrutura de Pastas

```
app/                  # Rotas (expo-router)
  (tabs)/             # Tabs principais (home, budgets, settings etc.)
src/
  components/         # Componentes reutilizáveis e gráficos
  features/           # Screens / lógica por domínio
    accounts/
    budgets/
    categories/
    dashboard/
    recurrences/
    settings/
    transactions/
  lib/
    database/         # DAOs, migrations, seed
    store.ts          # Zustand store
    utils.ts          # Funções utilitárias
    biometric.ts      # Funções de autenticação biométrica
  types/              # Tipos globais (entidades)
```

Padrão **feature-first**: lógica coesa dentro de `features/<domínio>`.

---

## 7. Banco de Dados & Migrations

Modelo (SQLite): `settings`, `accounts`, `categories`, `transactions`, `budgets`, `goals` (placeholder), `recurrences`.

- Cada migration é idempotente e executada em ordem.
- DAOs encapsulam SQL cru e tratam agregações (ex: `BudgetDAO.getCurrentActiveBudgets()`).
- Transações de escrita sempre devem ser agrupadas em `db.transaction(...)`.

Índices recomendados (verificar se já criados):

- `transactions(occurred_at)`
- `transactions(category_id)`
- `transactions(account_id)`
- `budgets(category_id, period_key)`

---

## 8. Estado Global & Eventos

- **Zustand** para: tema, preferências, flags (biometricEnabled), filtros salvos.
- Event bus simples (`events.ts`) para invalidações (ex.: atualizar budgets pós transação).
- Filtros de transações serializáveis (incluir `version` para evolução futura).

---

## 9. Padrões de UI/UX (Manifesto Resumido)

- Ação principal por tela, destaque claro.
- Spacing baseado em múltiplos de 4 (4 / 8 / 12 / 16 / 24).
- Estados completos: loading (skeleton), vazio (mensagem + CTA), erro (retry), sucesso.
- Acessibilidade: alvo ≥44dp, contraste AA, labels descritivos.
- Dark mode sem flashes (background consistente).
- Animações ≤300ms, microinterações leves (nada intrusivo).
- Redução de fricção: campos com defaults inteligentes.

Checklist rápido antes de commit (resumo): loading? vazio? erro recuperável? ação primária clara? spacing consistente? dark mode ok? acessibilidade básica? sem logs verbosos? performance aceitável?

---

## 10. Componentes de Gráficos

Local: `src/components/charts`.
Implementados: `SvgTrendsChart`, `MonthlyTrendsChart`, `DonutCategoryChart`, `AreaChart` (parcial), `ProgressRing`, `Sparkline`, `HeatmapCalendar` (básico), infra `ChartTooltip`.

Pendências-chave (1.0):

- Tooltip reutilizável integrado a todos
- Animação sweep Donut + fill Area (clipPath)
- Skeleton loaders específicos
- Pan/Zoom temporal (Trends/Area)
- Exportar como imagem (view-shot) + share
- Drill‑down subcategorias no Donut
- Haptics consistente

---

## 11. Segurança & Biometria

- Flag `biometricEnabled` no store.
- Startup gate: se ativo, solicita autenticação via `expo-local-authentication`.
- Tratamento de fallback (erro ou sem hardware) mantém app acessível (fail-open) por enquanto.
- Próximo passo (futuro): criptografar payload de backup.

---

## 12. Acessibilidade

- Uso de textos sem depender só de ícones.
- Pretende-se adicionar: `accessibilityLabel` detalhado em chips de filtros, tooltips anunciados via live region.
- Verificar contraste especialmente em amarelos em dark (`amber` / `yellow`).

---

## 13. Performance

Práticas:

- Memoização de listas críticas (a expandir) e uso de NativeWind (estilos atômicos).
- Necessário ainda: memo de paths de gráficos, throttle de gestures, índices adicionais.
- Meta: evitar jank em listas >100 itens.

---

## 14. Testes

Framework: **Vitest** (já configurado).
Faltam specs iniciais:

- utils (formatCurrency, agregações)
- filtros (serialização / contagem)
- DAOs básicos (budget progress, materialização recorrências)
- tooltip positioning puro

Exemplo comando:

```bash
npm test
```

Sugestão estrutura futura: `src/__tests__/*.test.ts`.

---

## 15. Exportação & Backup

- Backup/Restore em JSON (validação mínima) via util em `lib/backup.ts`.
- Export CSV v2 inclui: tags, separador configurável (se aplicável), marcador de transfer, números localizados.
- Futuro: export em lote de gráficos (PNG) + zip consolidado.

---

## 16. Roadmap

Curto (1.0): tooltips completos, animações gráficos, skeletons, pan/zoom, export imagem, drill-down donut, testes mínimos, polish filtros e budgets badge.
Médio: Goals, Anexos (captura/preview + limpeza), Heatmap modos, Multi-idioma completo, cache budgets incremental, logger estruturado.
Longo: TreeMap, Waterfall, MultiLine, Forecast, AI para categorização, criptografia backup.

---

## 17. Contribuindo

1. Abra issue clara (feature / bug) com contexto e screenshots se UI.
2. Fork/branch naming: `feat/<slug>` ou `fix/<slug>`.
3. Siga manifesto UI/UX e checklist de PR.
4. Adicione testes para lógica pura alterada.
5. Atualize este README / documento de instruções se afetar roadmap.

PR Checklist (resumido): estados completos, acessibilidade mínima, dark mode, sem novos warnings TS/ESLint, transações DB corretas, performance ok, logs somente DEV.

---

## 18. Boas Práticas de Código

- TypeScript estrito (não usar `any` salvo ponte externa justificada).
- Estilos sempre via `className` (NativeWind).
- Evitar recalcular agregações intensas (usar caching/event invalidation).
- Funções puras em utils com testes onde possível.
- Separar camadas: UI (componentes) vs dados (DAO) vs estado (store) vs serviços (backup, biometric).

---

## 19. Troubleshooting

| Problema                     | Possível Causa               | Solução                                               |
| ---------------------------- | ---------------------------- | ----------------------------------------------------- |
| Migrations não aplicam       | Cache dev SQLite antigo      | Apagar app / limpar dados e reiniciar                 |
| Biometria não aparece        | Sem hardware ou não enrolado | Verificar `checkBiometricSupport()` no log            |
| Gráficos sem tooltip         | Integração pendente          | Implementar hook `useChartTooltip` no componente alvo |
| Lista sem espaçamento        | Falta de suporte `space-y`   | Usar margens individuais (`mb-*`)                     |
| Performance lenta em filtros | Falta índice                 | Criar índice SQL em colunas filtradas                 |

Logs: manter `console.log` apenas em DEV; usar `__DEV__ && console.log()`.

---

## 20. Licença

(Definir) – Caso não definido, considere adicionar uma licença (MIT recomendada para open-source). Crie `LICENSE` e ajuste este bloco.

---

## Anexo: Próximos Commits Sugeridos

- `feat(charts): integrate ChartTooltip into DonutCategoryChart`
- `feat(charts): skeleton loaders (bars, donut, area, heatmap)`
- `feat(charts): donut sweep + area fill animation`
- `feat(charts): pan zoom wrapper trends/area`
- `feat(charts): export chart image util`
- `feat(charts): donut drill-down subcategories`
- `test(dao): budget progress & recurrence materialization`

---

Dúvidas ou sugestões? Abra uma issue ou contribua diretamente.
