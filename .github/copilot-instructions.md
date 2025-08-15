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
7. 🔶 **Transações recorrentes** (CRUD completo + materialização; extras avançados parcialmente postergados)
8. ✅ **Backup & Restore (export/import JSON + validação)**
9. ✅ **Dashboard** (toggle 6/12m, linha tendência, YTD vs ano anterior, melhor/pior mês)
10. ✅ **Alertas de orçamento consolidados (painel unificado)**
11. ✅ **Exportação CSV v2** (tags + separador + marcador transfer + formatação regional números)
12. ✅ **Filtros avançados Fase 2** (presets modal, resumo compacto com truncamento, AND/ALL tags, incluir/excluir transfers, acessibilidade, testes util)
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
<!-- Versão condensada: somente pendências e melhorias futuras (Atualizado: Agosto 2025) -->

# AppFinança – Pendências & Roadmap Focado

Mantemos aqui SOMENTE o que falta para 1.0 e melhorias pós 1.0 diretamente acionáveis.

Legenda: ❌ Pendente | 🔶 Em andamento | 🟡 Opcional (pós 1.0)

## 1. Pendência Crítica Única para 1.0

❌ Gráficos Bonitos & Visualizações Avançadas (modernização final + interações)

Tudo mais core de 1.0 já entregue (CRUDs, filtros avançados, dashboard YTD, export, recorrências, backup, alertas orçamento).

## 2. Escopo Detalhado - Gráficos & Visualizações (Restante)

### 🔶 Já iniciado (precisa finalizar/polir)

- DonutCategoryChart: adicionar sweep animation de arco, tooltip acessível por screen reader, opção ordenar por percentual/valor.
- SvgTrendsChart: tooltips por ponto/barra + haptics no tap longo, linha de média móvel suavizada (Bezier).
- MonthlyTrendsChart (SVG): hover/tap highlight (estado visual) + exibir valores agregados on-demand.
- AreaChart: adicionar animação de preenchimento (fade + clipPath), sobreposição de saldo como linha.

### ❌ A Implementar (Core Restante)

- ChartTooltip reutilizável (portal overlay) com foco e acessibilidade.
- ChartSkeletons específicos (barras, donut, area, heatmap, progress ring).
- Gesture handling (pan/zoom) em gráficos temporais (SvgTrendsChart / AreaChart).
- Drill-down categorias: Donut → ao tocar segmento “Outras” abrir modal com subcategorias.
- Exportar gráfico como imagem (react-native-view-shot) + share.
- Haptics consistente (tap seleção / long-press) para todos os gráficos interativos.
- Performance pass: memoização de paths + useDerivedValue em animações.

### 🟡 Pós 1.0 (Avançado)

- TreeMap (categorias hierárquicas).
- WaterfallChart (fluxo caixa).
- MultiLine / MultiMetric (receita, despesa, saldo, média móvel).
- HeatmapCalendar: tooltips por dia + seletor de modo (despesa / receita / net / abs).
- Scatter (valor x hora do dia) para detectar padrões.
- Export batch (zip com PNGs + CSV consolidado).

## 3. Novas Melhorias Adicionadas (Solicitadas Agora)

1. Tooltips interativos (tap/press) nas barras e pontos (SVG overlay + estado)
2. Skeleton loaders específicos (ex: barras cinzas; grid placeholder heatmap)
3. Gestos (pan/zoom) nos gráficos de tendência (limitar escala + inércia suave)
4. Exportar gráfico como imagem (react-native-view-shot) – após polish base

## 4. Ordem de Execução Recomendada (Curto Prazo)

1. Infra Tooltip + Skeletons (destrava consistência visual)
2. Tooltips em: SvgTrendsChart → MonthlyTrendsChart → Donut → AreaChart
3. Animações finais (sweep donut, fill area, stagger refinado com Reanimated)
4. Gestos pan/zoom (Trends/Area) + limites performance (throttle repaint)
5. Export como imagem + share
6. Drill-down categorias (modal) + haptics unificado

## 5. Estrutura de Componentes (Alvo)

src/components/charts/
├── AreaChart.tsx (animação clipPath pendente)  
├── DonutCategoryChart.tsx (sweep + tooltip acessível pendente)  
├── SvgTrendsChart.tsx (tooltips + pan/zoom pendente)  
├── MonthlyTrendsChart.tsx (tooltips + highlight)  
├── ProgressRing.tsx (ok – adicionar estado exceeded)  
├── Sparkline.tsx (ok – tooltip opcional)  
├── HeatmapCalendar.tsx (tooltip + modos)  
└── common/ (a criar)  
 ├── ChartTooltip.tsx  
 ├── ChartSkeleton.tsx  
 └── PanZoomGestureWrapper.tsx

