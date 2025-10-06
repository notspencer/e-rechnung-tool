/**
 * Invoice parser interface for XML format detection and parsing
 */

import type { InvoiceFormat, ParsedInvoice } from './invoice.js';

export interface InvoiceParser {
    /**
     * Detect format from XML content
     */
    detectFormat(xml: Buffer): Promise<InvoiceFormat>;

    /**
     * Parse XML to domain model
     */
    parse(xml: Buffer, format: InvoiceFormat): Promise<ParsedInvoice>;
}

export interface ParsingResult {
    format: InvoiceFormat;
    invoice: ParsedInvoice;
    confidence: number; // 0-1, how confident we are in the parsing
}
