#!/usr/bin/env node

import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { promisify } from "util";
import {
  getWeaviateClient,
  ensureCollection,
  PDFDocument,
} from "./utils/weaviateClient";
import { weaviateConfig, pdfConfig } from "./config";
import type { WeaviateClient } from "weaviate-client";

// Convert callback-based functions to Promise-based
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// Find all PDF files in a directory recursively
async function findPdfFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  // Read all files and directories in the given directory
  const entries = await readdir(dir, { withFileTypes: true });

  // Process each entry
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively process subdirectories
      const subDirFiles = await findPdfFiles(fullPath);
      files.push(...subDirFiles);
    } else if (
      entry.isFile() &&
      path.extname(entry.name).toLowerCase() === ".pdf"
    ) {
      // Add PDF files to the result
      files.push(fullPath);
    }
  }

  return files;
}

// Parse a PDF file and extract its text content
async function parsePdf(filePath: string): Promise<PDFDocument> {
  try {
    const dataBuffer = await readFile(filePath);
    const result = await pdfParse(dataBuffer);

    // Limit content length if necessary
    const content = result.text.substring(0, pdfConfig.maxTextLength);

    return {
      path: filePath,
      filename: path.basename(filePath),
      content: content,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error parsing PDF ${filePath}:`, error);
    return {
      path: filePath,
      filename: path.basename(filePath),
      content: `[Error: Failed to parse PDF]`,
      createdAt: new Date().toISOString(),
    };
  }
}

// Store documents in Weaviate
async function storeDocumentsInWeaviate(
  client: WeaviateClient,
  documents: PDFDocument[]
): Promise<void> {
  try {
    // Get the collection
    const collection = client.collections.use<PDFDocument>(
      weaviateConfig.collectionName
    );

    console.log(`Storing ${documents.length} documents in Weaviate...`);

    // Process documents in batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          documents.length / batchSize
        )}`
      );

      // Insert documents in the current batch
      await collection.data.insertMany(batch);
    }

    console.log("All documents stored successfully!");
  } catch (error) {
    console.error("Error storing documents in Weaviate:", error);
    throw error;
  }
}

// Process all PDFs in a directory
async function processDirectory(dirPath: string): Promise<PDFDocument[]> {
  try {
    // Validate directory exists
    const dirStats = await stat(dirPath);
    if (!dirStats.isDirectory()) {
      throw new Error(`${dirPath} is not a directory`);
    }

    console.log(`Finding PDF files in ${dirPath}...`);
    const pdfFiles = await findPdfFiles(dirPath);

    if (pdfFiles.length === 0) {
      console.log("No PDF files found.");
      return [];
    }

    console.log(`Found ${pdfFiles.length} PDF files.`);

    // Process each PDF file
    const results: PDFDocument[] = [];
    for (let i = 0; i < pdfFiles.length; i++) {
      const filePath = pdfFiles[i];
      console.log(
        `Processing [${i + 1}/${pdfFiles.length}]: ${path.basename(filePath)}`
      );

      const document = await parsePdf(filePath);
      results.push(document);
    }

    return results;
  } catch (error) {
    console.error("Error processing directory:", error);
    throw error;
  }
}

// Main function
async function main() {
  // Get directory path from command line arguments
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Please provide a directory path");
    process.exit(1);
  }

  const dirPath = args[0];

  try {
    // Initialize Weaviate client
    const client = await getWeaviateClient();

    // Ensure collection exists
    await ensureCollection(client);

    // Process the directory
    const documents = await processDirectory(dirPath);

    if (documents.length > 0) {
      // Store documents in Weaviate
      await storeDocumentsInWeaviate(client, documents);
    }

    // Output results to console
    console.log("\n==== Results ====");
    console.log(`Processed ${documents.length} PDF files.`);

    documents.forEach((doc, index) => {
      console.log(`\n[${index + 1}] ${doc.filename}`);
      console.log(`Path: ${doc.path}`);
      console.log(`Content length: ${doc.content.length} characters`);
      console.log(`Preview: ${doc.content.substring(0, 150)}...`);
    });

    console.log("\nDone! All PDFs have been processed and stored in Weaviate.");

    // Close the client connection
    await client.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
