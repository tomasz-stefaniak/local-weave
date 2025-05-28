# Local-Weave

A CLI tool for finding PDF files in a directory, extracting their text content, and preparing them for a Weaviate vector database.

## Installation

```bash
# Clone the repository
git clone [repository-url]
cd local-weave

# Install dependencies
npm install
```

## Usage

To ingest PDFs from a directory:

```bash
npm run ingest /path/to/your/pdf/directory
```

This will:
1. Recursively find all PDF files in the specified directory
2. Extract text content from each PDF
3. Output information about the processed PDFs to the console

## Features

- Recursive PDF file discovery
- Text extraction from PDFs
- Console output of processing results

## Future Enhancements

- Integration with Weaviate vector database
- Support for additional document types
- Advanced text processing options