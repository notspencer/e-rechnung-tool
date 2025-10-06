/**
 * XRechnung CII parser implementation
 */

import { XMLParser } from 'fast-xml-parser';
import type { ParsedInvoice } from '@e-rechnung/core';

export class XRechnungCiiParser {
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
        const invoice = parsed['rsm:CrossIndustryInvoice'] || parsed.CrossIndustryInvoice;

        if (!invoice) {
            throw new Error('Invalid CII CrossIndustryInvoice structure');
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
        const exchangedDoc = invoice['rsm:ExchangedDocument'] || invoice.ExchangedDocument;
        return exchangedDoc?.['ram:ID'] || '';
    }

    private extractIssueDate(invoice: any): string {
        const exchangedDoc = invoice['rsm:ExchangedDocument'] || invoice.ExchangedDocument;
        const issueDateTime = exchangedDoc?.['ram:IssueDateTime'];

        if (issueDateTime) {
            // Extract date part from datetime
            return issueDateTime['ram:DateTimeString']?.split('T')[0] || '';
        }

        return '';
    }

    private extractCurrency(invoice: any): string {
        const headerTradeAgreement = invoice['rsm:SupplyChainTradeTransaction']?.['ram:ApplicableHeaderTradeAgreement'];
        return headerTradeAgreement?.['ram:InvoiceCurrencyCode'] || 'EUR';
    }

    private extractSeller(invoice: any): ParsedInvoice['seller'] {
        const headerTradeAgreement = invoice['rsm:SupplyChainTradeTransaction']?.['ram:ApplicableHeaderTradeAgreement'];
        const sellerTradeParty = headerTradeAgreement?.['ram:SellerTradeParty'];

        if (!sellerTradeParty) {
            throw new Error('Missing SellerTradeParty');
        }

        return {
            name: sellerTradeParty['ram:Name'] || '',
            vatId: sellerTradeParty['ram:SpecifiedTaxRegistration']?.['ram:ID'],
            address: {
                country: sellerTradeParty['ram:PostalTradeAddress']?.['ram:CountryID'] || '',
                city: sellerTradeParty['ram:PostalTradeAddress']?.['ram:CityName'],
                postalCode: sellerTradeParty['ram:PostalTradeAddress']?.['ram:PostcodeCode'],
                street: sellerTradeParty['ram:PostalTradeAddress']?.['ram:LineOne'],
            },
            contact: {
                email: sellerTradeParty['ram:DefinedTradeContact']?.['ram:EmailAddressURI'],
                phone: sellerTradeParty['ram:DefinedTradeContact']?.['ram:TelephoneUniversalCommunication']?.['ram:CompleteNumber'],
            },
        };
    }

    private extractBuyer(invoice: any): ParsedInvoice['buyer'] {
        const headerTradeAgreement = invoice['rsm:SupplyChainTradeTransaction']?.['ram:ApplicableHeaderTradeAgreement'];
        const buyerTradeParty = headerTradeAgreement?.['ram:BuyerTradeParty'];

        if (!buyerTradeParty) {
            throw new Error('Missing BuyerTradeParty');
        }

        return {
            name: buyerTradeParty['ram:Name'] || '',
            vatId: buyerTradeParty['ram:SpecifiedTaxRegistration']?.['ram:ID'],
            address: {
                country: buyerTradeParty['ram:PostalTradeAddress']?.['ram:CountryID'] || '',
                city: buyerTradeParty['ram:PostalTradeAddress']?.['ram:CityName'],
                postalCode: buyerTradeParty['ram:PostalTradeAddress']?.['ram:PostcodeCode'],
                street: buyerTradeParty['ram:PostalTradeAddress']?.['ram:LineOne'],
            },
            contact: {
                email: buyerTradeParty['ram:DefinedTradeContact']?.['ram:EmailAddressURI'],
                phone: buyerTradeParty['ram:DefinedTradeContact']?.['ram:TelephoneUniversalCommunication']?.['ram:CompleteNumber'],
            },
        };
    }

