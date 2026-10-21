
"""Cria um usuário de acesso ao sistema.

Uso (dentro de backend/):
    python -m app.create_user --name "Admin" --email admin@exemplo.com
    python -m app.create_user --name "Admin" --phone 71999998888

A senha pode ser informada com --password ou digitada no terminal.
"""

import argparse
import getpass
import sys

from sqlalchemy import or_, select

from .database import SessionLocal
from .models import User
from .security import hash_password, normalize_phone


def main() -> None:
    parser = argparse.ArgumentParser(description="Criar usuário")

    parser.add_argument("--name", required=True)
    parser.add_argument("--email")
    parser.add_argument("--phone")
    parser.add_argument(
        "--password",
        help="Se omitido, será solicitada no terminal",
    )

    args = parser.parse_args()

    # Exige pelo menos um meio de identificação.
    if not args.email and not args.phone:
        sys.exit("Informe --email e/ou --phone.")

    # Normaliza os dados recebidos.
    name = args.name.strip()
    email = args.email.strip().lower() if args.email else None
    phone = normalize_phone(args.phone) if args.phone else None

    if not name:
        sys.exit("O nome não pode estar vazio.")

    if args.email and not email:
        sys.exit("Informe um e-mail válido.")

    if args.phone and not phone:
        sys.exit("Informe um telefone válido.")

    # Solicita a senha sem exibi-la no terminal.
    password = args.password

    if password is None:
        password = getpass.getpass("Senha: ")

    if len(password) < 8:
        sys.exit("A senha deve ter pelo menos 8 caracteres.")

    # Monta as condições apenas para os campos informados.
    conditions = []

    if email:
        conditions.append(User.email == email)

    if phone:
        conditions.append(User.phone == phone)

    # Consulta e criação dentro da mesma sessão.
    with SessionLocal() as db:
        exists = db.scalar(
            select(User.id).where(or_(*conditions))
        )

        if exists:
            sys.exit(
                "Já existe um usuário com esse e-mail ou telefone."
            )

        user = User(
            name=name,
            email=email,
            phone=phone,
            password_hash=hash_password(password),
        )

        db.add(user)
        db.commit()

    print("Usuário criado com sucesso.")


if __name__ == "__main__":
    main()
