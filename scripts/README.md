# Scripts utilitários

Este diretório contém scripts auxiliares de desenvolvimento.

- `populate-fixed-expenses.ts`: exemplo para popular gastos fixos.
- `test-reports.ts`: testes rápidos de consultas de relatórios.
- `seed.ts`: executa o seed de dados básicos no banco local.

Como executar (requer `tsx` ou similar):

```bash
# Instale uma vez (dev)
npm i -D tsx

# Executar scripts
npx tsx scripts/populate-fixed-expenses.ts
npx tsx scripts/test-reports.ts
npx tsx scripts/seed.ts
```
