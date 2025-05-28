#!/usr/bin/env node

import { getWeaviateClient, PDFDocument } from './utils/weaviateClient';
import { weaviateConfig } from './config';

// Search for documents based on a natural language query
async function searchDocuments(query: string): Promise<PDFDocument[]> {
  try {
    // Initialize Weaviate client
    const client = await getWeaviateClient();
    
    console.log(`Searching for: "${query}"...`);
    
    // Get the collection
    const collection = client.collections.use<PDFDocument>(weaviateConfig.collectionName);
    
    // Perform vector search
    const result = await collection.query.nearText({
      text: query,
      limit: 5,  // Return top 5 matches
    }).withFields(['path', 'filename', 'content', 'createdAt']).do();
    
    // Close the client connection when done
    await client.close();
    
    // Return matching documents
    return result.data.Get[weaviateConfig.collectionName] || [];
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
}

// Format and display search results
function displaySearchResults(documents: PDFDocument[], query: string): void {
  console.log(`\n==== Search Results for "${query}" ====\n`);
  
  if (documents.length === 0) {
    console.log('No matching documents found.');
    return;
  }
  
  documents.forEach((doc, index) => {
    console.log(`[${index + 1}] ${doc.filename}`);
    console.log(`Path: ${doc.path}`);
    console.log(`Created: ${new Date(doc.createdAt).toLocaleString()}`);
    
    // Find relevant snippet from content (simple approach)
    const contentPreview = findRelevantSnippet(doc.content, query);
    console.log(`Relevant content: ${contentPreview}`);
    console.log(''); // Empty line between results
  });
}

// Simple function to find a relevant snippet from the document content
function findRelevantSnippet(content: string, query: string): string {
  const words = query.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  const contentLower = content.toLowerCase();
  
  // Try to find a context around the query terms
  for (const word of words) {
    const index = contentLower.indexOf(word);
    if (index !== -1) {
      // Get a snippet around the matched term
      const start = Math.max(0, index - 100);
      const end = Math.min(content.length, index + 100);
      return '...' + content.substring(start, end).trim() + '...';
    }
  }
  
  // If no specific match, return the beginning of the content
  return content.substring(0, 200).trim() + '...';
}

// Main function
async function main() {
  // Get search query from command line arguments
  const args = process.argv.slice(2);
  const query = args.join(' ').trim();
  
  if (!query) {
    console.error('Please provide a search query');
    console.log('Usage: npm run search "your search query"');
    process.exit(1);
  }
  
  try {
    // Search for documents matching the query
    const results = await searchDocuments(query);
    
    // Display the results
    displaySearchResults(results, query);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});