    private extractTotals(invoice: any): ParsedInvoice['totals'] {
        const headerTradeSettlement = invoice['rsm:SupplyChainTradeTransaction']?.['ram:ApplicableHeaderTradeSettlement'];
        const monetarySummation = headerTradeSettlement?.['ram:SpecifiedTradeSettlementHeaderMonetarySummation'];

        if (!monetarySummation) {
            throw new Error('Missing SpecifiedTradeSettlementHeaderMonetarySummation');
        }

        const netAmount = parseFloat(monetarySummation['ram:TaxBasisTotalAmount'] || '0');
        const taxAmount = parseFloat(monetarySummation['ram:TaxTotalAmount'] || '0');
        const grossAmount = parseFloat(monetarySummation['ram:GrandTotalAmount'] || '0');

        return {
            net: netAmount,
            tax: taxAmount,
            gross: grossAmount,
        };
    }

    private extractLineItems(invoice: any): ParsedInvoice['lineItems'] {
        const supplyChainTradeTransaction = invoice['rsm:SupplyChainTradeTransaction'];
        const includedSupplyChainTradeLineItems = supplyChainTradeTransaction?.['ram:IncludedSupplyChainTradeLineItem'] || [];

        return includedSupplyChainTradeLineItems.map((line: any, index: number) => {
            const specifiedTradeProduct = line['ram:SpecifiedTradeProduct'];
            const netPriceProductTradePrice = line['ram:NetPriceProductTradePrice'];
            const billedQuantity = line['ram:BilledQuantity'];

            return {
                id: (index + 1).toString(),
                description: specifiedTradeProduct?.['ram:Name'] || '',
                quantity: parseFloat(billedQuantity?.['ram:Value'] || '0'),
                unit: billedQuantity?.['@_unitCode'] || 'C62',
                unitPrice: parseFloat(netPriceProductTradePrice?.['ram:ChargeAmount'] || '0'),
                netAmount: parseFloat(line['ram:LineTotalAmount'] || '0'),
                taxRate: this.extractTaxRate(line),
                taxAmount: this.extractTaxAmount(line),
            };
        });
    }

    private extractTaxRate(line: any): number {
        const applicableTradeTax = line['ram:ApplicableTradeTax'];
        if (applicableTradeTax) {
            return parseFloat(applicableTradeTax['ram:RateApplicablePercent'] || '0');
        }
        return 0;
    }

    private extractTaxAmount(line: any): number {
        const applicableTradeTax = line['ram:ApplicableTradeTax'];
        if (applicableTradeTax) {
            return parseFloat(applicableTradeTax['ram:CalculatedAmount'] || '0');
        }
        return 0;
    }

    private extractPaymentTerms(invoice: any): ParsedInvoice['paymentTerms'] {
        const headerTradeSettlement = invoice['rsm:SupplyChainTradeTransaction']?.['ram:ApplicableHeaderTradeSettlement'];
        const specifiedTradePaymentTerms = headerTradeSettlement?.['ram:SpecifiedTradePaymentTerms'];

        if (!specifiedTradePaymentTerms) {
            return undefined;
        }

        return {
            dueDate: specifiedTradePaymentTerms['ram:DueDateDateTime']?.['ram:DateTimeString']?.split('T')[0],
            paymentMeans: {
                iban: specifiedTradePaymentTerms['ram:DirectDebitMandateID'],
                bic: undefined, // Not commonly found in CII
                accountHolder: undefined,
            },
            terms: specifiedTradePaymentTerms['ram:Description'],
        };
    }

    private extractReferences(invoice: any): ParsedInvoice['references'] {
        const headerTradeAgreement = invoice['rsm:SupplyChainTradeTransaction']?.['ram:ApplicableHeaderTradeAgreement'];
        const buyerOrderReferencedDocument = headerTradeAgreement?.['ram:BuyerOrderReferencedDocument'];

        return {
            purchaseOrder: buyerOrderReferencedDocument?.['ram:IssuerAssignedID'],
            contract: undefined, // Not commonly found in CII
        };
    }
}
