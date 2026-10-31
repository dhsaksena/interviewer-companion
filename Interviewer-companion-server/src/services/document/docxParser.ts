import mammoth from 'mammoth'

export interface DocxParsingResult {
    text: string
    warnings: string[]
}

export class DocxParser {

    async parse(buffer: Buffer): Promise<DocxParsingResult> {

        if (!buffer || buffer.length === 0) {
            throw new Error('Word document is empty')
        }

        const result = await mammoth.extractRawText({ buffer })
        const text = result.value.trim()

        const warnings: string[] = []

        if (!text) {
            warnings.push('No text extracted from the Word document.')
        }

        return { text, warnings }
    }
}
