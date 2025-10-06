/**
 * XML format detection for e-invoices
 */

import { XMLParser } from 'fast-xml-parser';
import type { InvoiceFormat } from '@e-rechnung/core';

export class FormatDetector {
    private parser: XMLParser;

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            parseAttributeValue: true,
        });
    }

    async detectFormat(xml: Buffer): Promise<InvoiceFormat> {
        try {
            const xmlString = xml.toString('utf-8');
            const parsed = this.parser.parse(xmlString);

            // Check for XRechnung UBL
            if (this.isXRechnungUbl(parsed)) {
                return 'xrechnung_ubl';
            }

            // Check for XRechnung CII
            if (this.isXRechnungCii(parsed)) {
                return 'xrechnung_cii';
            }

            // Check for ZUGFeRD CII
            if (this.isZugferdCii(parsed)) {
                return 'zugferd_cii';
            }

            // Check for Factur-X
            if (this.isFacturX(parsed)) {
                return 'facturx';
            }

            return 'unknown';
        } catch (error) {
            console.warn('Failed to parse XML for format detection:', error);
            return 'unknown';
        }
    }

    private isXRechnungUbl(parsed: any): boolean {
        // Check for UBL Invoice structure
        if (parsed.Invoice && parsed.Invoice['@_xmlns']?.includes('urn:oasis:names:specification:ubl:schema:xsd:Invoice')) {
            return true;
        }

        // Check for CustomizationID indicating XRechnung
        if (parsed.Invoice?.CustomizationID) {
            const customizationId = parsed.Invoice.CustomizationID;
            return customizationId.includes('xrechnung') || customizationId.includes('XRechnung');
        }

        return false;
    }

    private isXRechnungCii(parsed: any): boolean {
        // Check for CII structure
        if (parsed['rsm:CrossIndustryInvoice'] || parsed.CrossIndustryInvoice) {
            const invoice = parsed['rsm:CrossIndustryInvoice'] || parsed.CrossIndustryInvoice;

            // Check for XRechnung-specific context
            if (invoice['rsm:ExchangedDocumentContext'] || invoice.ExchangedDocumentContext) {
                const context = invoice['rsm:ExchangedDocumentContext'] || invoice.ExchangedDocumentContext;
                const guideline = context['ram:GuidelineSpecifiedDocumentContextParameter'] || context.GuidelineSpecifiedDocumentContextParameter;

                if (guideline && guideline['ram:ID']) {
                    const id = guideline['ram:ID'];
                    return id.includes('xrechnung') || id.includes('XRechnung');
                }
            }
        }

        return false;
    }

    private isZugferdCii(parsed: any): boolean {
        // Check for ZUGFeRD CII structure
        if (parsed['rsm:CrossIndustryInvoice'] || parsed.CrossIndustryInvoice) {
            const invoice = parsed['rsm:CrossIndustryInvoice'] || parsed.CrossIndustryInvoice;

            // Check for ZUGFeRD-specific context
            if (invoice['rsm:ExchangedDocumentContext'] || invoice.ExchangedDocumentContext) {
                const context = invoice['rsm:ExchangedDocumentContext'] || invoice.ExchangedDocumentContext;
                const guideline = context['ram:GuidelineSpecifiedDocumentContextParameter'] || context.GuidelineSpecifiedDocumentContextParameter;

                if (guideline && guideline['ram:ID']) {
                    const id = guideline['ram:ID'];
                    return id.includes('zugferd') || id.includes('ZUGFeRD') || id.includes('BASIC') || id.includes('EN16931');
                }
            }
        }

        return false;
    }

    private isFacturX(parsed: any): boolean {
        // Check for Factur-X structure (similar to ZUGFeRD but French)
        if (parsed['rsm:CrossIndustryInvoice'] || parsed.CrossIndustryInvoice) {
            const invoice = parsed['rsm:CrossIndustryInvoice'] || parsed.CrossIndustryInvoice;

            // Check for Factur-X-specific context
            if (invoice['rsm:ExchangedDocumentContext'] || invoice.ExchangedDocumentContext) {
                const context = invoice['rsm:ExchangedDocumentContext'] || invoice.ExchangedDocumentContext;
                const guideline = context['ram:GuidelineSpecifiedDocumentContextParameter'] || context.GuidelineSpecifiedDocumentContextParameter;

                if (guideline && guideline['ram:ID']) {
                    const id = guideline['ram:ID'];
                    return id.includes('factur-x') || id.includes('Factur-X');
                }
            }
        }

        return false;
    }
}
