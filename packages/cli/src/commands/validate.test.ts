/**
 * Tests for validate command
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCommand } from './validate.js';

// Mock dependencies
vi.mock('fs', () => ({
    readFileSync: vi.fn(),
}));

vi.mock('@e-rechnung/parse-xml', () => ({
    XmlInvoiceParser: vi.fn().mockImplementation(() => ({
        detectFormat: vi.fn(),
        parse: vi.fn(),
    })),
}));

vi.mock('@e-rechnung/validator', () => ({
    En16931ValidationEngine: vi.fn().mockImplementation(() => ({
        validate: vi.fn(),
    })),
}));

vi.mock('ora', () => ({
    default: vi.fn().mockImplementation(() => ({
        start: vi.fn().mockReturnThis(),
        succeed: vi.fn().mockReturnThis(),
        fail: vi.fn().mockReturnThis(),
        text: vi.fn().mockReturnThis(),
    })),
}));

vi.mock('chalk', () => ({
    default: {
        bold: vi.fn((text) => text),
        cyan: vi.fn((text) => text),
        green: vi.fn((text) => text),
        red: vi.fn((text) => text),
        yellow: vi.fn((text) => text),
        gray: vi.fn((text) => text),
    },
}));

describe('validate command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should validate a valid invoice file', async () => {
        const mockFileBuffer = Buffer.from('<xml>test</xml>');
        const mockInvoice = {
            invoiceNumber: 'INV-2024-001',
            issueDate: '2024-01-01',
            currency: 'EUR',
            seller: { name: 'ACME', address: { country: 'DE' } },
            buyer: { name: 'Customer', address: { country: 'DE' } },
            totals: { net: 100, tax: 19, gross: 119 },
            lineItems: [],
        };
        const mockValidationResult = {
            status: 'PASS',
            errors: [],
            warnings: [],
        };

        const { readFileSync } = await import('fs');
        const { XmlInvoiceParser } = await import('@e-rechnung/parse-xml');
        const { En16931ValidationEngine } = await import('@e-rechnung/validator');

        vi.mocked(readFileSync).mockReturnValue(mockFileBuffer);

        const mockParser = new XmlInvoiceParser();
        vi.mocked(mockParser.detectFormat).mockResolvedValue('xrechnung_ubl');
        vi.mocked(mockParser.parse).mockResolvedValue(mockInvoice);

        const mockValidator = new En16931ValidationEngine();
        vi.mocked(mockValidator.validate).mockResolvedValue(mockValidationResult);

        // Mock process.exit to prevent actual exit
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit called');
        });

        try {
            await validateCommand.parse(['validate', 'test.xml']);
            expect.fail('Should have called process.exit');
        } catch (error) {
            expect(error.message).toBe('process.exit called');
            expect(exitSpy).toHaveBeenCalledWith(0); // Success exit code
        }

        exitSpy.mockRestore();
    });

    it('should handle validation failures', async () => {
        const mockFileBuffer = Buffer.from('<xml>test</xml>');
        const mockInvoice = {
            invoiceNumber: '',
            issueDate: '',
            currency: '',
            seller: { name: '', address: { country: '' } },
            buyer: { name: '', address: { country: '' } },
            totals: { net: 0, tax: 0, gross: 0 },
            lineItems: [],
        };
        const mockValidationResult = {
            status: 'FAIL',
            errors: [
                { code: 'INV-01', message: 'Invoice number is required' },
                { code: 'INV-02', message: 'Issue date is required' },
            ],
            warnings: [],
        };

        const { readFileSync } = await import('fs');
        const { XmlInvoiceParser } = await import('@e-rechnung/parse-xml');
        const { En16931ValidationEngine } = await import('@e-rechnung/validator');

        vi.mocked(readFileSync).mockReturnValue(mockFileBuffer);

        const mockParser = new XmlInvoiceParser();
        vi.mocked(mockParser.detectFormat).mockResolvedValue('xrechnung_ubl');
        vi.mocked(mockParser.parse).mockResolvedValue(mockInvoice);

        const mockValidator = new En16931ValidationEngine();
        vi.mocked(mockValidator.validate).mockResolvedValue(mockValidationResult);

        // Mock process.exit to prevent actual exit
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit called');
        });

        try {
            await validateCommand.parse(['validate', 'test.xml']);
            expect.fail('Should have called process.exit');
        } catch (error) {
            expect(error.message).toBe('process.exit called');
            expect(exitSpy).toHaveBeenCalledWith(1); // Failure exit code
        }

        exitSpy.mockRestore();
    });

    it('should handle unknown format', async () => {
        const mockFileBuffer = Buffer.from('<xml>test</xml>');

        const { readFileSync } = await import('fs');
        const { XmlInvoiceParser } = await import('@e-rechnung/parse-xml');

        vi.mocked(readFileSync).mockReturnValue(mockFileBuffer);

        const mockParser = new XmlInvoiceParser();
        vi.mocked(mockParser.detectFormat).mockResolvedValue('unknown');

        // Mock process.exit to prevent actual exit
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit called');
        });

        try {
            await validateCommand.parse(['validate', 'test.xml']);
            expect.fail('Should have called process.exit');
        } catch (error) {
            expect(error.message).toBe('process.exit called');
            expect(exitSpy).toHaveBeenCalledWith(1); // Failure exit code
        }

        exitSpy.mockRestore();
    });
});