## 6. Requisitos Técnicos para Implementação de Tooltips

- Overlay absoluto fora do SVG (evitar clipping) usando portal/provider.
- Cálculo de posição segura (ajuste para bordas; fallback central se overflow > 80%).
- Anunciar via accessibilityLiveRegion (mensagem: "Receitas Mai/24: R$ 1.234,00").
- Timeout opcional para esconder (4s) ao usar tap rápido.
- Reutilizável: aceitar { title, lines[], accentColor }.

## 7. Skeletons Específicos (Spec)

- Bars: linhas horizontais claras com pulsar leve (opacity loop 0.6↔1 em 1.2s).
- Donut: círculo base + anel cinza + bloco central.
- Area: gradiente placeholder + linha tracejada.
- Heatmap: grid retângulos cinza claros (3 tons variando).

## 8. Gestos Pan/Zoom (MVP)

- Pinch para zoom no eixo X (escala máx 4x, min 1x).
- Pan horizontal limitado às extremidades (clamp start/end).
- Estratégia: manter série completa em memória; exibir janela [offset, offset+visibleCount].
- Debounce 16ms atualização de tooltip durante pan para performance.

## 9. Export Como Imagem

- Dependência: react-native-view-shot.
- API util: exportChart(ref, { format: 'png', quality: 0.95 }).
- UI: botão share em header de cada card (ícone share-external) → aciona share nativo.
- Anotar metadata (título + período) em rodapé opcional (overlay antes do capture?).

## 10. Drill-down Categorias (Donut)

- Segmento "Outras" ou qualquer segmento → abre modal lista ordenada de subcategorias.
- Filtro persistente para retornar ao donut com foco (highlight) no segmento origem.

## 11. Checklist de PR (Resumo Mantido)

1. Estados: loading / vazio / erro / sucesso presentes.
2. Acessibilidade: labels, contraste, área toque ≥44dp.
3. Animações ≤300ms, sem jank (use Reanimated quando possível).
4. Sem novos warnings TS / ESLint.
5. Operações de escrita em transaction.
6. Re-render charts: memo + keys estáveis.
7. Tooltip testado em telas pequenas e dark mode.
8. Eventos emitidos para invalidação (quando aplicável).
9. Documentar se adicionar dependência (view-shot, gesture libs etc.).
10. Atualizar esta lista se escopo mudar.

## 12. Próximos Commits Esperados

- feat(charts): ChartTooltip + integração Trends
- feat(charts): Skeletons específicos
- feat(charts): Donut sweep animation + accessible tooltip
- feat(charts): PanZoomWrapper + aplicação Trends/Area
- feat(charts): export util + botão share
- feat(charts): drill-down categorias

## 13. Observações Rápidas de Design

- Paleta atual (ver código) já expandida – manter consistência gradientes.
- Evitar vibrate/haptics em eventos contínuos (pan); aplicar apenas em seleção final.
- Manter layout shift zero: reservar altura dos gráficos mesmo em loading.

Fim – Documento Focado.

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

- Cache de orçamentos fase 2 (invalidação seletiva) – em andamento (já invalida budgets afetados por transações de despesa)
- Export CSV v2 (formatação números pendente)
- Dashboard: evolução (exibir graficamente linha de tendência e comparativos 6m vs 6m anterior)

### ❌ PENDENTE (Passo 5-9)

- Alertas de orçamento consolidados
- Filtros avançados fase 2
- Invalidação seletiva cache budgets
- Dashboard: comparativos extras / linha de tendência visual
- (Opcional) Goals
- (Opcional) Anexos

## FOCO RESTANTE PARA 1.0 (Snapshot Objetivo)

Essenciais a concluir antes do corte 1.0 (ordem sugerida):

1. Filtros Avançados Fase 2 – Finalização

- [ ] Polir chips (consistência cores + truncamento seguro)
- [ ] Acessibility labels (VoiceOver/TalkBack) descrevendo resumo
- [ ] Teste unitário: função de contagem de filtros ativos / serialização
- [ ] Extração opcional de `PresetsModal` em componente reutilizável (melhora organização)
- [ ] Garantir restauração fiel de lastUsedFilters ao abrir app

2. Dashboard – Comparativos & Linha de Tendência Visual

- [ ] Desenhar linha de tendência sobre o gráfico (já temos cálculo; só render overlay consistente)
- [ ] Comparativo YTD atual vs YTD anterior (receitas, despesas, saldo)
- [ ] Identificar melhor e pior mês últimos 12m (exibir highlight)
- [ ] Média móvel 3m opcional (se simples) ou deixar para pós

