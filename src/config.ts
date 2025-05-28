import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Weaviate configuration
export const weaviateConfig = {
  // Use local Docker instance by default
  host: process.env.WEAVIATE_HOST || "localhost",
  port: process.env.WEAVIATE_PORT || "8080",
  scheme: process.env.WEAVIATE_SCHEME || "http",

  // Collection name for PDF documents
  collectionName: "PDFDocuments",

  // If using third-party services like OpenAI for vectorization
  openAiApiKey: process.env.OPENAI_API_KEY || "",

  // Vectorizer module to use
  vectorizer: "text2vec-openai",
};

// PDF processing configuration
export const pdfConfig = {
  // Maximum text length to extract from PDF (adjust based on your vector database limits)
  maxTextLength: 5000,
  // Chunk size for large PDFs (if implementing chunking)
  chunkSize: 2000,
  // Overlap between chunks (if implementing chunking)
  chunkOverlap: 200,
};
