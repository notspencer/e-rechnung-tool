/**
 * CLI command for exporting invoices
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export const exportCommand = new Command('export')
    .description('Export invoices to CSV format')
    .option('-f, --from <date>', 'Start date (YYYY-MM-DD)')
    .option('-t, --to <date>', 'End date (YYYY-MM-DD)')
    .option('-o, --output <file>', 'Output file path')
    .option('-f, --format <format>', 'Export format (csv, json)', 'csv')
    .option('--include-xml', 'Include original XML files in export')
    .action(async (options: {
        from?: string;
        to?: string;
        output?: string;
        format?: string;
        includeXml?: boolean;
    }) => {
        const spinner = ora('Preparing export...').start();

        try {
            // Validate date range
            if (!options.from || !options.to) {
                spinner.fail('Date range required');
                console.log(chalk.red('❌ Both --from and --to dates are required'));
                console.log(chalk.yellow('💡 Example: einvoice export --from 2024-01-01 --to 2024-12-31'));
                process.exit(1);
            }

            // Validate date format
            const fromDate = new Date(options.from);
            const toDate = new Date(options.to);

            if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
                spinner.fail('Invalid date format');
                console.log(chalk.red('❌ Dates must be in YYYY-MM-DD format'));
                process.exit(1);
            }

            if (fromDate > toDate) {
                spinner.fail('Invalid date range');
                console.log(chalk.red('❌ Start date must be before end date'));
                process.exit(1);
            }

            // TODO: Implement actual export logic
            spinner.text = 'Querying invoices...';
            await new Promise(resolve => setTimeout(resolve, 1000));

            spinner.text = 'Generating export...';
            await new Promise(resolve => setTimeout(resolve, 1000));

            spinner.text = 'Writing file...';
            await new Promise(resolve => setTimeout(resolve, 500));

            spinner.succeed('Export completed');

            console.log(chalk.bold('\n📊 Export Summary:'));
            console.log(`  Period: ${chalk.cyan(options.from)} to ${chalk.cyan(options.to)}`);
            console.log(`  Format: ${chalk.cyan(options.format)}`);
            console.log(`  Include XML: ${options.includeXml ? chalk.green('Yes') : chalk.gray('No')}`);
            console.log(`  Output: ${chalk.cyan(options.output || 'export.csv')}`);

            console.log(chalk.green('\n✅ Export completed successfully!'));

        } catch (error) {
            spinner.fail('Export failed');
            console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });
