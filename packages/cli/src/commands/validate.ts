/**
 * CLI command for validating invoice files
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { XmlInvoiceParser } from '@e-rechnung/parse-xml';
import { En16931ValidationEngine } from '@e-rechnung/validator';

export const validateCommand = new Command('validate')
    .description('Validate an e-invoice file against EN 16931 rules')
    .argument('<file>', 'Path to the invoice file (XML)')
    .option('-v, --verbose', 'Show detailed validation results')
    .option('-f, --format <format>', 'Force specific format (xrechnung_ubl, xrechnung_cii, zugferd_cii)')
    .action(async (file: string, options: { verbose?: boolean; format?: string }) => {
        const spinner = ora('Validating invoice...').start();

        try {
            // Read file
            const filePath = resolve(file);
            const fileBuffer = readFileSync(filePath);

            // Initialize parser and validator
            const parser = new XmlInvoiceParser();
            const validator = new En16931ValidationEngine();

            // Detect format
            let format: string;
            if (options.format) {
                format = options.format;
                spinner.text = `Using forced format: ${format}`;
            } else {
                spinner.text = 'Detecting invoice format...';
                format = await parser.detectFormat(fileBuffer);
            }

            if (format === 'unknown') {
                spinner.fail('Unknown invoice format');
                console.log(chalk.red('❌ Could not detect invoice format'));
                console.log(chalk.yellow('💡 Try specifying format with --format option'));
                process.exit(1);
            }

            // Parse invoice
            spinner.text = 'Parsing invoice...';
            const invoice = await parser.parse(fileBuffer, format as any);

            // Validate
            spinner.text = 'Running validation rules...';
            const result = await validator.validate(invoice);

            // Display results
            spinner.succeed('Validation completed');

            console.log(chalk.bold('\n📋 Invoice Information:'));
            console.log(`  Number: ${chalk.cyan(invoice.invoiceNumber)}`);
            console.log(`  Date: ${chalk.cyan(invoice.issueDate)}`);
            console.log(`  Currency: ${chalk.cyan(invoice.currency)}`);
            console.log(`  Format: ${chalk.cyan(format)}`);
            console.log(`  Seller: ${chalk.cyan(invoice.seller.name)}`);
            console.log(`  Buyer: ${chalk.cyan(invoice.buyer.name)}`);
            console.log(`  Total: ${chalk.cyan(invoice.totals.gross)} ${invoice.currency}`);

            console.log(chalk.bold('\n🔍 Validation Results:'));

            if (result.status === 'PASS') {
                console.log(chalk.green('✅ PASS - Invoice is valid'));
            } else {
                console.log(chalk.red('❌ FAIL - Invoice has validation errors'));
            }

            // Show errors
            if (result.errors.length > 0) {
                console.log(chalk.red('\n🚨 Errors:'));
                result.errors.forEach((error, index) => {
                    console.log(`  ${index + 1}. ${chalk.red(error.code)}: ${error.message}`);
                    if (options.verbose && error.path) {
                        console.log(`     Path: ${chalk.gray(error.path)}`);
                    }
                });
            }

            // Show warnings
            if (result.warnings.length > 0) {
                console.log(chalk.yellow('\n⚠️  Warnings:'));
                result.warnings.forEach((warning, index) => {
                    console.log(`  ${index + 1}. ${chalk.yellow(warning.code)}: ${warning.message}`);
                    if (options.verbose && warning.path) {
                        console.log(`     Path: ${chalk.gray(warning.path)}`);
                    }
                });
            }

            // Summary
            console.log(chalk.bold('\n📊 Summary:'));
            console.log(`  Status: ${result.status === 'PASS' ? chalk.green('PASS') : chalk.red('FAIL')}`);
            console.log(`  Errors: ${chalk.red(result.errors.length)}`);
            console.log(`  Warnings: ${chalk.yellow(result.warnings.length)}`);

            // Exit code
            process.exit(result.status === 'PASS' ? 0 : 1);

        } catch (error) {
            spinner.fail('Validation failed');
            console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });
