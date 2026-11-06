import type { ReactNode } from 'react'

type LegalSection = {
  id: string
  title: string
  content: ReactNode
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string
  title: string
  intro: string
  updated: string
  sections: LegalSection[]
}) {
  return (
    <div className="min-h-screen bg-[#fffaf3] text-[#2b0a17]">
      <header className="border-b border-[#2b0a17]/10 px-5 py-5 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="text-[19px] font-black tracking-[-0.08em]" aria-label="CrossDoc home">
            <span className="italic">cross</span>
            <span className="text-[#ff9f7a]">doc</span>
          </a>
          <a href="/" className="text-sm font-bold underline decoration-[#ff9f7a] decoration-2 underline-offset-4">
            Back to home
          </a>
        </div>
      </header>

      <main className="px-5 py-12 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7f5d66]">{eyebrow}</p>
            <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl">{title}</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#2b0a17]/65">{intro}</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[#2b0a17]/45">
              Last updated: {updated}
            </p>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
            <aside className="h-fit rounded-2xl border-2 border-[#2b0a17]/15 bg-[#e9f0f3] p-5 lg:sticky lg:top-6">
              <h2 className="text-sm font-black uppercase tracking-[0.12em]">On this page</h2>
              <nav aria-label={`${title} sections`} className="mt-4">
                <ol className="grid gap-3 text-sm font-bold text-[#2b0a17]/65">
                  {sections.map((section, index) => (
                    <li key={section.id}>
                      <a href={`#${section.id}`} className="transition hover:text-[#2b0a17]">
                        {index + 1}. {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <article className="min-w-0 rounded-[28px] border-2 border-[#2b0a17]/15 bg-white/45 p-6 sm:p-10">
              <div className="grid gap-10">
                {sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-6">
                    <h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">{section.title}</h2>
                    <div className="mt-4 space-y-4 text-[15px] leading-7 text-[#2b0a17]/70">{section.content}</div>
                  </section>
                ))}
              </div>
            </article>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#2b0a17]/10 bg-[#fffaf3] px-5 py-8 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <a href="/" className="text-[19px] font-black tracking-[-0.08em]" aria-label="CrossDoc home">
            <span className="italic">cross</span>
            <span className="text-[#ff9f7a]">doc</span>
          </a>
          <nav aria-label="Legal navigation" className="flex gap-5 text-sm font-bold text-[#2b0a17]/60">
            <a href="/privacy" className="hover:text-[#2b0a17]">Privacy Policy</a>
            <a href="/terms" className="hover:text-[#2b0a17]">Terms of Service</a>
          </nav>
          <p className="text-xs text-[#2b0a17]/45">© 2026 CrossDoc</p>
        </div>
      </footer>
    </div>
  )
}
