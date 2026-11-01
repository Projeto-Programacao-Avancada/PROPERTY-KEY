
import { useRef, useState } from 'react'
import type { ApiKey } from '../../lib/api'
import './gallery.css'

type GalleryPageProps = {
  keys: ApiKey[]
}

type GalleryImage = {
  id: string
  name: string
  description: string
  category: string
  keyCode: string
  url: string
}

const categories = [
  'Fachada',
  'Imóvel',
  'Chave',
  'Documento',
  'Outros',
]

export default function GalleryPage({ keys }: GalleryPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [images, setImages] = useState<GalleryImage[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Todas')
  const [selectedKey, setSelectedKey] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Imóvel')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem.')
      event.target.value = ''
      return
    }

    if (preview) URL.revokeObjectURL(preview)

    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  function handleAddImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedFile || !preview) {
      alert('Selecione uma imagem antes de cadastrar.')
      return
    }

    const newImage: GalleryImage = {
      id: crypto.randomUUID(),
      name: selectedFile.name,
      description: description.trim(),
      category: selectedCategory,
      keyCode: selectedKey,
      url: preview,
    }

    setImages((current) => [newImage, ...current])

    setSelectedFile(null)
    setPreview('')
    setDescription('')
    setSelectedKey('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleDeleteImage(image: GalleryImage) {
    const confirmed = window.confirm(
      'Deseja realmente excluir esta imagem da galeria?'
    )

    if (!confirmed) return

    URL.revokeObjectURL(image.url)

    setImages((current) =>
      current.filter((item) => item.id !== image.id)
    )

    if (selectedImage?.id === image.id) {
      setSelectedImage(null)
    }
  }

  const filteredImages = images.filter((image) => {
    const matchesSearch =
      `${image.name} ${image.description} ${image.keyCode}`
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
          {images.length} imagens
        </span>
      </section>

      <section className="gallery-upload-card">
        <div className="gallery-section-heading">
          <h3>ADICIONAR IMAGEM</h3>
          <p>Selecione uma imagem e informe seus dados.</p>
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
                  setSelectedCategory(event.target.value)
                }
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
                value={selectedKey}
                onChange={(event) =>
                  setSelectedKey(event.target.value)
                }
              >
                <option value="">Nenhuma associação</option>
                {keys.map((key) => (
                  <option key={key.id} value={key.code}>
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
              />

              <button
                className="gallery-add-button"
                type="submit"
              >
                + ADICIONAR IMAGEM
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
              setCategoryFilter(event.target.value)
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

        {filteredImages.length > 0 ? (
          <div className="gallery-grid">
            {filteredImages.map((image) => (
              <article className="gallery-image-card" key={image.id}>
                <button
                  type="button"
                  className="gallery-image-preview"
                  onClick={() => setSelectedImage(image)}
                  aria-label={`Visualizar ${image.name}`}
                >
                  <img
                    src={image.url}
                    alt={image.description || image.name}
                  />
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
                    {image.keyCode
                      ? `Chave: ${image.keyCode}`
                      : 'Sem chave associada'}
                  </span>

                  <div className="gallery-card-actions">
                    <button
                      type="button"
                      onClick={() => setSelectedImage(image)}
                    >
                      VISUALIZAR
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteImage(image)}
                    >
                      EXCLUIR
                    </button>
                  </div>
                </div>
              </article>
            ))}
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

            <img
              src={selectedImage.url}
              alt={selectedImage.description || selectedImage.name}
            />

            <h3>{selectedImage.name}</h3>
            <p>{selectedImage.description || 'Sem descrição'}</p>
            <span>
              Categoria: {selectedImage.category}
            </span>
          </section>
        </div>
      )}
    </main>
  )
}
