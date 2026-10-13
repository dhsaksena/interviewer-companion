import { useRef, useEffect, useState } from 'react'
import '../styles/RichTextEditor.css'
import {
  MdFormatBold, MdFormatItalic, MdFormatUnderlined, MdFormatColorText, MdCode,
  MdFormatListBulleted, MdFormatListNumbered, MdFormatClear
} from 'react-icons/md'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

const LANGUAGES = ['javascript', 'python', 'java', 'sql', 'typescript', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby']

const RichTextEditor = ({ value, onChange, placeholder, disabled }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const [active, setActive] = useState<Record<string, boolean>>({})

  // Reflect the formatting at the caret on the toolbar buttons
  useEffect(() => {
    const COMMANDS = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList']
    const refresh = () => {
      const sel = window.getSelection()
      if (!sel || !sel.anchorNode || !editorRef.current?.contains(sel.anchorNode)) return
      const next: Record<string, boolean> = {}
      COMMANDS.forEach(cmd => { next[cmd] = document.queryCommandState(cmd) })
      setActive(next)
    }
    document.addEventListener('selectionchange', refresh)
    return () => document.removeEventListener('selectionchange', refresh)
  }, [])

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML === '' && value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      onChange(html)
    }
  }

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const applyFontColor = (color: string) => {
    document.execCommand('foreColor', false, color)
    setShowColorPicker(false)
  }

  // Inside a code block, Enter adds a newline; Enter on an empty last line exits the block.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return
    const node = sel.anchorNode
    const el = node && (node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement)
    const pre = el?.closest('pre')
    if (!pre || !editorRef.current?.contains(pre)) return

    e.preventDefault()
    const tail = document.createRange()
    tail.selectNodeContents(pre)
    tail.setStart(sel.anchorNode!, sel.anchorOffset)
    const atEnd = tail.toString() === ''
    const text = pre.textContent || ''

    if (atEnd && text.endsWith('\n')) {
      // Drop the extra blank line and move the caret after the block
      document.execCommand('delete')
      let next = pre.nextElementSibling
      if (!next) {
        next = document.createElement('p')
        next.innerHTML = '<br>'
        pre.after(next)
      }
      const range = document.createRange()
      range.setStart(next, 0)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    } else {
      document.execCommand('insertText', false, '\n')
    }
    handleInput()
  }

  const insertCodeBlock = (language: string = 'javascript') => {
    const codeBlock = `<pre class="code-block" data-language="${language}"><code>${placeholder || ''}</code></pre><p><br></p>`
    document.execCommand('insertHTML', false, codeBlock)
    setShowLanguageSelector(false)
  }

  return (
    <div className="rich-editor-container">
      <div className="editor-toolbar">
        <button
          type="button"
          className={`toolbar-btn ${active.bold ? 'active' : ''}`}
          onMouseDown={e => e.preventDefault()}
          onClick={() => applyFormat('bold')}
          title="Bold (Ctrl+B)"
          disabled={disabled}
        >
          <MdFormatBold />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${active.italic ? 'active' : ''}`}
          onMouseDown={e => e.preventDefault()}
          onClick={() => applyFormat('italic')}
          title="Italic (Ctrl+I)"
          disabled={disabled}
        >
          <MdFormatItalic />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${active.underline ? 'active' : ''}`}
          onMouseDown={e => e.preventDefault()}
          onClick={() => applyFormat('underline')}
          title="Underline (Ctrl+U)"
          disabled={disabled}
        >
          <MdFormatUnderlined />
        </button>

        <div className="toolbar-divider"></div>

        <button
          type="button"
          className={`toolbar-btn ${active.insertUnorderedList ? 'active' : ''}`}
          onMouseDown={e => e.preventDefault()}
          onClick={() => applyFormat('insertUnorderedList')}
          title="Bullet list"
          disabled={disabled}
        >
          <MdFormatListBulleted />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${active.insertOrderedList ? 'active' : ''}`}
          onMouseDown={e => e.preventDefault()}
          onClick={() => applyFormat('insertOrderedList')}
          title="Numbered list"
          disabled={disabled}
        >
          <MdFormatListNumbered />
        </button>

        <div className="toolbar-divider"></div>

        <div className="color-picker-wrapper">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Font Color"
            disabled={disabled}
          >
            <MdFormatColorText />
          </button>
          {showColorPicker && (
            <div className="color-picker-popup">
              <input
                ref={colorInputRef}
                type="color"
                onChange={(e) => applyFontColor(e.target.value)}
                defaultValue="#000000"
              />
              <div className="color-swatches">
                {['#000000', '#FF0000', '#00AA00', '#0000FF', '#FFAA00', '#FF00FF'].map(color => (
                  <button
                    key={color}
                    type="button"
                    className="color-swatch"
                    style={{ backgroundColor: color }}
                    onClick={() => applyFontColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="toolbar-divider"></div>

        <div className="code-selector-wrapper">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
            title="Insert Code Block"
            disabled={disabled}
          >
            <MdCode /> Code
          </button>
          {showLanguageSelector && (
            <div className="language-selector-popup">
              {LANGUAGES.map(lang => (
                <button
                  type="button"
                  key={lang}
                  className="language-option"
                  onClick={() => insertCodeBlock(lang)}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="toolbar-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={() => applyFormat('removeFormat')}
          title="Clear formatting"
          disabled={disabled}
        >
          <MdFormatClear />
        </button>
      </div>

      <div
        ref={editorRef}
        className="editor-content"
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        suppressContentEditableWarning
        data-placeholder={placeholder || 'Start typing...'}
        style={{ textAlign: 'left' }}
      />
    </div>
  )
}

function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
  e.preventDefault()

  const html = e.clipboardData?.getData('text/html')
  const text = e.clipboardData?.getData('text/plain')

  // If HTML is available, use it (preserves formatting from ChatGPT, Google Docs, etc.)
  if (html && html.trim()) {
    // Clean up HTML while preserving structure
    const cleanHtml = cleanPastedHtml(html)
    document.execCommand('insertHTML', false, cleanHtml)
  } else if (text && text.trim()) {
    // Fallback to plain text
    document.execCommand('insertText', false, text)
  }
}

function cleanPastedHtml(html: string): string {
  // Create a temporary container to parse HTML
  const temp = document.createElement('div')
  temp.innerHTML = html

  // Remove only truly dangerous elements
  const dangerousTags = ['script', 'style', 'iframe', 'meta', 'link', 'noscript', 'form', 'input', 'button', 'textarea', 'select']

  const removeDangerousElements = (node: Element) => {
    const nodesToRemove: Node[] = []

    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i]

      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element
        const tagName = element.tagName.toLowerCase()

        // Remove dangerous tags
        if (dangerousTags.includes(tagName)) {
          nodesToRemove.push(child)
        } else {
          // Recursively clean child elements
          removeDangerousElements(element)

          // Remove dangerous event handlers and protocols
          const attributes = Array.from(element.attributes)
          attributes.forEach(attr => {
            const attrName = attr.name.toLowerCase()
            const attrValue = attr.value.toLowerCase()

            // Remove event handlers
            if (attrName.startsWith('on')) {
              element.removeAttribute(attr.name)
            }
            // Remove dangerous protocols
            else if (attrValue.includes('javascript:') || attrValue.includes('data:text/html')) {
              element.removeAttribute(attr.name)
            }
          })
        }
      }
    }

    // Remove collected nodes
    nodesToRemove.forEach(node => node.parentNode?.removeChild(node))
  }

  removeDangerousElements(temp)

  // Get the cleaned HTML - preserve all formatting and structure
  let result = temp.innerHTML

  // Only remove script tags completely
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  return result
}

export default RichTextEditor
