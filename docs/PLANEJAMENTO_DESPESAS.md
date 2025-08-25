# 📅 Planejamento de Despesas Futuras

Esta funcionalidade permite planejar e simular gastos futuros mês a mês, ajudando você a tomar decisões financeiras mais informadas.

## 🎯 Funcionalidades

### 1. **Visualização Mensal**

- **Projeções de 12 meses**: Veja como seus gastos vão impactar cada mês
- **Status por cores**:
  - 🟢 Verde: Orçamento saudável
  - 🟡 Amarelo: Atenção (menos de 10% da renda sobrou)
  - 🔴 Vermelho: Déficit (gastos > renda)

### 2. **Despesas Planejadas**

- **Parcelamentos**: Cadastre compras parceladas (ex: 12x de R$ 450)
- **Gastos recorrentes**: Planos, seguros, cursos
- **Controle de parcelas**: Acompanhe quantas parcelas restam

### 3. **Simulador de Compras**

- **"E se eu comprar?"**: Simule novas compras antes de decidir
- **Impacto visual**: Veja como a compra afeta cada mês futuro
- **Comparação**: Compare cenário atual vs. cenário com nova compra

### 4. **Integração com Sistema Atual**

- **Despesas fixas**: Considera seus gastos fixos já cadastrados
- **Renda estimada**: Use sua renda real ou configure uma estimativa
- **Histórico**: Usa média das despesas variáveis dos últimos meses

## 🚀 Como Usar

### Configurar Renda

1. Na tela de Planejamento, ajuste sua "Renda mensal estimada"
2. O sistema usará este valor para calcular o que sobra cada mês

### Adicionar Despesa Planejada

1. Toque em **"Adicionar Despesa"**
2. Preencha:
   - Nome (ex: "Notebook Dell")
   - Valor por parcela (ex: R$ 450)
   - Mês de início (ex: 2025-03)
   - Número de parcelas (ex: 12)
3. A despesa será distribuída automaticamente pelos meses

### Simular Nova Compra

1. Toque em **"Simular Compra"**
2. Preencha os dados da compra desejada
3. Veja o impacto nos próximos meses
4. Decida se cabe no seu orçamento

### Ver Detalhes do Mês

1. Toque em qualquer mês na lista
2. Veja todas as despesas planejadas daquele mês
3. Confirme se o orçamento está adequado

## 💡 Exemplos Práticos

### Exemplo 1: Fatura do Cartão

- **Situação**: Comprou um celular por R$ 1.200 em 10x
- **Cadastro**:
  - Nome: "iPhone 15 Pro"
  - Valor: R$ 120
  - Início: 2025-01
  - Parcelas: 10
- **Resultado**: Verá R$ 120 comprometidos de Jan a Out/2025

### Exemplo 2: Planejamento de Viagem

- **Situação**: Quer viajar em Julho e precisa guardar dinheiro
- **Simulação**:
  - Nome: "Viagem Europa"
  - Valor: R$ 800 (por mês)
  - Início: 2025-02
  - Parcelas: 6 (Feb a Jul)
- **Resultado**: Vê se consegue guardar R$ 800/mês sem comprometer orçamento

### Exemplo 3: Novo Carro

- **Situação**: Prestação de R$ 1.200 por 48 meses
- **Simulação**: Vê impacto nos próximos 12 meses
- **Decisão**: Se ficar no vermelho, considera renda extra ou carro mais barato

## 🎨 Interface

### Tela Principal

```
📅 Planejamento de Despesas
Renda mensal estimada: R$ 5.000

🟢 Janeiro 2025         +R$ 890
   Renda: R$ 5.000
   Fixas: -R$ 2.100
   Planejadas: -R$ 1.310
   Variáveis: -R$ 700

🟡 Fevereiro 2025       +R$ 120
   [...]

🔴 Março 2025          -R$ 340
   [...]
```

### Simulação Ativa

```
🔵 Simulação: iPhone 15 Pro    ❌

🟡 Janeiro 2025         +R$ 770  (era +R$ 890)
🔴 Fevereiro 2025       -R$ 0    (era +R$ 120)
🔴 Março 2025          -R$ 460   (era -R$ 340)
```

## 🔧 Configuração Técnica

### Banco de Dados

- **Tabela**: `planned_expenses`
- **Campos**: nome, valor, categoria, período, parcelas
- **Relações**: Integra com categorias existentes

### Algoritmo de Projeção

1. **Base mensal**: Renda estimada - despesas fixas - média de variáveis
2. **Despesas planejadas**: Soma parcelas do mês específico
3. **Status**: Calcula saldo restante e define cor

### Performance

- **Cache**: Projeções são calculadas sob demanda
- **Otimização**: Apenas 12 meses carregados por vez
- **Reatividade**: Atualiza automaticamente ao mudar dados

## 📱 Navegação

1. **Home** → Toque em **"Planejamento"**
2. Ou navegue diretamente: `/(tabs)/planning`

## 🤝 Integração

Esta funcionalidade integra com:

- ✅ **Despesas fixas** (já cadastradas)
- ✅ **Categorias** (reutiliza as existentes)
- ✅ **Histórico** (média das despesas variáveis)
- ✅ **Eventos** (atualiza quando dados mudam)

---

_Esta funcionalidade transforma o app em uma ferramenta de planejamento financeiro pessoal, indo além do simples controle de gastos para antecipação e tomada de decisões inteligentes._
