'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const MAX_FILE_SIZE = 50 * 1024 * 1024

type UploadStatus = 'idle' | 'request-created' | 'uploading' | 'success' | 'failed'

type CreateUploadResponse = {
  token: string
  uploadAuthorization: {
    path: string
    token: string
  }
}

function isCreateUploadResponse(value: unknown): value is CreateUploadResponse {
  if (!value || typeof value !== 'object') return false

  const response = value as Record<string, unknown>
  const authorization = response.uploadAuthorization
  return (
    typeof response.token === 'string' &&
    !!authorization &&
    typeof authorization === 'object' &&
    typeof (authorization as Record<string, unknown>).path === 'string' &&
    typeof (authorization as Record<string, unknown>).token === 'string'
  )
}

export default function TestUploadPage() {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [message, setMessage] = useState('Choose a PDF to begin.')
  const [shareToken, setShareToken] = useState('')

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    setShareToken('')

    if (!file) return

    if (file.size < 1 || file.size > MAX_FILE_SIZE) {
      setStatus('failed')
      setMessage('Upload failed: the PDF must be between 1 byte and 50 MB.')
      return
    }

    if (file.type !== 'application/pdf') {
      setStatus('failed')
      setMessage('Upload failed: please choose a PDF file.')
      return
    }

    setStatus('request-created')
    setMessage('Request created. Preparing the upload...')

    try {
      const { data, error: createError } = await supabase.functions.invoke('create-upload', {
        body: {
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
        },
      })

      if (createError) throw new Error(createError.message || 'Unable to create upload request.')
      if (!isCreateUploadResponse(data)) {
        throw new Error('The upload request returned an invalid response.')
      }

      setStatus('uploading')
      setMessage('Uploading your PDF...')

      const { error: uploadError } = await supabase.storage
        .from('crossdoc-files')
        .uploadToSignedUrl(
          data.uploadAuthorization.path,
          data.uploadAuthorization.token,
          file,
          { contentType: file.type },
        )

      if (uploadError) throw new Error(uploadError.message || 'Unable to upload the PDF.')

      setStatus('success')
      setShareToken(data.token)
      setMessage('Upload successful. Use the share token to test finalize-upload.')
    } catch (error) {
      setStatus('failed')
      setMessage(`Upload failed: ${error instanceof Error ? error.message : 'Something went wrong.'}`)
    }
  }

  return (
    <main className="min-h-screen px-5 py-12 sm:px-8">
      <section className="mx-auto max-w-xl rounded-[28px] border-2 border-[#2b0a17] bg-[#fffdf8] p-6 shadow-[7px_8px_0_#2b0a17] sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#2b0a17]/55">CrossDoc test utility</p>
        <h1 className="mt-3 text-4xl tracking-tight">Test PDF upload</h1>
        <p className="mt-3 text-[#2b0a17]/65">
          Create a signed upload request and send one PDF directly to storage.
        </p>

        <label
          htmlFor="pdf-upload"
          className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#2b0a17]/30 bg-[#fffaf3] px-5 py-12 text-center transition hover:border-[#2b0a17]"
        >
          <span className="text-lg font-black">Choose a PDF</span>
          <span className="mt-2 text-sm text-[#2b0a17]/60">1 byte to 50 MB</span>
          <span className="mt-5 rounded-full bg-[#2b0a17] px-5 py-3 text-sm font-bold text-[#fffdf8]">
            Select file
          </span>
          <input
            id="pdf-upload"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileSelected}
            className="sr-only"
          />
        </label>

        <p
          role="status"
          aria-live="polite"
          className={`mt-6 rounded-xl px-4 py-3 text-sm font-bold ${
            status === 'failed'
              ? 'bg-[#f7d6d0] text-[#9d413d]'
              : status === 'success'
                ? 'bg-[#e9f0f3] text-[#2b0a17]'
                : 'bg-[#f7d5c7] text-[#2b0a17]'
          }`}
        >
          {message}
        </p>

        {status === 'success' && (
          <div className="mt-6 rounded-xl border border-[#2b0a17]/15 bg-[#fffaf3] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2b0a17]/55">Share token</p>
            <p className="mt-2 break-all font-mono text-sm">{shareToken}</p>
          </div>
        )}
      </section>
    </main>
  )
}
