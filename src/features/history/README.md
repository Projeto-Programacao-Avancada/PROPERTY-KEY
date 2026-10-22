# Tela de Histórico — frontend

Pessoal, deixei pronta a parte de frontend da tela de Histórico seguindo o
visual que o projeto já tinha. Abaixo expliquei o que fiz e onde vocês
podem conectar os dados quando a parte de backend estiver pronta.

## O que está pronto

Liguei a tela ao botão **HISTÓRICO** e deixei os estilos separados dos das
outras telas. Implementei busca sem distinguir acentos e maiúsculas,
filtros por tipo e datas, indicadores, ordenação e paginação de 8 registros.
Os indicadores resumem o resultado filtrado; retiradas são eventos do
histórico, não o total de chaves em uso naquele momento.

Também deixei o botão **VER DADOS DE EXEMPLO** para vocês testarem o layout
e os filtros. Esses dados são fictícios e ficam apenas na memória da tela:
não são gravados no banco, enviados a serviços ou salvos no navegador.
O botão **VOLTAR AO HISTÓRICO** sai dessa prévia.

## O que ainda depende do backend

**Fiz somente o frontend; não implementei a API de histórico.** Por enquanto,
a tela não faz requisições de histórico. Deixei a função `loadHistory()`
em `historySource.ts` como ponto de integração:

```ts
export function loadHistory(): Promise<HistoryMovement[] | null> {
  return Promise.resolve(null)
}
```

- `null`: integração pendente; mostra “Histórico ainda não disponível”.
- `[]`: consulta concluída, sem movimentações registradas.
- Uma lista: exibe os registros reais, com filtros e paginação.
- Rejeição da Promise: mostra erro e botão para tentar novamente.

Para integrar, deixei este caminho para quem ficar com essa parte:

1. Conferir o modelo `KeyMovement` e o SQL de `key_movements`, que já
   existiam no projeto. A definição no arquivo SQL não confirma que a
   tabela já foi criada no banco que vocês vão usar.
2. Implementar a consulta no backend, com autenticação, retornando as
   movimentações junto dos dados de chave, pessoa e usuário que registrou.
   O formato que a tela espera está no exemplo abaixo e em `types.ts`.
3. Adicionar a função de consulta no cliente de `src/lib/api.ts` e chamá-la
   em `loadHistory()`, substituindo `Promise.resolve(null)`. Usar o mesmo
   tratamento de sessão e a configuração `VITE_API_URL` já existentes.
4. Conferir a tela com registros reais, lista vazia e falha de conexão.
   Testar também busca, datas, tipos, ordenação e mudança de página.

Não é necessário refazer os filtros ou a tabela para essa integração.
A conexão com o banco deve ficar no backend.

Pensei em `GET /api/movements` como possível rota, mas **é só uma sugestão,
não uma API já criada**. Podemos combinar o endereço definitivo com quem
implementar o backend.

## Contrato proposto para os registros

Deixei o tipo `HistoryMovement` em `types.ts`. Preparei a tela para receber
uma lista JSON completa, pois a paginação acontece no frontend:

```json
[
  {
    "id": 1,
    "key_id": 1,
    "person_id": 2,
    "type": "withdrawal",
    "notes": "Visita ao imóvel.",
    "created_at": "2026-10-22T10:15:00-03:00",
    "created_by": 3,
    "key": { "code": "A01", "description": "Apto 101 — Bloco A" },
    "person": { "name": "Mariana Costa" },
    "operator": { "name": "Ana Ferreira" }
  }
]
```

Os IDs seguem o modelo `KeyMovement` e a definição SQL de `key_movements`,
que **já existiam no projeto original**. `key`, `person` e `operator` são
dados relacionados que a API deverá resolver ou adaptar. `person`,
`operator`, `person_id`, `created_by` e `notes` podem ser `null`.
`type` aceita `withdrawal` e `return`. `created_at` deve conter uma data ISO
válida com fuso horário. Exibição e filtros usam o fuso local do navegador.

## Onde deixei cada parte

- `HistoryPage.tsx`: interface e estados da consulta.
- `history.css`: estilos limitados à tela de Histórico.
- `filterMovements.ts`: busca, período, tipo e ordenação.
- `historySource.ts`: ponto para integrar a API posteriormente.
- `types.ts`: contrato dos dados.
- `exampleMovements.ts`: dados fictícios da prévia opcional.
- `history.test.mjs`: testes dos filtros e da integração pendente.
- `src/App.tsx`: somente importação da tela e navegação Dashboard/Histórico.

Mantive o backend, o SQL, o cliente de API existente, o login, as
dependências e o conteúdo das outras telas como estavam. No `App.tsx`,
adicionei apenas o necessário para navegar entre Dashboard e Histórico.
Removi o banco SQLite, o usuário e a configuração local usados para testar
o acesso. Esses arquivos não fazem parte da entrega. Para entrar no
sistema completo, precisamos usar a configuração e o login do grupo.

## Validação

Validei a compilação, os seis testes e a checagem de código do Histórico.
Para vocês repetirem, basta executar na raiz, com as dependências instaladas:

```powershell
npm.cmd run build
node --test src/features/history/history.test.mjs
npx.cmd --no-install eslint src/features/history
```

Os testes usam o suporte nativo a TypeScript do Node.js (22.18+ ou 24+).
A checagem geral `npm.cmd run lint` ainda aponta um erro que já existia no
login (`react-hooks/set-state-in-effect`, em `src/App.tsx`). Mantive esse
trecho intacto para limitar minha entrega à tela de Histórico.