3. Recorrências (decisão de escopo mínimo para 1.0)

- (Atualmente CRUD + materialização ok) Pendentes se quiser fechar 100%: seleção refinada de contas/categorias via selectors completos, suporte a transferências recorrentes, pausa/retomar granular? (Definir se entra)
- Se não for obrigatório -> mover restante para pós 1.0.

Classificar agora: Se recortes adicionais de recorrências não são críticos, remover da lista essencial.

Quase concluído / Polimento: 4. Budget Dashboard/Alerts – Painel unificado já presente. Considerar:

- [ ] Badge global (tabs) com número de alertas (acessibilidade)
- [ ] Limitar contagem >99 → "99+" (opcional)

Opcional antes ou depois (não bloqueia 1.0): 5. Otimização adicional cache budgets (map categoria→budgets ativos) 6. Metas (Goals) 7. Anexos (MVP)

## PRIORIDADES IMEDIATAS (Atualizadas - GRÁFICOS BONITOS)

### 🎯 FASE 1: Melhorar Componentes Existentes

1. **DonutCategoryChart** - Adicionar tooltip central com valor, animações de entrada, gradientes
2. **SvgTrendsChart** - Linha suave, gradientes em barras, animações de crescimento
3. **MonthlyTrendsChart** - Transição para SVG, efeitos visuais modernos

### 🎯 FASE 2: Novos Componentes Visuais

1. **AreaChart** - Receitas vs despesas com preenchimento gradiente
2. **ProgressRing** - Para alertas de orçamento com animação circular
3. **Sparkline** - Mini gráficos nos cards de contas
4. **HeatmapCalendar** - Atividade financeira diária

### 🎯 FASE 3: Suite Completa de Relatórios

1. **TreeMap** - Visualização hierárquica de categorias
2. **WaterfallChart** - Fluxo de entrada/saída de caixa
3. **MultiLineChart** - Comparativos temporais múltiplas métricas
4. **InteractiveBarChart** - Drill-down nas categorias

### 🎯 FASE 4: Animações & Micro-interações

1. **react-native-reanimated** - Transições suaves
2. **Skeleton loaders** - Estados de carregamento elegantes
3. **Gesture handling** - Pan, zoom, tap nos gráficos
4. **Haptic feedback** - Feedback tátil nas interações

✅ Concluído recentemente: Painel consolidado de alertas de orçamento, Presets modal agrupado, fallback rename filtros cross-platform, Export CSV v2 completo, invalidação seletiva expandida (edição data/categoria), Recorrências CRUD + materialização, Backup & Restore JSON

## CHECKLIST DE SAÍDA 1.0 (Go/No-Go)

Use antes do corte para produção TestFlight/internal:

1. ✅ Nenhum crash fluxos principais (transações, orçamento, export CSV) – monitorar QA final
2. ✅ Filtros avançados: aplicar / limpar / salvar / renomear OK multiplataforma
3. ✅ Dashboard: barras + linha tendência + YTD + melhor/pior mês exibidos
4. ✅ Alertas orçamento: painel consolidado navegável
5. ✅ Performance aceitável (scroll 60fps em device médio) – validado e sem jank perceptível em lista principal
6. ✅ Cache budgets seletivo confirmando invalidação
7. ✅ Dark mode sem flashes brancos em modais (wrapper + splash bg ajustados)
8. ✅ Acessibilidade básica validada (badges, filtros, ícones, contraste) – sweep inicial ok
9. ✅ Sem novos warnings TS / logs verbosos (console.log limitado a **DEV**)
10. ✅ Backup & Restore validado (integridade pós-restore)

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

Sequência após concluir acima: Invalidação seletiva → Alertas de orçamento → Filtros Avançados Fase 2 → Export CSV formatação → Linha tendência visual → (Pós 1.0) Goals / Anexos.

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

Curto prazo (1-2 sprints): Polimento 1.0 (acessibilidade final, revisão dark mode, badge acessível alertas), decisão sobre extras de recorrências (transfer/pause granular) ou mover pós-1.0, média móvel 3m opcional no dashboard, otimização seletiva adicional do cache de orçamentos.  
Médio prazo (3-4 sprints): Goals (metas) + integração dashboard, Anexos (captura/preview + limpeza órfãos), Multi-idioma completo, logger estruturado + métricas de performance.  
Longo prazo: Automação / regras inteligentes, previsão (forecast) avançada, criptografia de backup, analytics aprofundados (drilldown/heatmap e projeções), AI assistida para categorização, melhorias contínuas de UX.

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
