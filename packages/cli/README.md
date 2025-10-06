# @e-rechnung/cli

Command-line interface for the E-Rechnung Tool.

## Overview

This package provides a CLI for managing e-invoices from the command line, including:

- **Invoice Validation**: Validate XML files against EN 16931 rules
- **Data Export**: Export invoices to CSV/JSON formats
- **Analysis**: Generate reports and analytics
- **Batch Processing**: Process multiple files efficiently

## Installation

```bash
# Install globally
npm install -g @e-rechnung/cli

# Or use with npx
npx @e-rechnung/cli --help
```

## Commands

### `einvoice validate <file>`

Validate an e-invoice file against EN 16931 rules.

```bash
# Basic validation
einvoice validate invoice.xml

# Verbose output with detailed results
einvoice validate invoice.xml --verbose

# Force specific format
einvoice validate invoice.xml --format xrechnung_ubl
```

**Options:**
- `-v, --verbose` - Show detailed validation results
- `-f, --format <format>` - Force specific format (xrechnung_ubl, xrechnung_cii, zugferd_cii)

**Exit Codes:**
- `0` - Validation passed
- `1` - Validation failed or error occurred

### `einvoice export`

Export invoices to CSV/JSON format.

```bash
# Export invoices for a date range
einvoice export --from 2024-01-01 --to 2024-12-31

# Export with custom output file
einvoice export --from 2024-01-01 --to 2024-12-31 --output invoices.csv

# Export including XML files
einvoice export --from 2024-01-01 --to 2024-12-31 --include-xml
```

**Options:**
- `-f, --from <date>` - Start date (YYYY-MM-DD)
- `-t, --to <date>` - End date (YYYY-MM-DD)
- `-o, --output <file>` - Output file path
- `--format <format>` - Export format (csv, json)
- `--include-xml` - Include original XML files

### `einvoice analyze`

Analyze invoice data and generate reports.

```bash
# Analyze all invoices
einvoice analyze

# Analyze specific date range
einvoice analyze --from 2024-01-01 --to 2024-12-31

# Generate JSON report
einvoice analyze --format json --output report.json
```

**Options:**
- `-f, --from <date>` - Start date (YYYY-MM-DD)
- `-t, --to <date>` - End date (YYYY-MM-DD)
- `-o, --output <file>` - Output file path
- `--format <format>` - Report format (json, text)

## Examples

### Validate Multiple Files

```bash
# Validate all XML files in a directory
for file in *.xml; do
  einvoice validate "$file"
done
```

### Batch Export

```bash
# Export monthly invoices
for month in {01..12}; do
  einvoice export --from "2024-$month-01" --to "2024-$month-31" --output "invoices-2024-$month.csv"
done
```

### Integration with CI/CD

```bash
# Validate invoices in CI pipeline
if einvoice validate invoice.xml; then
  echo "✅ Invoice validation passed"
else
  echo "❌ Invoice validation failed"
  exit 1
fi
```

## Configuration

The CLI can be configured via environment variables:

```bash
# Database connection (for export/analyze commands)
export DATABASE_URL="postgresql://user:pass@localhost:5432/einvoice"

# API endpoint (for remote operations)
export EINVOICE_API_URL="https://api.e-rechnung.example.com"

# Log level
export LOG_LEVEL="info"
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run in development
pnpm dev validate invoice.xml

# Test
pnpm test
```

## Error Handling

The CLI provides clear error messages and appropriate exit codes:

- **Validation Errors**: Shows specific rule violations
- **File Errors**: Clear file not found or permission errors
- **Network Errors**: Connection issues with API or database
- **Format Errors**: Invalid date formats or file types

## Performance

- **Fast Validation**: Optimized XML parsing and validation
- **Memory Efficient**: Streams large files instead of loading entirely
- **Parallel Processing**: Can process multiple files concurrently
- **Caching**: Caches validation results for repeated operations

## Integration

The CLI integrates with:

- **CI/CD Pipelines**: Validate invoices in build processes
- **Batch Scripts**: Process large volumes of invoices
- **Monitoring**: Health checks and validation status
- **Automation**: Scheduled exports and analysis
