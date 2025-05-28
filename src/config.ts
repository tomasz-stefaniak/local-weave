import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Weaviate configuration
export const weaviateConfig = {
  // Use environment variables with fallbacks
  host: process.env.WEAVIATE_HOST || 'localhost',
  port: process.env.WEAVIATE_PORT || '8080',
  scheme: process.env.WEAVIATE_SCHEME || 'http',
  apiKey: process.env.WEAVIATE_API_KEY || '',
  // If using cloud instance
  cloudUrl: process.env.WEAVIATE_CLOUD_URL || '',
  // If using third-party services like OpenAI for vectorization
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  // Collection name for PDF documents
  collectionName: 'PDFDocuments'
};

// PDF processing configuration
export const pdfConfig = {
  // Maximum text length to extract from PDF (adjust based on your vector database limits)
  maxTextLength: 5000,
  // Chunk size for large PDFs (if implementing chunking)
  chunkSize: 2000,
  // Overlap between chunks (if implementing chunking)
  chunkOverlap: 200
};