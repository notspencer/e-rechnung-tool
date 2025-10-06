/**
 * Tests for format detector
 */

import { describe, it, expect } from 'vitest';
import { FormatDetector } from './format-detector.js';

describe('FormatDetector', () => {
    const detector = new FormatDetector();

    it('should detect XRechnung UBL format', async () => {
        const xrechnungUblXml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>INV-2024-001</cbc:ID>
  <cbc:IssueDate>2024-01-01</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_2.3</cbc:CustomizationID>
</Invoice>`;

        const format = await detector.detectFormat(Buffer.from(xrechnungUblXml));
        expect(format).toBe('xrechnung_ubl');
    });

    it('should detect XRechnung CII format', async () => {
        const xrechnungCiiXml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                          xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_2.3</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>INV-2024-001</ram:ID>
  </rsm:ExchangedDocument>
</rsm:CrossIndustryInvoice>`;

        const format = await detector.detectFormat(Buffer.from(xrechnungCiiXml));
        expect(format).toBe('xrechnung_cii');
    });

    it('should detect ZUGFeRD CII format', async () => {
        const zugferdCiiXml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                          xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:zugferd.de:2p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>INV-2024-001</ram:ID>
  </rsm:ExchangedDocument>
</rsm:CrossIndustryInvoice>`;

        const format = await detector.detectFormat(Buffer.from(zugferdCiiXml));
        expect(format).toBe('zugferd_cii');
    });

    it('should detect Factur-X CII format', async () => {
        const facturxCiiXml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                          xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>INV-2024-001</ram:ID>
  </rsm:ExchangedDocument>
</rsm:CrossIndustryInvoice>`;

        const format = await detector.detectFormat(Buffer.from(facturxCiiXml));
        expect(format).toBe('facturx');
    });

    it('should return unknown for invalid XML', async () => {
        const invalidXml = 'This is not valid XML';
        const format = await detector.detectFormat(Buffer.from(invalidXml));
        expect(format).toBe('unknown');
    });

    it('should return unknown for unsupported format', async () => {
        const unsupportedXml = `<?xml version="1.0" encoding="UTF-8"?>
<SomeOtherFormat>
  <ID>INV-2024-001</ID>
</SomeOtherFormat>`;

        const format = await detector.detectFormat(Buffer.from(unsupportedXml));
        expect(format).toBe('unknown');
    });
});
