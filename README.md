# Controle de Chaves (PROPERTY-KEY)

Sistema web para controlar as chaves de imóveis: quais chaves existem, quais estão disponíveis e quais estão em uso. O acesso é protegido por login.

Tecnologias: React, TypeScript e Vite (front) · FastAPI e SQLAlchemy (back) · MySQL 8 (banco).

## Funcionalidades

| Funcionalidade | Situação |
|---|---|
| Login com e-mail (ou telefone) e senha (JWT) | Pronto |
| Manter a sessão ao recarregar a página | Pronto |
| Logout | Pronto |
| Cadastrar chave (código e descrição) | Pronto |
| Impedir códigos de chave repetidos | Pronto |
| Dashboard com total, disponíveis e retiradas | Pronto |
| API de pessoas (listar e cadastrar) | Pronto (sem tela ainda) |
| Registrar retirada e devolução | Pendente (a tabela já existe) |
| Gráfico de movimentações e histórico | Pendente |

## Requisitos

- Node.js 20+ (https://nodejs.org)
- Python 3.11+
- MySQL 8+ (o schema usa `CHECK`, que só é aplicado a partir do 8.0.16)

## Passo a passo

### 1. Criar o banco

```bash
mysql -u root -p < mysql/schema.sql
```

Isso cria o banco `property_key` e as tabelas `users`, `keys`, `people` e `key_movements`. Pode ser executado mais de uma vez sem apagar dados.

Crie um usuário do MySQL só para a aplicação:

```sql
CREATE USER 'pkm_user'@'localhost' IDENTIFIED BY 'SUA_SENHA';
GRANT SELECT, INSERT, UPDATE, DELETE ON property_key.* TO 'pkm_user'@'localhost';
```

### 2. Configurar e iniciar o backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # Windows: Copy-Item .env.example .env
```

Edite `backend/.env`:

- `DATABASE_URL`: use o usuário e a senha criados acima.
- `SECRET_KEY`: gere com `python -c "import secrets; print(secrets.token_urlsafe(48))"`.

Crie seu usuário de login:

```bash
python -m app.create_user --name "Seu Nome" --email voce@exemplo.com
```

Inicie a API:

```bash
uvicorn app.main:app --reload --port 8000
```

A documentação interativa fica em http://localhost:8000/docs.

### 3. Iniciar o front

Em outro terminal, na raiz do projeto:

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Em desenvolvimento, o Vite encaminha `/api` para `http://localhost:8000`, então não precisa configurar nada no front. Em produção, defina `VITE_API_URL` (veja `.env.example`) e adicione o endereço do site em `CORS_ORIGINS` no `backend/.env`.

## API

Todas as rotas ficam sob `/api`. Exceto `login` e `health`, exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Função |
|---|---|---|
| POST | `/api/auth/login` | Entra com `identifier` (e-mail ou telefone) e `password` |
| GET | `/api/auth/me` | Dados do usuário logado |
| GET | `/api/keys` | Lista as chaves |
| POST | `/api/keys` | Cadastra chave (`code`, `description`); 409 se o código já existe |
| GET | `/api/people` | Lista pessoas |
| POST | `/api/people` | Cadastra pessoa |
| GET | `/api/health` | Verifica se a API está no ar |

## Estrutura do projeto

```
PROPERTY-KEY/
├── src/                     # Front React
│   ├── App.tsx              # Telas e lógica principal
│   └── lib/api.ts           # Cliente da API (token, requisições, erros)
├── backend/
│   ├── app/
│   │   ├── main.py          # Aplicação FastAPI, CORS e tratamento de erros
│   │   ├── config.py        # Variáveis de ambiente
│   │   ├── database.py      # Conexão SQLAlchemy com o MySQL
│   │   ├── models.py        # Tabelas
│   │   ├── schemas.py       # Validação de entrada/saída
│   │   ├── security.py      # Senha (bcrypt) e JWT
│   │   ├── deps.py          # Usuário autenticado
│   │   ├── create_user.py   # Script para criar usuários
│   │   └── routers/         # auth, keys, people
│   ├── requirements.txt
│   └── .env.example
└── mysql/schema.sql         # Criação do banco e tabelas
```

## Problemas comuns

**"Sem conexão com o servidor"**: o backend não está rodando na porta 8000, ou a `VITE_API_URL` está errada.

**"Não foi possível conectar ao MySQL"**: confira o `DATABASE_URL` e se o MySQL está ligado.

**"Tabela não encontrada no banco"**: execute `mysql/schema.sql` (passo 1).

**"E-mail/telefone ou senha incorretos"**: confirme as credenciais ou crie o usuário com `python -m app.create_user`. Telefones sem DDI são salvos com `+55`.

**Erro de validação do `SECRET_KEY`**: ele precisa ter pelo menos 32 caracteres.

**Erro de CORS ao usar `VITE_API_URL`**: adicione a origem do front em `CORS_ORIGINS` (separe várias por vírgula) e reinicie o backend.
