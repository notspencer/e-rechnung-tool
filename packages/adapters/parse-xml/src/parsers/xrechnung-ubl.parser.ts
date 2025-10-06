/**
 * XRechnung UBL parser implementation
 */

import { XMLParser } from 'fast-xml-parser';
import type { ParsedInvoice } from '@e-rechnung/core';

export class XRechnungUblParser {
    private parser: XMLParser;

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            parseAttributeValue: true,
            parseTagValue: true,
            trimValues: true,
        });
    }

    async parse(xml: Buffer): Promise<ParsedInvoice> {
        const xmlString = xml.toString('utf-8');
        const parsed = this.parser.parse(xmlString);
        const invoice = parsed.Invoice;

        if (!invoice) {
            throw new Error('Invalid UBL Invoice structure');
        }

        return {
            invoiceNumber: this.extractInvoiceNumber(invoice),
            issueDate: this.extractIssueDate(invoice),
            currency: this.extractCurrency(invoice),
            seller: this.extractSeller(invoice),
            buyer: this.extractBuyer(invoice),
            totals: this.extractTotals(invoice),
            lineItems: this.extractLineItems(invoice),
            paymentTerms: this.extractPaymentTerms(invoice),
            references: this.extractReferences(invoice),
        };
    }

    private extractInvoiceNumber(invoice: any): string {
        return invoice.ID || '';
    }

    private extractIssueDate(invoice: any): string {
        return invoice.IssueDate || '';
    }

    private extractCurrency(invoice: any): string {
        return invoice.DocumentCurrencyCode || 'EUR';
    }

    private extractSeller(invoice: any): ParsedInvoice['seller'] {
        const supplierParty = invoice.AccountingSupplierParty?.Party;
        if (!supplierParty) {
            throw new Error('Missing AccountingSupplierParty');
        }

        return {
            name: supplierParty.PartyName?.Name || '',
            vatId: supplierParty.PartyTaxScheme?.[0]?.CompanyID,
            address: {
                country: supplierParty.PostalAddress?.CountryIdentificationCode || '',
                city: supplierParty.PostalAddress?.CityName,
                postalCode: supplierParty.PostalAddress?.PostalZone,
                street: supplierParty.PostalAddress?.StreetName,
            },
            contact: {
                email: supplierParty.Contact?.ElectronicMail,
                phone: supplierParty.Contact?.Telephone,
            },
        };
    }

    private extractBuyer(invoice: any): ParsedInvoice['buyer'] {
        const customerParty = invoice.AccountingCustomerParty?.Party;
        if (!customerParty) {
            throw new Error('Missing AccountingCustomerParty');
        }

        return {
            name: customerParty.PartyName?.Name || '',
            vatId: customerParty.PartyTaxScheme?.[0]?.CompanyID,
            address: {
                country: customerParty.PostalAddress?.CountryIdentificationCode || '',
                city: customerParty.PostalAddress?.CityName,
                postalCode: customerParty.PostalAddress?.PostalZone,
                street: customerParty.PostalAddress?.StreetName,
            },
            contact: {
                email: customerParty.Contact?.ElectronicMail,
                phone: customerParty.Contact?.Telephone,
            },
        };
    }

    private extractTotals(invoice: any): ParsedInvoice['totals'] {
        const legalMonetaryTotal = invoice.LegalMonetaryTotal;
        if (!legalMonetaryTotal) {
            throw new Error('Missing LegalMonetaryTotal');
        }

        return {
            net: parseFloat(legalMonetaryTotal.TaxExclusiveAmount || '0'),
            tax: parseFloat(legalMonetaryTotal.TaxInclusiveAmount || '0') - parseFloat(legalMonetaryTotal.TaxExclusiveAmount || '0'),
            gross: parseFloat(legalMonetaryTotal.PayableAmount || legalMonetaryTotal.TaxInclusiveAmount || '0'),
        };
    }

    private extractLineItems(invoice: any): ParsedInvoice['lineItems'] {
        const invoiceLines = invoice.InvoiceLine || [];
        const linesArray = Array.isArray(invoiceLines) ? invoiceLines : [invoiceLines];

        return linesArray.map((line: any, index: number) => {
            const item = line.Item;
            const price = line.Price;

            return {
                id: (index + 1).toString(),
                description: item?.Description || item?.Name || '',
                quantity: parseFloat(line.InvoicedQuantity || '0'),
                unit: line.InvoicedQuantity?.['@_unitCode'] || 'C62', // Default to "piece"
                unitPrice: parseFloat(price?.PriceAmount || '0'),
                netAmount: parseFloat(line.LineExtensionAmount || '0'),
                taxRate: this.extractTaxRate(line),
                taxAmount: this.extractTaxAmount(line),
            };
        });
    }

    private extractTaxRate(line: any): number {
        const taxTotal = line.TaxTotal;
        if (taxTotal && taxTotal.TaxSubtotal) {
            const taxSubtotal = Array.isArray(taxTotal.TaxSubtotal)
                ? taxTotal.TaxSubtotal[0]
                : taxTotal.TaxSubtotal;
            return parseFloat(taxSubtotal.Percent || '0');
        }
        return 0;
    }

    private extractTaxAmount(line: any): number {
        const taxTotal = line.TaxTotal;
        if (taxTotal) {
            return parseFloat(taxTotal.TaxAmount || '0');
        }
        return 0;
    }

    private extractPaymentTerms(invoice: any): ParsedInvoice['paymentTerms'] {
        const paymentMeans = invoice.PaymentMeans;
        if (!paymentMeans) {
            return undefined;
        }

        return {
            dueDate: invoice.PaymentTerms?.PaymentDueDate,
            paymentMeans: {
                iban: paymentMeans.PayeeFinancialAccount?.ID,
                bic: paymentMeans.PayeeFinancialAccount?.FinancialInstitutionBranch?.ID,
                accountHolder: paymentMeans.PayeeFinancialAccount?.Name,
            },
            terms: invoice.PaymentTerms?.Note,
        };
    }

    private extractReferences(invoice: any): ParsedInvoice['references'] {
        return {
            purchaseOrder: invoice.OrderReference?.ID,
            contract: invoice.ContractDocumentReference?.ID,
        };
    }
}
