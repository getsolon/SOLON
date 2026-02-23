import { useMemo } from 'react'
import CodeBlock from './CodeBlock'

interface MarkdownRendererProps {
  content: string
}

interface Block {
  type: 'text' | 'code'
  content: string
  language?: string
}

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = []
  const regex = /```(\w*)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    blocks.push({ type: 'code', content: match[2].trimEnd(), language: match[1] || undefined })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < content.length) {
    blocks.push({ type: 'text', content: content.slice(lastIndex) })
  }

  return blocks
}

function renderInlineMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--text-link)] underline">$1</a>')
}

function renderTextBlock(text: string): string {
  const lines = text.split('\n')
  let html = ''
  let inList = false
  let inOrderedList = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Headings
    if (trimmed.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false }
      html += `<h3 class="text-base font-semibold mt-4 mb-2">${renderInlineMarkdown(trimmed.slice(4))}</h3>`
      continue
    }
    if (trimmed.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false }
      html += `<h2 class="text-lg font-semibold mt-4 mb-2">${renderInlineMarkdown(trimmed.slice(3))}</h2>`
      continue
    }
    if (trimmed.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false }
      html += `<h1 class="text-xl font-bold mt-4 mb-2">${renderInlineMarkdown(trimmed.slice(2))}</h1>`
      continue
    }

    // Unordered list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (inOrderedList) { html += '</ol>'; inOrderedList = false }
      if (!inList) { html += '<ul class="list-disc pl-5 my-2 space-y-1">'; inList = true }
      html += `<li>${renderInlineMarkdown(trimmed.slice(2))}</li>`
      continue
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)\.\s(.+)/)
    if (olMatch) {
      if (inList) { html += '</ul>'; inList = false }
      if (!inOrderedList) { html += '<ol class="list-decimal pl-5 my-2 space-y-1">'; inOrderedList = true }
      html += `<li>${renderInlineMarkdown(olMatch[2])}</li>`
      continue
    }

    // Close lists
    if (inList) { html += '</ul>'; inList = false }
    if (inOrderedList) { html += '</ol>'; inOrderedList = false }

    // Empty line → paragraph break
    if (!trimmed) {
      html += '<div class="h-3"></div>'
      continue
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      html += '<hr class="my-4 border-[var(--border)]" />'
      continue
    }

    // Regular paragraph
    html += `<p class="my-1">${renderInlineMarkdown(trimmed)}</p>`
  }

  if (inList) html += '</ul>'
  if (inOrderedList) html += '</ol>'

  return html
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const blocks = useMemo(() => parseBlocks(content), [content])

  return (
    <div className="prose-chat">
      {blocks.map((block, i) =>
        block.type === 'code' ? (
          <CodeBlock key={i} code={block.content} language={block.language} />
        ) : (
          <div key={i} dangerouslySetInnerHTML={{ __html: renderTextBlock(block.content) }} />
        )
      )}
    </div>
  )
}
