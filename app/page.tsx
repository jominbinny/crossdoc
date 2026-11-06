'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowDownToLine, ArrowRight, Check, Cloud, Copy, FileText, Link2, LockKeyhole, Menu, MousePointer2, QrCode, ShieldCheck, Upload, X, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type DocumentRecord = { name: string; size: string; type: string; token: string; url: string; file?: File }

const allowed = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'png', 'jpg', 'jpeg']
const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
const makeToken = () => Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6)

function Logo() {
  return <a href="/" className="flex items-center gap-1.5 text-[19px] font-black tracking-[-0.08em] text-[#2b0a17]" aria-label="CrossDoc home"><span className="italic">cross</span><span className="text-[#ff9f7a]">doc</span></a>
}

function Button({ children, onClick, variant = 'dark', type = 'button', disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: 'dark' | 'light' | 'pink'; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-0 px-6 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${variant === 'dark' ? 'bg-[#ff9f7a] text-[#2b0a17] hover:bg-[#ffb296]' : variant === 'pink' ? 'bg-[#ff9f7a] text-[#2b0a17] hover:bg-[#ffb296]' : 'bg-[#fffdf8] text-[#2b0a17]'}`}>{children}</button>
}

function Header() {
  const [open, setOpen] = useState(false)
  const closeMenu = () => setOpen(false)
  const scrollToUpload = () => { closeMenu(); document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' }) }
  const links = [{ href: '#how-it-works', label: 'How it works' }, { href: '#features', label: 'Features' }, { href: '#faq', label: 'FAQ' }]
  return <header className="relative z-40 bg-[#fffaf3] px-3 pt-3 sm:px-5 sm:pt-5 lg:px-8"><div className="relative z-40 mx-auto flex h-[58px] max-w-[1280px] items-center justify-between gap-3 rounded-full border border-[#2b0a17]/15 bg-[#fffaf3] px-4 shadow-[0_3px_0_rgba(43,10,23,.12)] sm:h-[64px] sm:px-6"><Logo /><nav aria-label="Primary navigation" className="hidden items-center gap-6 md:flex">{links.map((link) => <a key={link.href} href={link.href} className="px-1 py-2 text-sm font-bold text-[#2b0a17]/65 transition hover:text-[#2b0a17]">{link.label}</a>)}</nav><div className="hidden items-center gap-3 md:flex"><Button variant="pink" onClick={scrollToUpload}>Start sharing <ArrowRight size={16} /></Button></div><button type="button" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)} className="relative z-50 grid size-11 place-items-center rounded-full border-2 border-[#2b0a17] bg-[#fffaf3] text-[#2b0a17] shadow-[2px_3px_0_#2b0a17] transition hover:-translate-y-0.5 md:hidden">{open ? <X size={21} /> : <Menu size={21} />}</button></div>{open && <div id="mobile-nav" className="relative z-30 border-t border-[#2b0a17]/15 bg-[#fffaf3] px-5 pb-5 pt-3 shadow-[0_8px_18px_rgba(7,59,53,.08)] md:hidden"><nav aria-label="Mobile navigation" className="flex flex-col gap-1">{links.map((link) => <a key={link.href} href={link.href} onClick={closeMenu} className="rounded-xl px-3 py-3 text-base font-bold text-[#2b0a17]/75 hover:bg-[#e9f0f3]">{link.label}</a>)}</nav><div className="mt-4 border-t border-[#2b0a17]/10 pt-4"><div className="w-full [&>button]:w-full"><Button variant="pink" onClick={scrollToUpload}>Start sharing <ArrowRight size={16} /></Button></div></div></div>}</header>
}


function UploadCard({ onUploaded }: { onUploaded: (doc: DocumentRecord) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [stage, setStage] = useState('')
  const [error, setError] = useState('')

  const allowed = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'png', 'jpg', 'jpeg']

  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  }

  const validate = (candidate: File) => {
    const extension = candidate.name.split('.').pop()?.toLowerCase() || ''

    if (!allowed.includes(extension)) {
      setError('Unsupported file type. Choose PDF, DOCX, XLSX, PPTX, TXT, PNG or JPG.')
      return
    }

    if (candidate.size < 1 || candidate.size > 50 * 1024 * 1024) {
      setError('File size must be between 1 byte and 50 MB.')
      return
    }

    setError('')
    setFile(candidate)
    setStage('')
  }

  const upload = async () => {
    if (!file || uploading) return

    setUploading(true)
    setError('')

    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || ''
      const mimeType = mimeTypes[extension]

      // 1. Request an upload authorization and share token.
      setStage('Preparing secure upload...')

      const { data: uploadData, error: createError } =
        await supabase.functions.invoke('create-upload', {
          body: {
            filename: file.name,
            mimeType,
            fileSize: file.size,
          },
        })

      if (createError) {
        throw new Error(createError.message || 'Unable to create upload.')
      }

      if (
        !uploadData?.token ||
        !uploadData?.uploadAuthorization?.path ||
        !uploadData?.uploadAuthorization?.token ||
        !uploadData?.uploadAuthorization?.bucket
      ) {
        throw new Error('Invalid upload authorization response.')
      }

      const shareToken = uploadData.token
      const authorization = uploadData.uploadAuthorization

      // 2. Upload the actual file directly to private Supabase Storage.
      setStage('Uploading your document...')

      const { error: storageError } = await supabase.storage
        .from(authorization.bucket)
        .uploadToSignedUrl(
          authorization.path,
          authorization.token,
          file,
          {
            contentType: mimeType,
            upsert: false,
          }
        )

      if (storageError) {
        throw new Error(`File upload failed: ${storageError.message}`)
      }

      // 3. Verify the uploaded file and finalize the document.
      setStage('Verifying your document...')

      const { data: finalizeData, error: finalizeError } =
        await supabase.functions.invoke('finalize-upload', {
          body: {
            token: shareToken,
          },
        })

      if (finalizeError) {
        throw new Error(
          `Upload completed, but finalization failed: ${finalizeError.message}. Please contact support.`
        )
      }

      if (finalizeData?.success === false) {
        throw new Error(
          finalizeData.error || 'Unable to finalize the upload.'
        )
      }

      // 4. Generate the real share URL.
      const shareUrl = `${window.location.origin}/s/${shareToken}`

      onUploaded({
        name: file.name,
        size: formatSize(file.size),
        type: extension,
        token: shareToken,
        url: shareUrl,
        file,
      })

    } catch (err) {
      console.error('CrossDoc upload error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong during upload.'
      )
    } finally {
      setUploading(false)
      setStage('')
    }
  }

  return (
    <div
      id="upload"
      className="scroll-mt-24 rounded-2xl border border-[#2b0a17]/10 bg-[#fffaf3] p-3 shadow-[0_10px_24px_rgba(43,10,23,.08)] sm:p-4"
    >
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const dropped = e.dataTransfer.files[0]
          if (dropped) validate(dropped)
        }}
        className={`relative flex min-h-[245px] flex-col items-center justify-center rounded-[18px] border-2 border-dashed px-5 text-center transition ${
          dragging
            ? 'border-[#2b0a17] bg-[#e9f0f3]'
            : 'border-[#2b0a17]/30 bg-[#fffdf7]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.xlsx,.pptx,.txt,.png,.jpg,.jpeg"
          onChange={(e) => {
            const selected = e.target.files?.[0]
            if (selected) validate(selected)
            e.target.value = ''
          }}
        />

        {file ? (
          <div className="w-full max-w-sm">
            <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-[#f7d5c7] text-[#2b0a17]">
              <FileText size={30} />
            </div>

            <p className="truncate font-bold text-[#2b0a17]">
              {file.name}
            </p>

            <p className="mt-1 text-sm text-[#2b0a17]/60">
              {formatSize(file.size)} · {uploading ? 'Processing' : 'Ready to share'}
            </p>

            {uploading && (
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-center gap-2 text-xs font-bold">
                  <span className="size-2 animate-pulse rounded-full bg-[#ff9f7a]" />
                  {stage}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#2b0a17]/10">
                  <motion.div
                    className="h-full w-1/3 rounded-full bg-[#2b0a17]"
                    animate={{ x: ['0%', '200%', '0%'] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-center gap-3">
              {!uploading && (
                <>
                  <button
                    onClick={() => {
                      setFile(null)
                      setError('')
                    }}
                    className="flex items-center gap-1 text-sm font-bold text-[#2b0a17]/60 hover:text-[#2b0a17]"
                  >
                    <X size={15} /> Remove
                  </button>

                  <Button onClick={upload}>
                    Generate link <Link2 size={16} />
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-[#e9f0f3] text-[#2b0a17]">
              <Cloud size={30} />
            </div>

            <h3 className="text-xl font-black tracking-tight text-[#2b0a17]">
              Drop a document here
            </h3>

            <p className="mt-2 text-sm text-[#2b0a17]/60">
              or choose a file from your device
            </p>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-5 flex items-center gap-2 rounded-full bg-[#2b0a17] px-5 py-3 text-sm font-bold text-[#e9f0f3] hover:bg-[#14594e]"
            >
              <Upload size={16} /> Browse files
            </button>

            <p className="mt-4 text-[11px] font-medium text-[#2b0a17]/45">
              PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG · Max 50 MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-[#f7d6d0] px-4 py-3 text-sm font-bold text-[#9d413d]"
        >
          {error}
        </p>
      )}
    </div>
  )
}


function SuccessCard({ doc, onReset }: { doc: DocumentRecord; onReset: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => { await navigator.clipboard?.writeText(doc.url); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }
  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 rounded-[28px] border-2 border-[#2b0a17] bg-[#fffaf3] p-5 shadow-[7px_8px_0_#2b0a17] sm:p-7"><div className="mb-6 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-full bg-[#e9f0f3] text-[#2b0a17]"><Check size={22} strokeWidth={3} /></div><div className="min-w-0"><p className="font-black text-[#2b0a17]">Your link is ready</p><p className="truncate text-xs text-[#2b0a17]/55">Your document has been uploaded and verified.</p></div></div><div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_136px] sm:items-center"><div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#2b0a17]/15 bg-white p-3"><Link2 size={17} className="shrink-0 text-[#2b0a17]/50" /><span className="min-w-0 flex-1 truncate text-sm font-bold text-[#2b0a17]">{doc.url.replace(window.location.origin, 'crossdoc.app')}</span><button onClick={copy} aria-label="Copy share link" className="shrink-0 rounded-lg p-2 text-[#2b0a17] hover:bg-[#e9f0f3]">{copied ? <Check size={18} /> : <Copy size={18} />}</button></div><div className="mx-auto shrink-0 rounded-xl bg-white p-3"><QRCodeSVG value={doc.url} size={112} fgColor="#2b0a17" bgColor="#ffffff" /></div></div><div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#2b0a17]/10 pt-5 text-xs font-bold text-[#2b0a17]/60"><span className="flex items-center gap-2"><LockKeyhole size={15} /> Expires in 24 hours · one download</span><button onClick={onReset} className="font-black text-[#2b0a17] underline underline-offset-4">Share another</button></div></motion.div>
}

function Home() {
  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  return <div className="min-h-screen overflow-hidden bg-[#fffaf3] text-[#2b0a17]"><Header /><main><section className="relative mx-auto max-w-[1280px] px-3 pb-4 pt-3 sm:px-5 sm:pb-7 sm:pt-4 lg:px-8"><div className="rounded-[28px] bg-[#e9f0f3] px-4 pb-8 pt-9 text-center sm:rounded-[36px] sm:px-10 sm:pb-10 sm:pt-12 lg:pb-12 lg:pt-14"><div className="mx-auto max-w-5xl"><p className="mb-4 text-xs font-semibold italic tracking-[0.02em] text-[#7f5d66] sm:mb-5 sm:text-sm">Send it here. Open it there.</p><h1 className="text-[clamp(2.75rem,7vw,6.4rem)] font-black leading-[0.84] tracking-[-0.085em] text-[#2b0a17]">MOVE FILES<br />BETWEEN DEVICES<br /><span className="text-[#ff9f7a]">WITHOUT THE FUSS.</span></h1><p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#686868] sm:mt-6 sm:text-base">Upload a file, copy the link, and open it on your other device.</p><div className="mt-5 flex flex-row items-center justify-center gap-3 sm:mt-6"><Button onClick={() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' })}>Start sharing <ArrowRight size={16} /></Button><a href="#how-it-works" className="text-sm font-bold text-[#2b0a17] underline decoration-[#ff9f7a] decoration-2 underline-offset-4">How it works</a></div></div><div className="mx-auto mt-8 max-w-2xl text-left sm:mt-10"><AnimatePresence mode="wait">{doc ? <SuccessCard key="success" doc={doc} onReset={() => setDoc(null)} /> : <motion.div key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><UploadCard onUploaded={setDoc} /></motion.div>}</AnimatePresence></div></div></section><section id="how-it-works" className="border-y border-[#2b0a17]/15 bg-[#fffaf3] py-20"><div className="mx-auto max-w-6xl px-5 lg:px-8"><div className="max-w-xl"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#7f5d66]">How it works</p><h2 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Move a file in three simple steps.</h2><p className="mt-4 leading-7 text-[#2b0a17]/60">A focused workflow for sending a document from one device to another.</p></div><div className="mt-12 grid gap-5 md:grid-cols-3">{[{ n: '01', icon: Upload, title: 'Select a file', text: 'Choose a supported document from your device.' }, { n: '02', icon: Link2, title: 'Create a link', text: 'Generate a secure, one-time link and share it with the recipient.' }, { n: '03', icon: ArrowDownToLine, title: 'Download once', text: 'Open the link on another device and download the file.' }].map(({ n, icon: Icon, title, text }) => <div key={n} className="rounded-[22px] border-2 border-[#2b0a17]/15 p-6"><div className="flex items-center justify-between"><div className="grid size-11 place-items-center rounded-xl bg-[#e9f0f3]"><Icon size={21} /></div><span className="text-sm font-black text-[#2b0a17]/35">{n}</span></div><h3 className="mt-7 text-xl font-black">{title}</h3><p className="mt-2 leading-7 text-[#2b0a17]/60">{text}</p></div>)}</div></div></section><section id="features" className="bg-[#2b0a17] py-20 text-[#fffaf3]"><div className="mx-auto max-w-6xl px-5 lg:px-8"><div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#f7d5c7]">Made to disappear</p><h2 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Simple by design. Private by default.</h2></div><div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">{[{ icon: Zap, title: 'No account required', text: 'Start a transfer without creating or managing an account.' }, { icon: MousePointer2, title: 'One-time sharing', text: 'Each link is designed for a single successful download claim.' }, { icon: QrCode, title: 'Scan to transfer', text: 'Use the QR code to open the share link on another device.' }, { icon: ShieldCheck, title: 'Auto-expiring links', text: 'Shared files are temporary and cleaned up after they expire.' }].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4 border-t border-[#e9f0f3]/20 pt-5"><Icon className="shrink-0 text-[#e9f0f3]" size={22} /><div><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#fffaf3]/55">{text}</p></div></div>)}</div></div></div></section><section id="privacy" className="bg-[#f7d5c7] py-20"><div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 lg:flex-row lg:items-end lg:justify-between lg:px-8"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2b0a17]/55">A note on privacy</p><h2 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Your documents are meant to be temporary.</h2>  <p className="mt-5 max-w-xl leading-7 text-[#2b0a17]/70">CrossDoc does not require an account. Files are stored privately, share tokens are protected with hashes, and downloads use time-limited signed URLs. Links expire and files are cleaned up automatically, although deletion may be delayed by scheduled cleanup.</p></div><div className="flex items-center gap-3 text-sm font-black"><ShieldCheck size={22} /> Built for less lingering.</div></div></section><section id="faq" className="bg-[#fffaf3] py-16 sm:py-20"><div className="mx-auto max-w-3xl px-5 lg:px-8"><div className="mb-8"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#7f5d66]">Quick answers</p><h2 className="mt-3 text-4xl tracking-[-0.05em] sm:text-5xl">A few things you might wonder.</h2></div><div className="divide-y divide-[#2b0a17]/10 border-y border-[#2b0a17]/10">{[{ q: 'Do I need an account?', a: 'No. Upload a file and share the link without signing up.' }, { q: 'What files can I share?', a: 'PDF, DOCX, XLSX, PPTX, TXT, PNG, and JPG files up to 50 MB.' }, { q: 'How long does a link work?', a: 'Links expire after 24 hours and are designed for one download.' }, { q: 'Is my file kept forever?', a: 'No. CrossDoc is built for temporary transfers, not permanent storage.' }].map((item) => <details key={item.q} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-bold marker:content-none"><span>{item.q}</span><span className="text-2xl font-normal text-[#ff9f7a] transition group-open:rotate-45">+</span></summary><p className="max-w-2xl pt-3 text-sm leading-6 text-[#686868]">{item.a}</p></details>)}</div></div></section></main><footer className="bg-[#fffaf3] px-5 py-8 lg:px-8"><div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><Logo /><div className="flex flex-wrap gap-5 text-sm font-bold text-[#2b0a17]/60"><a href="https://github.com/jominbinny" target="_blank" rel="noreferrer">GitHub</a><a href="https://forms.gle/4ZEYvxu5wyG9VQ5f8" target="_blank" rel="noreferrer">Feedback</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:crossdoc.support@gmail.com">Contact</a></div><p className="text-xs text-[#2b0a17]/45">Created with <span aria-label="love" role="img">♥</span> by <a href="https://jomin.dev" target="_blank" rel="noreferrer" className="text-[#2b0a17]">Jomin Binny</a></p></div></footer></div>
}

export function DownloadPage({ token }: { token: string }) {
  const [state, setState] = useState<
    'ready' | 'downloading' | 'claimed' | 'expired' | 'invalid' | 'error'
  >('ready')

  const [errorMessage, setErrorMessage] = useState('')

  const download = async () => {
    if (state !== 'ready') return

    setState('downloading')
    setErrorMessage('')

    try {
      // 1. Claim the document. This is a one-time operation.
      const { data, error } = await supabase.functions.invoke(
        'claim-download',
        {
          body: { token },
        }
      )

      if (error) {
        const response = error.context as Response | undefined
        const status = response?.status

        let message = error.message || 'Unable to access this document.'

        try {
          const errorData = await response?.clone().json()
          message = errorData?.error || message
        } catch {
          // Use the default error message.
        }

        if (status === 409) {
          setState('claimed')
          setErrorMessage(message)
          return
        }

        if (status === 410) {
          setState('expired')
          setErrorMessage(message)
          return
        }

        if (status === 404) {
          setState('invalid')
          setErrorMessage(message)
          return
        }

        throw new Error(message)
      }

      if (!data?.signedDownloadUrl || !data?.filename) {
        throw new Error('Invalid download response from the server.')
      }

      // The document is now claimed. Do not attempt another claim.
      const filename = data.filename

      // 2. Retrieve the actual file using its signed download URL.
      const response = await fetch(data.signedDownloadUrl)

      if (!response.ok) {
        throw new Error(
          'Your download was claimed, but the file could not be retrieved. This link cannot be claimed again.'
        )
      }

      const blob = await response.blob()

      // 3. Trigger the browser download.
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')

      anchor.href = objectUrl
      anchor.download = filename

      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 60_000)

      setState('claimed')
    } catch (err) {
      console.error('CrossDoc download error:', err)

      setState('error')
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Something went wrong while downloading.'
      )
    }
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes < 0) return 'Unknown size'

    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const isUnavailable = ['claimed', 'expired', 'invalid'].includes(state)

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f1f4ef] px-5 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-12 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-[28px] border-2 border-[#2b0a17] bg-[#fffaf3] p-7 text-center shadow-[7px_8px_0_#2b0a17] sm:p-10">

          {state === 'ready' || state === 'downloading' ? (
            <>
              <div className="mx-auto grid size-20 place-items-center rounded-[22px] bg-[#f7d5c7] text-[#2b0a17]">
                <FileText size={38} />
              </div>

              <p className="mt-7 text-xs font-black uppercase tracking-[0.16em] text-[#2b0a17]/45">
                A document for you
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-[-0.05em]">
                Your file is ready
              </h1>

              <p className="mx-auto mt-3 max-w-sm leading-7 text-[#2b0a17]/60">
                Someone has shared a document with you through CrossDoc.
                Download it before the link expires.
              </p>

              <div className="my-8 grid gap-3 border-y border-[#2b0a17]/10 py-5 text-left text-sm">
                <div className="flex justify-between">
                  <span className="text-[#2b0a17]/55">Link validity</span>
                  <b>24 hours</b>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#2b0a17]/55">Access</span>
                  <b className="flex items-center gap-1">
                    <LockKeyhole size={14} />
                    One-time download
                  </b>
                </div>
              </div>

              <Button onClick={download} disabled={state === 'downloading'}>
                {state === 'downloading' ? (
                  <>Preparing download...</>
                ) : (
                  <>
                    Download document
                    <ArrowDownToLine size={17} />
                  </>
                )}
              </Button>

              <p className="mt-5 text-xs text-[#2b0a17]/45">
                Downloading this document will consume its one-time link.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-[#e9f0f3] text-[#2b0a17]">
                {state === 'claimed' ? (
                  <Check size={38} />
                ) : (
                  <LockKeyhole size={38} />
                )}
              </div>

              <h1 className="mt-7 text-3xl font-black tracking-[-0.05em]">
                {state === 'claimed' && 'Link already used'}
                {state === 'expired' && 'Link expired'}
                {state === 'invalid' && 'Invalid link'}
                {state === 'error' && 'Download failed'}
              </h1>

              <p className="mx-auto mt-3 max-w-sm leading-7 text-[#2b0a17]/60">
                {errorMessage ||
                  (state === 'claimed'
                    ? 'This document has already been claimed. It cannot be downloaded again.'
                    : state === 'expired'
                      ? 'This sharing link has expired.'
                      : state === 'invalid'
                        ? 'This sharing link is invalid or does not exist.'
                        : 'Something went wrong.')}
              </p>

              {state === 'claimed' && (
                <p className="mt-5 text-xs text-[#2b0a17]/45">
                  CrossDoc allows only one download claim per document.
                </p>
              )}

              <a
                href="/"
                className="mt-8 inline-flex items-center gap-2 font-black underline underline-offset-4"
              >
                Share another document
                <ArrowRight size={16} />
              </a>
            </>
          )}
        </div>

        <p className="mt-8 text-center text-xs font-bold text-[#2b0a17]/45">
          CrossDoc · Upload. Share. Download. Gone.
        </p>
      </div>
    </div>
  )
}

export default function Page() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'
  const token = path.startsWith('/s/') ? path.split('/')[2] : ''
  return token ? <DownloadPage token={token} /> : <Home />
}
