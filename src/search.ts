#!/usr/bin/env node

import { getWeaviateClient, PDFDocument } from "./utils/weaviateClient";
import { weaviateConfig } from "./config";
import chalk from "chalk";

// Search for documents based on a natural language query
async function searchDocuments(query: string): Promise<any[]> {
  try {
    // Initialize Weaviate client
    const client = await getWeaviateClient();

    console.log(
      `\n${chalk.cyan("🔎")} ${chalk.cyan.bold(
        "Searching for:"
      )} "${chalk.yellow(query)}"...\n`
    );
    // Perform vector search
    const result = await client.graphql
      .get()
      .withClassName(weaviateConfig.collectionName)
      .withFields("path filename content createdAt _additional { certainty }")
      .withNearText({ concepts: [query] })
      .withLimit(5)
      .do();
    // Return matching documents
    return result.data.Get[weaviateConfig.collectionName] || [];
  } catch (error) {
    console.error("Error searching documents:", error);
    throw error;
  }
}

// Format and display search results
function displaySearchResults(documents: any[], query: string): void {
  console.log(
    `\n${chalk.bgCyan.black(" SEARCH RESULTS ")} for "${chalk.yellow.bold(
      query
    )}"\n`
  );
  if (documents.length === 0) {
    console.log(
      `${chalk.red("✘")} ${chalk.red.bold("No matching documents found.")}`
    );
    return;
  }

  console.log(
    `${chalk.green("✓")} ${chalk.green.bold("Found")} ${chalk.white.bold(
      documents.length
    )} ${chalk.green.bold("matching documents")}\n`
  );

  documents.forEach((doc, index) => {
    const certainty = doc._additional?.certainty || 0;
    const certaintyPercent = (certainty * 100).toFixed(2);

    // Create a relevance bar based on certainty score
    const relevanceBar = createRelevanceBar(certainty);

    // Document header with emoji based on file type
    console.log(
      `${chalk.bgBlue.white(` ${index + 1} `)} ${chalk.blue.bold(
        "📄 " + doc.filename
      )}`
    );

    // Path with folder icon
    console.log(`   ${chalk.dim("📁 Path:")} ${chalk.white(doc.path)}`);

    // Creation date with calendar icon
    console.log(
      `   ${chalk.dim("🗓️  Created:")} ${chalk.white(
        new Date(doc.createdAt).toLocaleString()
      )}`
    );

    // Relevance with meter
    console.log(
      `   ${chalk.dim("🎯 Relevance:")} ${relevanceBar} ${chalk.yellow(
        certaintyPercent + "%"
      )}`
    );

    // Content preview with highlighted query terms
    console.log(`   ${chalk.dim("📝 Content:")}`);
    const highlightedSnippet = highlightQueryTerms(
      findRelevantSnippet(doc.content, query),
      query
    );
    console.log(`   ${chalk.gray("   " + highlightedSnippet)}`);

    // Separator between results
    console.log(chalk.dim("─".repeat(process.stdout.columns || 80)));
  });
}

// Create a colored relevance bar based on certainty score
function createRelevanceBar(certainty: number): string {
  const maxBars = 20;
  const filledBars = Math.round(certainty * maxBars);
  const emptyBars = maxBars - filledBars;

  let color;
  if (certainty >= 0.7) color = chalk.green;
  else if (certainty >= 0.4) color = chalk.yellow;
  else color = chalk.red;

  return color("█".repeat(filledBars)) + chalk.gray("▒".repeat(emptyBars));
}

// Highlight query terms in the snippet
function highlightQueryTerms(snippet: string, query: string): string {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3);

  let result = snippet;
  for (const word of words) {
    const regex = new RegExp(word, "gi");
    result = result.replace(regex, (match) => chalk.yellow.bold(match));
  }

  return result;
}

// Simple function to find a relevant snippet from the document content
function findRelevantSnippet(content: string, query: string): string {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3);
  const contentLower = content.toLowerCase();

  // Try to find a context around the query terms
  for (const word of words) {
    const index = contentLower.indexOf(word);
    if (index !== -1) {
      // Get a snippet around the matched term
      const start = Math.max(0, index - 100);
      const end = Math.min(content.length, index + 100);
      return "..." + content.substring(start, end).trim() + "...";
    }
  }

  // If no specific match, return the beginning of the content
  return content.substring(0, 200).trim() + "...";
}

// Main function
async function main() {
  // Get search query from command line arguments
  const args = process.argv.slice(2);
  const query = args.join(" ").trim();

  if (!query) {
    console.error(
      `\n${chalk.red("⚠️")} ${chalk.red.bold("Please provide a search query")}`
    );
    console.log(
      `${chalk.cyan("ℹ️")} ${chalk.white("Usage:")} ${chalk.green(
        "npm run search"
      )} ${chalk.yellow('"your search query"')}`
    );
    process.exit(1);
  }

  try {
    // Display search header
    console.log("\n" + chalk.bgMagenta.white(" LOCAL-WEAVE SEARCH ") + "\n");

    // Search for documents matching the query
    const results = await searchDocuments(query);

    // Display the results
    displaySearchResults(results, query);

    // Display footer
    console.log(
      `\n${chalk.cyan("ℹ️")} ${chalk.cyan("Use")} ${chalk.green(
        "npm run search"
      )} ${chalk.yellow('"another query"')} ${chalk.cyan("to search again")}\n`
    );
  } catch (error) {
    console.error(`\n${chalk.red("❌")} ${chalk.red.bold("Error:")}`);
    console.error(chalk.red(error));
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error(`\n${chalk.red("❌")} ${chalk.red.bold("Unhandled error:")}`);
  console.error(chalk.red(error));
  process.exit(1);
});
