# Tela de Histórico — frontend

Lista as retiradas e devoluções de chaves, com busca, filtros, indicadores,
ordenação e paginação de 8 registros. Os dados vêm de `GET /api/movements`.

## Duração real, demora e histórico por pessoa

- Cada movimentação traz `loan`: a retirada pareada com a devolução, com
  `duracao_real_minutos`, `em_posse_minutos`, `atraso_minutos` e `status`.
  Enquanto a chave está em posse, a tela recalcula o tempo decorrido a cada minuto.
- Os cartões **Duração média real** e **Média de demora** resumem o resultado
  filtrado (`summarizeMovements`). Posses em aberto ficam fora das médias e a demora
  só considera devoluções com previsão. A tela recalcula esses cartões no navegador
  para respeitar também a busca e o tipo; o `summary` de `/movements` serve a
  outros consumidores da API.
- O filtro **Pessoa** usa quem retirou a chave, mesmo que outra pessoa tenha devolvido.
- Clicar no nome de uma pessoa (Histórico, Chaves ou Dashboard) abre o
  `PersonHistoryDrawer`, que consome `GET /api/people/{id}/history`.

## Dados de exemplo

O botão **VER DADOS DE EXEMPLO** mostra registros fictícios, mantidos só na memória
da tela e gerados em datas relativas a "agora". O painel da pessoa também usa esses
dados nesse modo. Nada é gravado no banco, enviado à API ou salvo no navegador.

## Onde está cada parte

- `HistoryPage.tsx`: interface e estados da consulta.
- `PersonHistoryDrawer.tsx`: painel com as retiradas de uma pessoa.
- `LoanInfo.tsx`: duração e situação da posse (usadas na tabela e no painel).
- `types.ts`: contrato dos dados, formatação, cálculo de duração/atraso e médias.
- `filterMovements.ts`: busca, pessoa, período, tipo e ordenação.
- `historySource.ts`: ponto de acesso à API (histórico geral e por pessoa).
- `exampleMovements.ts`: dados fictícios da prévia.
- `history.css`: estilos da tela e do painel.
- `history.test.mjs`: testes de filtros, duração, atraso e médias.

## Validação

```powershell
npm.cmd run build
node --test src/features/history/history.test.mjs
npx.cmd --no-install eslint src/features/history
```

Os testes usam o suporte nativo a TypeScript do Node.js (22.18+ ou 24+).
