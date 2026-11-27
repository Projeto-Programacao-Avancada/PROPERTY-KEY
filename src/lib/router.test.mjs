import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ROUTE_PATHS,
  isKnownPath,
  normalizePathname,
  pageToPath,
  resolvePage,
} from './router.ts'

test('normaliza barras finais, espaços e maiúsculas no pathname', () => {
  assert.equal(normalizePathname('/'), '/')
  assert.equal(normalizePathname(''), '/')
  assert.equal(normalizePathname('/Galeria///'), '/galeria')
  assert.equal(normalizePathname('  /CHAVES/ '), '/chaves')
})

test('resolve todas as rotas em português e aliases em inglês', () => {
  assert.equal(resolvePage('/'), 'dashboard')
  assert.equal(resolvePage('/dashboard'), 'dashboard')
  assert.equal(resolvePage('/historico'), 'history')
  assert.equal(resolvePage('/history'), 'history')
  assert.equal(resolvePage('/chaves'), 'keys')
  assert.equal(resolvePage('/keys'), 'keys')
  assert.equal(resolvePage('/galeria'), 'gallery')
  assert.equal(resolvePage('/gallery'), 'gallery')
  assert.equal(resolvePage('/ia'), 'ai')
  assert.equal(resolvePage('/ai'), 'ai')
})

test('rotas desconhecidas caem para dashboard e são identificadas por isKnownPath', () => {
  assert.equal(isKnownPath('/galeria'), true)
  assert.equal(isKnownPath('/desconhecida'), false)
  assert.equal(resolvePage('/desconhecida'), 'dashboard')
})

test('pageToPath mantém ida e volta consistente com resolvePage', () => {
  for (const [page, path] of Object.entries(ROUTE_PATHS)) {
    assert.equal(pageToPath(page), path)
    assert.equal(resolvePage(path), page)
    assert.equal(isKnownPath(path), true)
  }
})
