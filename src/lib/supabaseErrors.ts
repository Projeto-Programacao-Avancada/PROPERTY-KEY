type ErrorLike = {
  message?: string
  code?: string | null
  status?: number
}

/** Traduz erros do banco (PostgREST/Postgres) para mensagens claras. */
export function describeDbError(error: ErrorLike): string {
  const code = error.code ?? ''
  const message = error.message ?? ''

  if (code === '23505') {
    return 'Já existe uma chave com esse código.'
  }

  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    /schema cache|does not exist/i.test(message)
  ) {
    return 'Tabela não encontrada no banco. Execute o arquivo supabase/schema.sql no SQL Editor do Supabase.'
  }

  if (
    code === '42501' ||
    /row-level security|permission denied/i.test(message)
  ) {
    return 'Sem permissão no banco. Execute novamente o supabase/schema.sql (permissões e políticas) e entre de novo no sistema.'
  }

  if (
    code === 'PGRST301' ||
    code === 'PGRST303' ||
    /jwt|invalid api key|apikey/i.test(message)
  ) {
    return 'Sessão expirada ou chave inválida. Clique em SAIR, entre novamente e confira o .env.'
  }

  if (/failed to fetch|networkerror|network request failed/i.test(message)) {
    return 'Sem conexão com o Supabase. Confira sua internet e a VITE_SUPABASE_URL no .env.'
  }

  return `Erro inesperado: ${message || 'desconhecido'}${
    code ? ` (código ${code})` : ''
  }`
}

/** Traduz erros do Supabase Auth para mensagens claras. */
export function describeAuthError(error: ErrorLike): string {
  const code = error.code ?? ''
  const message = error.message ?? ''

  if (
    code === 'invalid_credentials' ||
    /invalid login credentials/i.test(message)
  ) {
    return 'E-mail/telefone ou senha incorretos.'
  }

  if (
    code === 'email_not_confirmed' ||
    /email not confirmed/i.test(message)
  ) {
    return 'E-mail ainda não confirmado. No Supabase, abra Authentication → Users e confirme o usuário.'
  }

  if (
    code === 'phone_not_confirmed' ||
    /phone not confirmed/i.test(message)
  ) {
    return 'Telefone ainda não confirmado no Supabase.'
  }

  if (
    code === 'phone_provider_disabled' ||
    /unsupported phone provider|phone.*disabled/i.test(message)
  ) {
    return 'Login por telefone não está ativado no Supabase. Use o e-mail.'
  }

  if (
    code === 'over_request_rate_limit' ||
    error.status === 429 ||
    /rate limit/i.test(message)
  ) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
  }

  if (/failed to fetch|networkerror|network request failed/i.test(message)) {
    return 'Sem conexão com o Supabase. Confira sua internet e a VITE_SUPABASE_URL no .env.'
  }

  return `Não foi possível entrar: ${message || 'erro desconhecido'}`
}
