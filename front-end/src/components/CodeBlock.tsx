interface CodeBlockProps {
  children: string
  language?: string
}

export function CodeBlock({ children, language }: CodeBlockProps) {
  return (
    <div className="my-5 overflow-hidden rounded-xl border border-white/8 bg-[#0f0f0f] shadow-xl shadow-black/20">
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>
        {language && (
          <span className="font-mono text-[11px] font-medium text-white/25 uppercase tracking-wider">
            {language}
          </span>
        )}
      </div>
      <pre className="overflow-x-auto p-5">
        <code className="font-mono text-[13px] leading-relaxed text-slate-200">
          {children.trim()}
        </code>
      </pre>
    </div>
  )
}
