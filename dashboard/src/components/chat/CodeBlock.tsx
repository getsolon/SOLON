import { useEffect, useRef, useState } from 'react'

interface CodeBlockProps {
  code: string
  language?: string
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (codeRef.current) {
      import('highlight.js/lib/common').then(hljs => {
        if (codeRef.current) {
          hljs.default.highlightElement(codeRef.current)
        }
      })
    }
  }, [code])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative my-3 rounded-lg overflow-hidden bg-[#1e1e2e] text-[#cdd6f4]">
      <div className="flex items-center justify-between px-4 py-2 text-xs text-[#a6adc8] bg-[#181825]">
        <span>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#a6adc8] hover:text-[#cdd6f4]"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code ref={codeRef} className={language ? `language-${language}` : ''}>
          {code}
        </code>
      </pre>
    </div>
  )
}
