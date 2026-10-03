import { useRef, useEffect, useState } from 'react'
import '../styles/RichTextEditor.css'
import { MdFormatBold, MdFormatItalic, MdFormatUnderlined, MdFormatColorText, MdCode } from 'react-icons/md'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'

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

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML === '' && value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      console.log('RichTextEditor input:', html.substring(0, 50), '... length:', html.length)
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

  const insertCodeBlock = (language: string = 'javascript') => {
    const codeBlock = `<pre class="code-block" data-language="${language}"><code>${placeholder || ''}</code></pre>`
    document.execCommand('insertHTML', false, codeBlock)
    setShowLanguageSelector(false)
  }

  return (
    <div className="rich-editor-container">
      <div className="editor-toolbar">
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('bold')}
          title="Bold (Ctrl+B)"
          disabled={disabled}
        >
          <MdFormatBold />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('italic')}
          title="Italic (Ctrl+I)"
          disabled={disabled}
        >
          <MdFormatItalic />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('underline')}
          title="Underline (Ctrl+U)"
          disabled={disabled}
        >
          <MdFormatUnderlined />
        </button>

        <div className="toolbar-divider"></div>

        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('insertUnorderedList')}
          title="Bullet List"
          disabled={disabled}
        >
          • List
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('insertOrderedList')}
          title="Numbered List"
          disabled={disabled}
        >
          1. List
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
          onClick={() => applyFormat('removeFormat')}
          title="Clear Formatting"
          disabled={disabled}
        >
          Clear
        </button>
      </div>

      <div
        ref={editorRef}
        className="editor-content"
        contentEditable={!disabled}
        onInput={handleInput}
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
