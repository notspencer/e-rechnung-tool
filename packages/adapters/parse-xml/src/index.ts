/**
 * XML format detection and parsing for e-invoices
 */

import type { InvoiceParser, ParsedInvoice, InvoiceFormat } from '@e-rechnung/core';
import { FormatDetector } from './detector/format-detector.js';
import { InvoiceMapper } from './mapper.js';

export class XmlInvoiceParser implements InvoiceParser {
    private formatDetector = new FormatDetector();
    private invoiceMapper = new InvoiceMapper();

    async detectFormat(xml: Buffer): Promise<InvoiceFormat> {
        return this.formatDetector.detectFormat(xml);
    }

    async parse(xml: Buffer, format: InvoiceFormat): Promise<ParsedInvoice> {
        return this.invoiceMapper.mapToDomain(xml, format);
    }
}

// Default export
export const xmlInvoiceParser = new XmlInvoiceParser();

// Export individual components
export * from './detector/format-detector.js';
export * from './parsers/index.js';
export * from './mapper.js';
