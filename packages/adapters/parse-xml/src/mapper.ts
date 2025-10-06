/**
 * Map parsed data to domain model
 */

import type { ParsedInvoice, InvoiceFormat } from '@e-rechnung/core';
import { XRechnungUblParser } from './parsers/xrechnung-ubl.parser.js';
import { XRechnungCiiParser } from './parsers/xrechnung-cii.parser.js';

export class InvoiceMapper {
    private ublParser = new XRechnungUblParser();
    private ciiParser = new XRechnungCiiParser();

    async mapToDomain(xml: Buffer, format: InvoiceFormat): Promise<ParsedInvoice> {
        switch (format) {
            case 'xrechnung_ubl':
                return this.ublParser.parse(xml);

            case 'xrechnung_cii':
                return this.ciiParser.parse(xml);

            case 'zugferd_cii':
                // ZUGFeRD uses CII format, so we can reuse the CII parser
                return this.ciiParser.parse(xml);

            case 'facturx':
                // Factur-X uses CII format, so we can reuse the CII parser
                return this.ciiParser.parse(xml);

            default:
                throw new Error(`Unsupported invoice format: ${format}`);
        }
    }
}
