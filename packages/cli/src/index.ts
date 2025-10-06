#!/usr/bin/env node

/**
 * E-Rechnung CLI - Command-line interface for e-invoice management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { validateCommand } from './commands/validate.js';
import { exportCommand } from './commands/export.js';
import { analyzeCommand } from './commands/analyze.js';

// Create main CLI program
const program = new Command();

program
    .name('einvoice')
    .description('E-Rechnung Tool CLI - Manage e-invoices from the command line')
    .version('0.1.0')
    .addCommand(validateCommand)
    .addCommand(exportCommand)
    .addCommand(analyzeCommand);

// Add help command
program.addHelpText('before', chalk.bold.blue('🔧 E-Rechnung Tool CLI\n'));

program.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.cyan('einvoice validate invoice.xml')}           Validate an invoice file
  ${chalk.cyan('einvoice validate invoice.xml --verbose')} Validate with detailed output
  ${chalk.cyan('einvoice export --from 2024-01-01 --to 2024-12-31')} Export invoices
  ${chalk.cyan('einvoice analyze --from 2024-01-01 --to 2024-12-31')} Analyze invoice data

${chalk.bold('More Information:')}
  Documentation: https://github.com/notspencer/e-rechnung-tool
  Issues: https://github.com/notspencer/e-rechnung-tool/issues
`);

// Handle unknown commands
program.on('command:*', (operands) => {
    console.error(chalk.red(`❌ Unknown command: ${operands[0]}`));
    console.log(chalk.yellow('💡 Run "einvoice --help" to see available commands'));
    process.exit(1);
});

// Handle errors
program.on('error', (error) => {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
});

// Parse command line arguments
program.parse();
