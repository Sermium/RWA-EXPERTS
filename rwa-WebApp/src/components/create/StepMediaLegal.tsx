// src/components/create/StepMediaLegal.tsx
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { 
  Upload, X, FileText, Image as ImageIcon, Video, 
  CheckCircle, AlertCircle, Loader2, File, Trash2,
  ChevronDown, ChevronUp, Info, Plus
} from 'lucide-react'
import { ProjectData, getRequiredDocuments, getMissingRequiredDocuments } from '@/app/create/page'

// ============================================================================
// TYPES
// ============================================================================

interface RequiredDocument {
  id: string
  name: string
  description: string
  required: boolean
}

interface UploadedUrls {
  logo?: string
  banner?: string
  pitchDeck?: string
  legalDocs: string[]
  images?: string[]
}

interface StepMediaLegalProps {
  data: ProjectData
  updateData: (updates: Partial<ProjectData>) => void
  onNext: () => void
  onBack: () => void
  uploadedUrls: UploadedUrls
  setUploadedUrls: (urls: UploadedUrls | ((prev: UploadedUrls) => UploadedUrls)) => void
  requiredDocuments?: RequiredDocument[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ACCEPTED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ipfsToHttp = (uri: string): string => {
  if (!uri) return ''
  if (uri.startsWith('ipfs://')) {
    const hash = uri.replace('ipfs://', '')
    return `https://gateway.pinata.cloud/ipfs/${hash}`
  }
  if (uri.startsWith('Qm') || uri.startsWith('bafy')) {
    return `https://gateway.pinata.cloud/ipfs/${uri}`
  }
  return uri
}

// Create object URL from file
const getFilePreviewUrl = (file: File | null): string | null => {
  if (!file) return null
  try {
    return URL.createObjectURL(file)
  } catch {
    return null
  }
}

// ============================================================================
// LOGO UPLOAD COMPONENT (Square 1:1)
// ============================================================================

interface LogoUploadProps {
  file: File | null
  uploadedUrl?: string
  onFileSelect: (file: File) => void
  onRemove: () => void
  uploading?: boolean
  error?: string | null
}

function LogoUpload({
  file,
  uploadedUrl,
  onFileSelect,
  onRemove,
  uploading,
  error,
}: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // Generate preview URL from file
  const previewUrl = file ? URL.createObjectURL(file) : null
  const displayUrl = uploadedUrl || previewUrl

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [file])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && ACCEPTED_IMAGE_TYPES.includes(droppedFile.type)) {
      if (droppedFile.size <= MAX_IMAGE_SIZE) {
        onFileSelect(droppedFile)
      }
    }
  }, [onFileSelect])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white flex items-center gap-2">
          Project Logo <span className="text-red-400">*</span>
        </label>
        {uploadedUrl && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Uploaded
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500">Square image, recommended 500×500px</p>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !displayUrl && inputRef.current?.click()}
        className={`relative aspect-square w-48 rounded-xl overflow-hidden border-2 transition-all ${
          dragOver
            ? 'border-blue-500 bg-blue-500/10'
            : displayUrl
            ? 'border-gray-600'
            : 'border-dashed border-gray-600 hover:border-gray-500 cursor-pointer'
        }`}
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Logo preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Logo image failed to load:', displayUrl)
              }}
            />
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      inputRef.current?.click()
                    }}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                    type="button"
                  >
                    <Upload className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove()
                    }}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                    type="button"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </>
              )}
            </div>
            {/* Upload status indicator */}
            {uploading && (
              <div className="absolute bottom-2 left-2 right-2 bg-black/70 rounded-lg px-2 py-1">
                <p className="text-xs text-white text-center">Uploading...</p>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            {uploading ? (
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-3">
                  <ImageIcon className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-sm text-gray-400 text-center">
                  Drop logo here
                </p>
                <p className="text-xs text-gray-600 mt-1">or click to browse</p>
              </>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f && f.size <= MAX_IMAGE_SIZE) {
              onFileSelect(f)
            }
            // Reset input
            if (inputRef.current) inputRef.current.value = ''
          }}
          className="hidden"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// BANNER UPLOAD COMPONENT (3:1 Aspect Ratio)
// ============================================================================

interface BannerUploadProps {
  file: File | null
  uploadedUrl?: string
  onFileSelect: (file: File) => void
  onRemove: () => void
  uploading?: boolean
  error?: string | null
}

function BannerUpload({
  file,
  uploadedUrl,
  onFileSelect,
  onRemove,
  uploading,
  error,
}: BannerUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // Generate preview URL from file
  const previewUrl = file ? URL.createObjectURL(file) : null
  const displayUrl = uploadedUrl || previewUrl

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [file])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && ACCEPTED_IMAGE_TYPES.includes(droppedFile.type)) {
      if (droppedFile.size <= MAX_IMAGE_SIZE) {
        onFileSelect(droppedFile)
      }
    }
  }, [onFileSelect])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white">Banner Image</label>
        {uploadedUrl && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Uploaded
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500">Wide image, recommended 1500×500px (3:1 ratio)</p>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !displayUrl && inputRef.current?.click()}
        className={`relative w-full rounded-xl overflow-hidden border-2 transition-all ${
          dragOver
            ? 'border-blue-500 bg-blue-500/10'
            : displayUrl
            ? 'border-gray-600'
            : 'border-dashed border-gray-600 hover:border-gray-500 cursor-pointer'
        }`}
        style={{ aspectRatio: '3 / 1' }}
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Banner preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Banner image failed to load:', displayUrl)
              }}
            />
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      inputRef.current?.click()
                    }}
                    className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                    type="button"
                  >
                    <Upload className="w-6 h-6 text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove()
                    }}
                    className="p-3 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                    type="button"
                  >
                    <Trash2 className="w-6 h-6 text-white" />
                  </button>
                </>
              )}
            </div>
            {uploading && (
              <div className="absolute bottom-3 left-3 right-3 bg-black/70 rounded-lg px-3 py-2">
                <p className="text-sm text-white text-center">Uploading...</p>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            {uploading ? (
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-gray-500 mb-2" />
                <p className="text-sm text-gray-400">Drop banner image here or click to browse</p>
                <p className="text-xs text-gray-600 mt-1">3:1 aspect ratio recommended</p>
              </>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f && f.size <= MAX_IMAGE_SIZE) {
              onFileSelect(f)
            }
            // Reset input
            if (inputRef.current) inputRef.current.value = ''
          }}
          className="hidden"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// PROJECT IMAGES COMPONENT (Horizontal scroll with previews)
// ============================================================================

interface ProjectImagesUploadProps {
  images: File[]
  uploadedUrls: string[]
  onAdd: (file: File) => void
  onRemove: (index: number, isUploaded: boolean) => void
  uploading?: boolean
  currentUploadIndex?: number
  maxImages?: number
}

function ProjectImagesUpload({
  images,
  uploadedUrls,
  onAdd,
  onRemove,
  uploading,
  currentUploadIndex,
  maxImages = 10,
}: ProjectImagesUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  // Generate preview URLs for pending files
  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file))
    setPreviewUrls(urls)
    
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [images])

  const totalCount = uploadedUrls.length + images.length
  const canAddMore = totalCount < maxImages

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_IMAGE_SIZE) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return
    onAdd(file)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white">Project Images</label>
        <span className="text-xs text-gray-500">{totalCount}/{maxImages} images</span>
      </div>
      <p className="text-xs text-gray-500">Add photos showcasing your project</p>

      {/* Horizontal scroll container */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {/* Uploaded images */}
        {uploadedUrls.map((url, index) => (
          <div
            key={`uploaded-${index}`}
            className="relative flex-shrink-0 w-40 h-40 rounded-xl overflow-hidden border-2 border-green-600/50 group"
          >
            <img
              src={url}
              alt={`Project image ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2">
              <CheckCircle className="w-5 h-5 text-green-400 drop-shadow-lg" />
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={() => onRemove(index, true)}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                type="button"
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        ))}

        {/* Pending images (not yet uploaded) */}
        {previewUrls.map((url, index) => (
          <div
            key={`pending-${index}`}
            className="relative flex-shrink-0 w-40 h-40 rounded-xl overflow-hidden border-2 border-yellow-600/50 group"
          >
            <img
              src={url}
              alt={`Pending image ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {uploading && currentUploadIndex === index ? (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                <span className="text-xs text-white">Uploading...</span>
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => onRemove(index, false)}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                  type="button"
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add more button */}
        {canAddMore && (
          <div
            onClick={() => inputRef.current?.click()}
            className="flex-shrink-0 w-40 h-40 rounded-xl border-2 border-dashed border-gray-600 hover:border-gray-500 hover:bg-gray-800/50 flex flex-col items-center justify-center cursor-pointer transition-colors"
          >
            <Plus className="w-8 h-8 text-gray-500 mb-2" />
            <p className="text-sm text-gray-500">Add Image</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFileSelect(f)
            if (inputRef.current) inputRef.current.value = ''
          }}
          className="hidden"
        />
      </div>
    </div>
  )
}

// ============================================================================
// SINGLE FILE UPLOAD (For documents)
// ============================================================================

interface SingleFileUploadProps {
  label: string
  description: string
  accept: string
  maxSize: number
  file: File | null
  uploadedUrl?: string
  onFileSelect: (file: File) => void
  onRemove: () => void
  uploading?: boolean
  error?: string | null
  required?: boolean
}

function SingleFileUpload({
  label,
  description,
  accept,
  maxSize,
  file,
  uploadedUrl,
  onFileSelect,
  onRemove,
  uploading,
  error,
  required,
}: SingleFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.size <= maxSize) {
      onFileSelect(droppedFile)
    }
  }, [maxSize, onFileSelect])

  const isUploaded = !!uploadedUrl
  const hasFile = !!file || isUploaded

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white flex items-center gap-2">
          {label}
          {required && <span className="text-red-400">*</span>}
        </label>
        {isUploaded && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Uploaded
          </span>
        )}
      </div>
      
      <p className="text-xs text-gray-500">{description}</p>

      {!hasFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-gray-600 hover:border-gray-500'
          }`}
        >
          <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            Drop file here or <span className="text-blue-400">browse</span>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Max size: {formatFileSize(maxSize)}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFileSelect(f)
            }}
            className="hidden"
          />
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {uploading ? (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            ) : isUploaded ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <FileText className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="text-sm text-white truncate max-w-[200px]">
                {file?.name || 'Uploaded file'}
              </p>
              {file && (
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              )}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            type="button"
          >
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// LEGAL DOCUMENTS SECTION
// ============================================================================

interface LegalDocumentsSectionProps {
  category: string
  requiredDocuments: RequiredDocument[]
  uploadedDocTypes: string[]
  onDocumentUpload: (documentType: string, file: File) => void
  onDocumentRemove: (documentType: string) => void
  uploading?: boolean
  uploadingDocType?: string | null
}

function LegalDocumentsSection({
  category,
  requiredDocuments,
  uploadedDocTypes,
  onDocumentUpload,
  onDocumentRemove,
  uploading,
  uploadingDocType,
}: LegalDocumentsSectionProps) {
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const getDocStatus = (docId: string): 'uploaded' | 'missing' => {
    return uploadedDocTypes.includes(docId) ? 'uploaded' : 'missing'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Legal Documents</h3>
        <span className="text-sm text-gray-400">
          {category || 'Select a category to see requirements'}
        </span>
      </div>

      {!category ? (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-300 text-sm">
            Please select a project category in Step 1 to see the required legal documents.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requiredDocuments.map((doc) => {
            const status = getDocStatus(doc.id)
            const isExpanded = expandedDoc === doc.id
            const isThisUploading = uploading && uploadingDocType === doc.id

            return (
              <div
                key={doc.id}
                className={`border rounded-xl overflow-hidden transition-colors ${
                  status === 'uploaded'
                    ? 'border-green-700/50 bg-green-900/10'
                    : doc.required
                    ? 'border-red-700/50 bg-red-900/10'
                    : 'border-gray-700 bg-gray-900/30'
                }`}
              >
                {/* Header */}
                <div
                  onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {status === 'uploaded' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : doc.required ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <File className="w-5 h-5 text-gray-500" />
                    )}
                    <div>
                      <p className="text-white font-medium flex items-center gap-2">
                        {doc.name}
                        {doc.required && <span className="text-red-400 text-xs">Required</span>}
                      </p>
                      <p className="text-xs text-gray-500">{doc.description}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-700/50">
                    <div className="pt-4">
                      {status === 'uploaded' ? (
                        <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-green-400" />
                            <span className="text-sm text-white">Document uploaded</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDocumentRemove(doc.id)
                            }}
                            className="px-3 py-1 text-sm text-red-400 hover:bg-red-900/30 rounded transition-colors"
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => inputRefs.current[doc.id]?.click()}
                          className="border-2 border-dashed border-gray-600 hover:border-gray-500 rounded-lg p-6 text-center cursor-pointer transition-colors"
                        >
                          {isThisUploading ? (
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                              <p className="text-sm text-gray-400">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                PDF, DOC, DOCX (max 50MB)
                              </p>
                            </>
                          )}
                          <input
                            ref={(el) => { inputRefs.current[doc.id] = el }}
                            type="file"
                            accept={ACCEPTED_DOC_TYPES.join(',')}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) onDocumentUpload(doc.id, file)
                              if (inputRefs.current[doc.id]) {
                                inputRefs.current[doc.id]!.value = ''
                              }
                            }}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StepMediaLegal({
  data,
  updateData,
  onNext,
  onBack,
  uploadedUrls,
  setUploadedUrls,
  requiredDocuments: propRequiredDocs,
}: StepMediaLegalProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [imageUploadIndex, setImageUploadIndex] = useState<number | undefined>(undefined)

  // Get required documents based on category
  const requiredDocuments = propRequiredDocs || getRequiredDocuments(data.category)
  const missingDocs = getMissingRequiredDocuments(data.category, data.legalDocumentTypes)

  // Upload file to IPFS
  const uploadFile = async (file: File, type: string): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const fileType = type.includes('logo') || type.includes('banner') || type.includes('image') 
      ? 'image' 
      : 'document'
    formData.append('type', fileType)

    const response = await fetch('/api/ipfs/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Upload failed')
    }

    const result = await response.json()
    const url = result.url || result.uri
    
    // Convert ipfs:// to gateway URL
    if (url.startsWith('ipfs://')) {
      const hash = url.replace('ipfs://', '')
      return `https://gateway.pinata.cloud/ipfs/${hash}`
    }
    
    return url
  }

  // Handle logo upload
  const handleLogoSelect = async (file: File) => {
    updateData({ logo: file })
    setUploadingType('logo')
    setUploadError(null)
    
    try {
      setIsUploading(true)
      const url = await uploadFile(file, 'logo')
      setUploadedUrls(prev => ({ ...prev, logo: url }))
    } catch (err: any) {
      setUploadError('Failed to upload logo: ' + err.message)
    } finally {
      setIsUploading(false)
      setUploadingType(null)
    }
  }

  const handleLogoRemove = () => {
    updateData({ logo: null })
    setUploadedUrls(prev => ({ ...prev, logo: undefined }))
  }

  // Handle banner upload
  const handleBannerSelect = async (file: File) => {
    updateData({ banner: file })
    setUploadingType('banner')
    setUploadError(null)
    
    try {
      setIsUploading(true)
      const url = await uploadFile(file, 'banner')
      setUploadedUrls(prev => ({ ...prev, banner: url }))
    } catch (err: any) {
      setUploadError('Failed to upload banner: ' + err.message)
    } finally {
      setIsUploading(false)
      setUploadingType(null)
    }
  }

  const handleBannerRemove = () => {
    updateData({ banner: null })
    setUploadedUrls(prev => ({ ...prev, banner: undefined }))
  }

  // Handle project images
  const handleImageAdd = async (file: File) => {
    const newImages = [...data.images, file]
    const newIndex = newImages.length - 1
    updateData({ images: newImages })
    setUploadingType('image')
    setImageUploadIndex(newIndex)
    
    try {
      const url = await uploadFile(file, 'image')
      setUploadedUrls(prev => ({
        ...prev,
        images: [...(prev.images || []), url],
      }))
      // Remove from pending after successful upload
      updateData({ images: data.images })
    } catch (err: any) {
      console.error('Failed to upload image:', err)
      // Remove the failed image from data
      updateData({ images: data.images })
    } finally {
      setUploadingType(null)
      setImageUploadIndex(undefined)
    }
  }

  const handleImageRemove = (index: number, isUploaded: boolean) => {
    if (isUploaded) {
      setUploadedUrls(prev => ({
        ...prev,
        images: prev.images?.filter((_, i) => i !== index),
      }))
    } else {
      const newImages = data.images.filter((_, i) => i !== index)
      updateData({ images: newImages })
    }
  }

  // Handle pitch deck upload
  const handlePitchDeckSelect = async (file: File) => {
    updateData({ pitchDeck: file })
    setUploadingType('pitchDeck')
    setUploadError(null)
    
    try {
      setIsUploading(true)
      const url = await uploadFile(file, 'document')
      setUploadedUrls(prev => ({ ...prev, pitchDeck: url }))
    } catch (err: any) {
      setUploadError('Failed to upload pitch deck: ' + err.message)
    } finally {
      setIsUploading(false)
      setUploadingType(null)
    }
  }

  const handlePitchDeckRemove = () => {
    updateData({ pitchDeck: null })
    setUploadedUrls(prev => ({ ...prev, pitchDeck: undefined }))
  }

  // Handle legal document upload
  const handleLegalDocUpload = async (documentType: string, file: File) => {
    setUploadingType(documentType)
    setUploadError(null)
    
    try {
      setIsUploading(true)
      const url = await uploadFile(file, 'document')
      
      const newTypes = [...data.legalDocumentTypes, documentType]
      updateData({ 
        legalDocumentTypes: newTypes,
        legalDocuments: [...data.legalDocuments, file],
      })
      
      setUploadedUrls(prev => ({
        ...prev,
        legalDocs: [...prev.legalDocs, url],
      }))
    } catch (err: any) {
      setUploadError(`Failed to upload document: ${err.message}`)
    } finally {
      setIsUploading(false)
      setUploadingType(null)
    }
  }

  const handleLegalDocRemove = (documentType: string) => {
    const index = data.legalDocumentTypes.indexOf(documentType)
    if (index === -1) return

    const newTypes = data.legalDocumentTypes.filter(t => t !== documentType)
    const newDocs = data.legalDocuments.filter((_, i) => i !== index)
    
    updateData({
      legalDocumentTypes: newTypes,
      legalDocuments: newDocs,
    })

    setUploadedUrls(prev => ({
      ...prev,
      legalDocs: prev.legalDocs.filter((_, i) => i !== index),
    }))
  }

  // Handle terms acceptance
  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateData({ termsAccepted: e.target.checked })
  }

  // Validation
  const canProceed = () => {
    // Must have logo (either uploaded or file selected)
    if (!uploadedUrls.logo && !data.logo) return false
    // Must have all required documents
    if (missingDocs.length > 0) return false
    // Must accept terms
    if (!data.termsAccepted) return false
    return true
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Media & Legal Documents</h2>
        <p className="text-gray-400">
          Upload project media and required legal documentation
        </p>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-400">{uploadError}</p>
            <button
              onClick={() => setUploadError(null)}
              className="text-sm text-red-300 hover:text-red-200 mt-1"
              type="button"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Media Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
          Project Media
        </h3>

        {/* Logo and Banner side by side on desktop */}
        <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
          <LogoUpload
            file={data.logo}
            uploadedUrl={uploadedUrls.logo}
            onFileSelect={handleLogoSelect}
            onRemove={handleLogoRemove}
            uploading={uploadingType === 'logo'}
          />

          <BannerUpload
            file={data.banner}
            uploadedUrl={uploadedUrls.banner}
            onFileSelect={handleBannerSelect}
            onRemove={handleBannerRemove}
            uploading={uploadingType === 'banner'}
          />
        </div>

        {/* Project Images */}
        <ProjectImagesUpload
          images={data.images}
          uploadedUrls={uploadedUrls.images || []}
          onAdd={handleImageAdd}
          onRemove={handleImageRemove}
          uploading={uploadingType === 'image'}
          currentUploadIndex={imageUploadIndex}
          maxImages={10}
        />

        {/* Pitch Deck */}
        <SingleFileUpload
          label="Pitch Deck"
          description="PDF presentation of your project"
          accept=".pdf"
          maxSize={MAX_FILE_SIZE}
          file={data.pitchDeck}
          uploadedUrl={uploadedUrls.pitchDeck}
          onFileSelect={handlePitchDeckSelect}
          onRemove={handlePitchDeckRemove}
          uploading={uploadingType === 'pitchDeck'}
        />

        {/* Video URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white flex items-center gap-2">
            <Video className="w-4 h-4" />
            Video URL (Optional)
          </label>
          <input
            type="url"
            value={data.videoUrl}
            onChange={(e) => updateData({ videoUrl: e.target.value })}
            placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-500">YouTube or Vimeo link</p>
        </div>
      </div>

      {/* Legal Documents Section */}
      <div className="pt-6 border-t border-gray-700">
        <LegalDocumentsSection
          category={data.category}
          requiredDocuments={requiredDocuments}
          uploadedDocTypes={data.legalDocumentTypes}
          onDocumentUpload={handleLegalDocUpload}
          onDocumentRemove={handleLegalDocRemove}
          uploading={isUploading}
          uploadingDocType={uploadingType}
        />
      </div>

      {/* Missing Documents Warning */}
      {missingDocs.length > 0 && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Missing Required Documents</p>
              <ul className="mt-2 space-y-1">
                {missingDocs.map((doc) => (
                  <li key={doc} className="text-sm text-red-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Conditions */}
      <div className="pt-6 border-t border-gray-700">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.termsAccepted}
            onChange={handleTermsChange}
            className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
          />
          <span className="text-sm text-gray-300">
            I confirm that all uploaded documents are accurate and legally valid. I agree to the{' '}
            <a href="/terms" target="_blank" className="text-blue-400 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" className="text-blue-400 hover:underline">
              Privacy Policy
            </a>
            . I understand that providing false information may result in project rejection and potential legal action.
            <span className="text-red-400 ml-1">*</span>
          </span>
        </label>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          type="button"
        >
          Back
        </button>
        <button
          onClick={() => {
            // Save URLs to data before proceeding
            updateData({
              logoUrl: uploadedUrls.logo || '',
              bannerUrl: uploadedUrls.banner || '',
              pitchDeckUrl: uploadedUrls.pitchDeck || '',
              imageUrls: uploadedUrls.images || [],
              legalDocumentUrls: uploadedUrls.legalDocs.map((url, index) => ({
                type: data.legalDocumentTypes[index] || `document_${index}`,
                url: url,
              })),
            })
            onNext()
          }}
          disabled={!canProceed() || isUploading}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          type="button"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : (
            'Continue to Review'
          )}
        </button>
      </div>
    </div>
  )
}
