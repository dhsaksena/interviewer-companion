export interface PdfParsingResult {
    text: string
    pages: {
        pageNumber: number
        text: string
    }[]
    totalPages: number
    warnings: string[]
}

export class PdfParser {

    async parse(buffer: Buffer): Promise<PdfParsingResult> {

        if (!buffer || buffer.length === 0) {
            throw new Error('PDF file is empty')
        }

        // Loaded on first use: pdfjs throws at import time on Node < 20.16,
        // which would otherwise stop the whole server from starting
        const { PDFParse } = await import('pdf-parse')
        const parser = new PDFParse({ data: buffer })

        try {
            const result = await parser.getText()

            const pages = result.pages.map(page => ({
                pageNumber: page.num,
                text: page.text.trim()
            }))

            const text = pages
                .map(page => page.text)
                .join('\n\n')

            const warnings: string[] = []

            if (!text.trim()) {
                warnings.push(
                    'No text extracted. PDF may contain scanned images and require OCR.'
                )
            }

            return {
                text,
                pages,
                totalPages: result.total,
                warnings
            }

        } finally {
            await parser.destroy()
        }
    }
}