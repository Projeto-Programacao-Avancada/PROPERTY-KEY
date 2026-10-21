# Controle de Chaves (PROPERTY-KEY)

Sistema web para controlar as chaves de imóveis: quais chaves existem, quais estão disponíveis e quais estão em uso. Os dados ficam salvos no Supabase e o acesso é protegido por login.

Tecnologias: React, TypeScript, Vite e Supabase (PostgreSQL + Auth).

## Índice

1. [Funcionalidades](#funcionalidades)
2. [Requisitos](#requisitos)
3. [Passo a passo para rodar](#passo-a-passo-para-rodar)
4. [Como usar](#como-usar)
5. [Estrutura do projeto](#estrutura-do-projeto)
6. [Comandos](#comandos)
7. [Problemas comuns](#problemas-comuns)
8. [Segurança](#segurança)

## Funcionalidades

| Funcionalidade | Situação |
|---|---|
| Login com e-mail (ou telefone) e senha | Pronto |
| Manter a sessão ao recarregar a página | Pronto |
| Logout | Pronto |
| Cadastrar chave (código e descrição) | Pronto |
| Impedir códigos de chave repetidos | Pronto |
| Dashboard com total, disponíveis e retiradas | Pronto |
| Registrar retirada e devolução | Pendente |
| Gráfico de movimentações e histórico | Pendente |
| Cadastro de pessoas | Pendente (a tabela já existe) |

## Requisitos

- Node.js 20 ou mais novo (https://nodejs.org, versão LTS). Confira com `node -v`.
- Conta gratuita no Supabase (https://supabase.com).
- Terminal: PowerShell no Windows, Terminal no Mac/Linux.

## Passo a passo para rodar

### 1. Baixar o projeto

```bash
git clone <URL-DO-REPOSITORIO>
cd PROPERTY-KEY
```

Se baixou um `.zip`, extraia e abra o terminal na pasta que contém o `package.json`.

### 2. Instalar as dependências

```bash
npm install
```

### 3. Criar o projeto no Supabase

1. Acesse https://supabase.com/dashboard e clique em **New project**.
2. Escolha um nome, crie uma senha para o banco e guarde-a.
3. Clique em **Create new project** e aguarde ele ficar pronto.

### 4. Criar as tabelas

1. No Supabase, abra **SQL Editor** e clique em **New query**.
2. Copie todo o conteúdo de `supabase/schema.sql`, cole no editor e clique em **Run**.
3. Deve aparecer **Success**. Em **Table Editor** devem existir as tabelas `keys`, `people` e `key_movements`.

O script pode ser executado mais de uma vez sem apagar dados.

### 5. Criar seu usuário

1. Vá em **Authentication → Users → Add user → Create new user**.
2. Informe e-mail e senha.
3. Marque **Auto Confirm User**. Sem isso o login será recusado.
4. Clique em **Create user**.

### 6. Configurar o arquivo `.env`

Copie o modelo:

```bash
# Mac/Linux
cp .env.example .env
```

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env
```

Preencha com os dados do seu projeto:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_SUA_CHAVE_AQUI
```

Onde encontrar:

- **URL:** botão **Connect**, no topo do painel (Project URL).
- **Chave:** **Project Settings → API Keys**, chave **Publishable** (`sb_publishable_...`). A chave antiga **anon** (`eyJ...`) também funciona.

Regras:

- Os nomes devem começar com `VITE_`.
- Sem aspas e sem espaços ao redor do `=`.
- Salve o arquivo em UTF-8 sem BOM.

### 7. Iniciar

```bash
npm run dev
```

Abra o endereço mostrado no terminal (normalmente http://localhost:5173). Sempre que editar o `.env`, pare o servidor com `Ctrl + C` e rode o comando de novo.

## Como usar

1. Entre com o e-mail e a senha criados no passo 5.
2. Clique em **+ NOVA CHAVE** e preencha o código (ex.: `A01`) e a descrição (ex.: `Apto 201 – Bloco A`). O código é salvo em maiúsculas e não pode se repetir.
3. A chave aparece no dashboard como disponível. Recarregue a página para confirmar que ela continua salva.
4. Clique em **SAIR** para encerrar a sessão.

## Estrutura do projeto

```
PROPERTY-KEY/
├── src/
│   ├── App.tsx                 # Telas e lógica principal
│   ├── index.css               # Estilos
│   ├── main.tsx                # Ponto de entrada
│   ├── vite-env.d.ts           # Tipos das variáveis de ambiente
│   └── lib/
│       ├── supabase.ts         # Conexão com o Supabase
│       └── supabaseErrors.ts   # Tradução dos erros para português
├── supabase/
│   └── schema.sql              # Tabelas, políticas de segurança e permissões
├── public/                     # Ícones e arquivos estáticos
├── .env.example                # Modelo do .env (vai para o Git)
├── .env                        # Suas chaves reais (não vai para o Git)
└── package.json
```

Tabelas do banco:

| Tabela | Função |
|---|---|
| `keys` | Chaves: código, descrição e status (`available` ou `withdrawn`) |
| `people` | Pessoas que retiram chaves |
| `key_movements` | Histórico de retiradas e devoluções |

Todas têm Row Level Security (RLS): só usuários logados leem e gravam.

## Comandos

| Comando | Função |
|---|---|
| `npm install` | Instala as dependências |
| `npm run dev` | Inicia em modo de desenvolvimento |
| `npm run build` | Verifica os tipos e gera a versão final em `dist` |
| `npm run preview` | Abre a versão gerada pelo build |
| `npm run lint` | Procura problemas no código |

## Problemas comuns

Os erros técnicos aparecem no navegador em **F12 → Console**.

**"Supabase não configurado"**

1. Confirme que o arquivo se chama `.env` (e não `.env.txt`) e está ao lado do `package.json`. No PowerShell: `Get-ChildItem -Force .env*`.
2. Confirme que os nomes começam com `VITE_`.
3. Reinicie o servidor.
4. No Windows, se a URL aparecer como `undefined`, o arquivo provavelmente tem BOM. Recrie-o:

```powershell
$conteudo = "VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co`nVITE_SUPABASE_ANON_KEY=sua-chave`n"
[System.IO.File]::WriteAllText("$PWD\.env", $conteudo, (New-Object System.Text.UTF8Encoding($false)))
```

**`Failed to resolve import "@supabase/supabase-js"`**

```bash
npm install @supabase/supabase-js
```

**"E-mail/telefone ou senha incorretos"**

Confira as credenciais. Se o usuário foi criado sem Auto Confirm User, confirme-o em **Authentication → Users** ou crie outro.

**"Tabela não encontrada no banco"**

O `schema.sql` não foi executado. Refaça o passo 4.

**"Sem permissão no banco"**

Execute no SQL Editor:

```sql
alter table public.keys          enable row level security;
alter table public.people        enable row level security;
alter table public.key_movements enable row level security;

drop policy if exists "keys_authenticated_all" on public.keys;
create policy "keys_authenticated_all" on public.keys
  for all to authenticated using (true) with check (true);

drop policy if exists "people_authenticated_all" on public.people;
create policy "people_authenticated_all" on public.people
  for all to authenticated using (true) with check (true);

drop policy if exists "movements_authenticated_all" on public.key_movements;
create policy "movements_authenticated_all" on public.key_movements
  for all to authenticated using (true) with check (true);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.keys          to authenticated;
grant select, insert, update, delete on public.people        to authenticated;
grant select, insert, update, delete on public.key_movements to authenticated;
grant usage, select on all sequences in schema public to authenticated;

notify pgrst, 'reload schema';
```

Depois clique em **SAIR** e entre novamente.

**"Sem conexão com o Supabase"**

Confira a internet e se a `VITE_SUPABASE_URL` tem o formato `https://xxxx.supabase.co` (e não o link do painel).

**A página parece uma versão antiga**

Feche todos os terminais com `npm run dev`, abra apenas um, use o endereço que ele mostrar e atualize com `Ctrl + F5`.

**Erros depois de trocar de pasta ou versão**

```bash
# Mac/Linux
rm -rf node_modules package-lock.json
npm install
```

```powershell
# Windows (PowerShell)
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```