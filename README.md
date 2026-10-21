# PROPERTY-KEY

Sistema web para gerenciamento de chaves e cadastros. O projeto possui
um frontend em React, Vite e TypeScript e um backend em Python com
FastAPI.

> **Importante:** os nomes das variáveis de ambiente e a configuração do
> banco dependem dos arquivos de configuração presentes neste
> repositório. Não publique senhas, tokens ou arquivos `.env` no GitHub.

## Índice

-   [Tecnologias](#tecnologias)
-   [Pré-requisitos](#pré-requisitos)
-   [1. Baixar o projeto](#1-baixar-o-projeto)
-   [2. Configurar o banco de dados](#2-configurar-o-banco-de-dados)
-   [3. Configurar o backend](#3-configurar-o-backend)
-   [4. Criar um usuário](#4-criar-um-usuário)
-   [5. Configurar e iniciar o
    frontend](#5-configurar-e-iniciar-o-frontend)
-   [6. Testar a aplicação](#6-testar-a-aplicação)

## Tecnologias

-   **Frontend:** React, Vite e TypeScript.
-   **Backend:** Python e FastAPI.
-   **Banco de dados:** SQLAlchemy; o tipo de banco e as credenciais são
    definidos na configuração do backend.

## Pré-requisitos

Instale e configure:

1.  **Git:** https://git-scm.com/
2.  **Node.js LTS (inclui npm):** https://nodejs.org/
3.  **Python:** https://www.python.org/downloads/
4.  O servidor do banco de dados utilizado pela configuração do backend.

No Windows, marque a opção para adicionar o Python ao `PATH` durante a
instalação, se ela estiver disponível.

Verifique as instalações no PowerShell:

``` powershell
git --version
node --version
npm --version
python --version
```

Se `python` não funcionar, tente:

``` powershell
py --version
```

## 1. Baixar o projeto

Abra o PowerShell ou o terminal do VS Code e entre na pasta em que
deseja guardar o projeto.

Se ainda não tiver o repositório no computador:

``` powershell
git clone URL_DO_REPOSITORIO
cd PROPERTY-KEY
```

Substitua `URL_DO_REPOSITORIO` pelo endereço HTTPS ou SSH do seu
repositório GitHub.

Se o projeto já estiver no computador, entre na pasta existente.
Exemplo:

``` powershell
cd "C:\Users\The Dean\PROPERTY-KEY"
```

Confira a estrutura:

``` powershell
git status
```

A pasta principal deve conter o `package.json` e a pasta `backend`.

## 2. Configurar o banco de dados

O backend usa SQLAlchemy para acessar o banco. Antes de iniciar a API:

1.  Instale e inicie o servidor do banco de dados configurado no
    projeto.
2.  Crie o banco de dados, caso ele ainda não exista.
3.  Configure as credenciais e a URL de conexão exigidas pelo backend.
4.  Confira os arquivos `backend/app/database.py`,
    `backend/app/models.py` e o arquivo de exemplo de ambiente, se
    existir.

Se a configuração atual usar MySQL e o banco se chamar `property_key`,
você pode abrir o cliente MySQL com:

``` powershell
mysql -u root -p
```

Dentro do cliente MySQL, crie o banco somente se ele ainda não existir:

``` sql
CREATE DATABASE IF NOT EXISTS property_key;
EXIT;
```

**Atenção:** o nome do banco, o usuário, a senha e o formato da URL de
conexão devem corresponder à configuração real do projeto. Não cole
senhas reais neste README.

Se o projeto tiver um arquivo `.env.example`, use-o como referência. Não
presuma nomes de variáveis: confira quais são lidas pelo código do
backend.

## 3. Configurar o backend

Abra um **primeiro terminal** na raiz do projeto e entre na pasta
`backend`:

``` powershell
cd backend
```

Crie o ambiente virtual:

``` powershell
py -m venv .venv
```

Se o comando `py` não estiver disponível, use:

``` powershell
python -m venv .venv
```

Ative o ambiente virtual no PowerShell:

``` powershell
.\.venv\Scripts\Activate.ps1
```

Se o PowerShell bloquear a ativação por política de execução, você pode
liberar scripts locais para o seu usuário com:

``` powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Confirme a alteração se solicitado e tente ativar novamente. Outra
alternativa é usar o Prompt de Comando (CMD):

``` bat
.venv\Scripts\activate.bat
```

Instale as dependências Python:

``` powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Configure as variáveis de ambiente necessárias, conforme os arquivos de
configuração do backend. Se houver um `backend/.env.example`, crie uma
cópia local chamada `backend/.env` e preencha os valores exigidos. O
`.env` não deve ser enviado ao GitHub.

Inicie a API:

``` powershell
uvicorn app.main:app --reload
```

Se o comando `uvicorn` não for encontrado, tente:

``` powershell
python -m uvicorn app.main:app --reload
```

Por padrão, a API deverá ficar disponível em:

-   API: http://127.0.0.1:8000
-   Documentação interativa: http://127.0.0.1:8000/docs

Mantenha esse terminal aberto enquanto estiver usando o sistema.

> Se o projeto não tiver `backend/app/main.py`, confira o arquivo
> principal da API e ajuste o comando do Uvicorn para o módulo correto.

## 4. Criar um usuário

Com as dependências instaladas e a configuração do banco concluída, abra
um **segundo terminal**. Entre na pasta `backend` e ative o ambiente
virtual, se necessário:

``` powershell
cd "C:\Users\The Dean\PROPERTY-KEY\backend"
.\.venv\Scripts\Activate.ps1
```

Crie um usuário informando e-mail:

``` powershell
python -m app.create_user --name "Admin" --email admin@exemplo.com
```

O terminal solicitará a senha. Use uma senha com pelo menos 8
caracteres.

Também é possível cadastrar por telefone:

``` powershell
python -m app.create_user --name "Admin" --phone 71999998888
```

Ou informar e-mail e telefone juntos:

``` powershell
python -m app.create_user --name "Admin" --email admin@exemplo.com --phone 71999998888
```

O script também aceita `--password`, mas evite essa opção em ambientes
compartilhados, pois a senha pode ficar registrada no histórico do
terminal.

## 5. Configurar e iniciar o frontend

Abra um **terceiro terminal** na raiz do projeto, onde está o
`package.json`:

``` powershell
cd "C:\Users\The Dean\PROPERTY-KEY"
```

Instale as dependências:

``` powershell
npm.cmd install
```

> No PowerShell do Windows, `npm.cmd` pode evitar o erro de política de
> execução que ocorre ao executar `npm.ps1`.

Confira se o frontend tem um arquivo `.env.example`. Se tiver, copie-o
para `.env` e preencha as variáveis necessárias. A URL do backend deve
corresponder ao endereço em que a API está rodando. Confira no código
qual variável o frontend utiliza para essa URL; não invente nomes de
variáveis.

Inicie o Vite:

``` powershell
npm.cmd run dev
```

Abra no navegador o endereço mostrado no terminal. Normalmente é:

http://localhost:5173/

Mantenha esse terminal aberto enquanto estiver usando o frontend.

## 6. Testar

Com o backend e o frontend em execução:

1.  Abra o frontend no navegador.
2.  Acesse a documentação da API em http://127.0.0.1:8000/docs.
3.  Teste as rotas disponíveis na documentação.
4.  Tente entrar com um usuário cadastrado no banco.
5.  Teste os cadastros e operações de gerenciamento de chaves
    disponíveis na interface.
6.  Se uma operação falhar, verifique o terminal do frontend e o
    terminal do backend.

O frontend e o backend precisam estar executando ao mesmo tempo. Se
fechar um dos terminais, o serviço correspondente será interrompido.