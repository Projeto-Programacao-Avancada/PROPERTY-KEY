import { useEffect, useRef, useState } from 'react'
import {
  ApiError,
  deleteGalleryImage,
  fetchGalleryImageBlob,
  fetchGalleryImages,
  type ApiGalleryImage,
  type ApiKey,
  type GalleryCategory,
  uploadGalleryImage,
} from '../../lib/api'
import './gallery.css'

type GalleryPageProps = {
  keys: ApiKey[]
  previewMode?: boolean
  onGalleryChange?: () => void
}

const categories: GalleryCategory[] = [
  'Fachada',
  'Imóvel',
  'Chave',
  'Documento',
  'Outros',
]

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

function errorMessage(error: unknown) {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Erro inesperado na galeria.'
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Não foi possível ler o arquivo selecionado.'))
      }
    }
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'))
    reader.readAsDataURL(file)
  })
}

export default function GalleryPage({
  keys,
  previewMode = false,
  onGalleryChange,
}: GalleryPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef('')
  const blobUrlsRef = useRef<Record<number, string>>({})
  const nextPreviewIdRef = useRef(-1)

  const [images, setImages] = useState<ApiGalleryImage[]>([])
  const [blobUrls, setBlobUrls] = useState<Record<number, string>>({})
  const [failedBlobIds, setFailedBlobIds] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(!previewMode)
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | GalleryCategory>('Todas')
  const [selectedKeyId, setSelectedKeyId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory>('Imóvel')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<ApiGalleryImage | null>(null)

  function revokeAllBlobUrls() {
    for (const url of Object.values(blobUrlsRef.current)) {
      URL.revokeObjectURL(url)
    }
    blobUrlsRef.current = {}
  }

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
      revokeAllBlobUrls()
    }
  }, [])

  useEffect(() => {
    if (!selectedImage) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedImage(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage])

  useEffect(() => {
    if (previewMode) return

    let cancelled = false

    async function loadGallery() {
      setLoading(true)
      setLoadError('')
      try {
        const list = await fetchGalleryImages()
        if (cancelled) return

        setImages(list)

        const validIds = new Set(list.map((item) => item.id))
        const nextMap: Record<number, string> = {}
        for (const [idStr, url] of Object.entries(blobUrlsRef.current)) {
          const id = Number(idStr)
          if (validIds.has(id)) {
            nextMap[id] = url
          } else {
            URL.revokeObjectURL(url)
          }
        }
        blobUrlsRef.current = nextMap
        setBlobUrls({ ...nextMap })
        setFailedBlobIds({})

        const missing = list.filter((item) => !nextMap[item.id])
        await Promise.allSettled(
          missing.map(async (item) => {
            try {
              const objectUrl = await fetchGalleryImageBlob(item.id)
              if (cancelled) {
                URL.revokeObjectURL(objectUrl)
                return
              }
              const previous = blobUrlsRef.current[item.id]
              if (previous) URL.revokeObjectURL(previous)
              blobUrlsRef.current[item.id] = objectUrl
              setBlobUrls((current) => ({ ...current, [item.id]: objectUrl }))
            } catch {
              if (!cancelled) {
                setFailedBlobIds((current) => ({ ...current, [item.id]: true }))
              }
            }
          })
        )
      } catch (error) {
        if (cancelled) return
        console.error('Erro ao carregar galeria:', error)
        setLoadError(errorMessage(error))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadGallery()

    return () => {
      cancelled = true
    }
  }, [previewMode, reloadToken])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setFormError('')

    if (!file) return

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      setFormError('Selecione uma imagem PNG, JPEG ou WebP.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setFormError('A imagem ultrapassa o limite máximo de 10 MB.')
      event.target.value = ''
      return
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)

    const nextPreview = URL.createObjectURL(file)
    previewUrlRef.current = nextPreview
    setSelectedFile(file)
    setPreview(nextPreview)
  }

  async function handleAddImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedFile || !preview) {
      setFormError('Selecione uma imagem antes de cadastrar.')
      return
    }

    setFormError('')
    const numericKeyId = selectedKeyId ? Number(selectedKeyId) : null
    const linkedKey = numericKeyId !== null
      ? keys.find((key) => key.id === numericKeyId) ?? null
      : null

    if (previewMode) {
      const localId = nextPreviewIdRef.current--
      const localUrl = URL.createObjectURL(selectedFile)
      blobUrlsRef.current[localId] = localUrl
      setBlobUrls((current) => ({ ...current, [localId]: localUrl }))

      const localImage: ApiGalleryImage = {
        id: localId,
        name: selectedFile.name,
        description: description.trim() || null,
        category: selectedCategory,
        key_id: linkedKey?.id ?? null,
        key_code: linkedKey?.code ?? null,
        key_description: linkedKey?.description ?? null,
        mime_type: selectedFile.type,
        size_bytes: selectedFile.size,
        url: localUrl,
        created_at: new Date().toISOString(),
      }
      setImages((current) => [localImage, ...current])
      resetForm()
      return
    }

    setSaving(true)
    try {
      const imageData = await fileToDataUrl(selectedFile)
      const created = await uploadGalleryImage({
        name: selectedFile.name,
        description: description.trim() || null,
        category: selectedCategory,
        key_id: numericKeyId,
        image_data: imageData,
      })

      const savedObjectUrl = URL.createObjectURL(selectedFile)
      const previous = blobUrlsRef.current[created.id]
      if (previous) URL.revokeObjectURL(previous)
      blobUrlsRef.current[created.id] = savedObjectUrl
      setBlobUrls((current) => ({ ...current, [created.id]: savedObjectUrl }))
      setImages((current) => [created, ...current])

      resetForm()
      onGalleryChange?.()
    } catch (error) {
      console.error('Erro ao salvar imagem na galeria:', error)
      setFormError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }
    setSelectedFile(null)
    setPreview('')
    setDescription('')
    setSelectedKeyId('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleDeleteImage(image: ApiGalleryImage) {
    const confirmed = window.confirm(
      'Deseja realmente excluir esta imagem da galeria?'
    )

    if (!confirmed) return

    setDeletingId(image.id)
    setLoadError('')
    try {
      if (!previewMode) {
        await deleteGalleryImage(image.id)
      }

      const cachedUrl = blobUrlsRef.current[image.id]
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl)
        delete blobUrlsRef.current[image.id]
        setBlobUrls((current) => {
          const next = { ...current }
          delete next[image.id]
          return next
        })
      }

      setImages((current) => current.filter((item) => item.id !== image.id))

      if (selectedImage?.id === image.id) {
        setSelectedImage(null)
      }

      if (!previewMode) {
        onGalleryChange?.()
      }
    } catch (error) {
      console.error('Erro ao excluir imagem da galeria:', error)
      setLoadError(errorMessage(error))
    } finally {
      setDeletingId(null)
    }
  }

  const filteredImages = images.filter((image) => {
    const matchesSearch =
      `${image.name} ${image.description ?? ''} ${image.key_code ?? ''} ${image.key_description ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase())

    const matchesCategory =
      categoryFilter === 'Todas' ||
      image.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  return (
    <main className="gallery-page">
      <section className="gallery-header">
        <div>
          <h2>GALERIA DE IMAGENS</h2>
          <p>
            Organize e visualize imagens dos imóveis e das chaves cadastradas.
          </p>
        </div>

        <span className="gallery-counter">
          {images.length} {images.length === 1 ? 'imagem' : 'imagens'}
        </span>
      </section>

      {previewMode && (
        <p className="gallery-notice" role="status">
          Modo de prévia ativo: imagens adicionadas aqui ficam apenas nesta sessão e não são enviadas ao servidor.
        </p>
      )}

      <section className="gallery-upload-card">
        <div className="gallery-section-heading">
          <h3>ADICIONAR IMAGEM</h3>
          <p>Selecione uma imagem (PNG, JPEG ou WebP, até 10 MB) e informe seus dados.</p>
        </div>

        <form onSubmit={handleAddImage}>
          <div className="gallery-form-grid">
            <div className="gallery-file-area">
              <label htmlFor="gallery-file">
                IMAGEM *
              </label>

              <input
                ref={fileInputRef}
                id="gallery-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                disabled={saving}
                required
              />

              {preview && (
                <div className="gallery-preview">
                  <img src={preview} alt="Pré-visualização" />
                </div>
              )}
            </div>

            <div className="gallery-fields">
              <label htmlFor="gallery-category">
                CATEGORIA *
              </label>

              <select
                id="gallery-category"
                value={selectedCategory}
                onChange={(event) =>
                  setSelectedCategory(event.target.value as GalleryCategory)
                }
                disabled={saving}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <label htmlFor="gallery-key">
                CHAVE / IMÓVEL
              </label>

              <select
                id="gallery-key"
                value={selectedKeyId}
                onChange={(event) =>
                  setSelectedKeyId(event.target.value)
                }
                disabled={saving}
              >
                <option value="">Nenhuma associação</option>
                {keys.map((key) => (
                  <option key={key.id} value={String(key.id)}>
                    {key.code} - {key.description}
                  </option>
                ))}
              </select>

              <label htmlFor="gallery-description">
                DESCRIÇÃO
              </label>

              <textarea
                id="gallery-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Descreva a imagem..."
                rows={3}
                maxLength={2000}
                disabled={saving}
              />

              {formError && (
                <p className="gallery-error" role="alert">
                  {formError}
                </p>
              )}

              <button
                className="gallery-add-button"
                type="submit"
                disabled={saving}
              >
                {saving ? 'ENVIANDO...' : '+ ADICIONAR IMAGEM'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="gallery-list-section">
        <div className="gallery-list-heading">
          <div>
            <h3>IMAGENS CADASTRADAS</h3>
            <p>Consulte as imagens adicionadas à galeria.</p>
          </div>
        </div>

        <div className="gallery-filters">
          <input
            type="search"
            placeholder="Buscar imagem, descrição ou chave..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value as 'Todas' | GalleryCategory)
            }
            aria-label="Filtrar por categoria"
          >
            <option value="Todas">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {loadError && (
          <div className="gallery-error-box" role="alert">
            <p>{loadError}</p>
            {!previewMode && (
              <button
                type="button"
                onClick={() => setReloadToken((current) => current + 1)}
              >
                TENTAR NOVAMENTE
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="gallery-empty" role="status">
            <h3>Carregando galeria...</h3>
            <p>Aguarde enquanto buscamos as imagens salvas no servidor.</p>
          </div>
        ) : filteredImages.length > 0 ? (
          <div className="gallery-grid">
            {filteredImages.map((image) => {
              const imageSrc = blobUrls[image.id]
              const isDeleting = deletingId === image.id

              return (
                <article className="gallery-image-card" key={image.id}>
                  <button
                    type="button"
                    className="gallery-image-preview"
                    onClick={() => setSelectedImage(image)}
                    aria-label={`Visualizar ${image.name}`}
                  >
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={image.description || image.name}
                      />
                    ) : (
                      <span className="gallery-image-fallback">
                        {failedBlobIds[image.id] ? 'Imagem indisponível' : 'Carregando imagem...'}
                      </span>
                    )}
                  </button>

                  <div className="gallery-image-info">
                    <span className="gallery-category">
                      {image.category}
                    </span>

                    <h4>{image.name}</h4>

                    <p>
                      {image.description || 'Sem descrição'}
                    </p>

                    <span className="gallery-key-reference">
                      {image.key_code
                        ? `Chave: ${image.key_code}`
                        : 'Sem chave associada'}
                    </span>

                    <div className="gallery-card-actions">
                      <button
                        type="button"
                        onClick={() => setSelectedImage(image)}
                        disabled={isDeleting}
                      >
                        VISUALIZAR
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteImage(image)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'EXCLUINDO...' : 'EXCLUIR'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="gallery-empty">
            <h3>Nenhuma imagem encontrada</h3>
            <p>
              Adicione imagens ou altere os filtros de pesquisa.
            </p>
          </div>
        )}
      </section>

      {selectedImage && (
        <div
          className="gallery-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedImage(null)
            }
          }}
        >
          <section
            className="gallery-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Visualização da imagem"
          >
            <button
              type="button"
              className="gallery-modal-close"
              onClick={() => setSelectedImage(null)}
              aria-label="Fechar visualização"
            >
              ×
            </button>

            {blobUrls[selectedImage.id] ? (
              <img
                src={blobUrls[selectedImage.id]}
                alt={selectedImage.description || selectedImage.name}
              />
            ) : (
              <div className="gallery-modal-fallback">
                Imagem indisponível para visualização.
              </div>
            )}

            <h3>{selectedImage.name}</h3>
            <p>{selectedImage.description || 'Sem descrição'}</p>
            <div className="gallery-modal-meta">
              <span>Categoria: {selectedImage.category}</span>
              <span>
                {selectedImage.key_code
                  ? `Chave: ${selectedImage.key_code}`
                  : 'Sem chave associada'}
              </span>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
