import weaviate from "weaviate-client";
import { weaviateConfig } from "../config";
import type { WeaviateClient } from "weaviate-client";

// Define the PDF document schema type
export type PDFDocument = {
  path: string;
  filename: string;
  content: string;
  createdAt: string;
};

// Function to initialize and return the Weaviate client
export async function getWeaviateClient(): Promise<WeaviateClient> {
  try {
    // Connect to local Weaviate Docker instance
    const client = await weaviate.connectToLocal({
      scheme: weaviateConfig.scheme,
      host: `${weaviateConfig.host}:${weaviateConfig.port}`,
      headers: {
        ...(weaviateConfig.openAiApiKey
          ? { "X-OpenAI-Api-Key": weaviateConfig.openAiApiKey }
          : {}),
      },
    });

    console.log("Connected to Weaviate successfully!");
    return client;
  } catch (error) {
    console.error("Failed to connect to Weaviate:", error);
    throw error;
  }
}

// Function to ensure the PDFDocuments collection exists with proper schema
export async function ensureCollection(client: WeaviateClient): Promise<void> {
  try {
    // Check if collection exists
    const collections = await client.collections.list();
    const exists = collections.some(
      (col) => col.name === weaviateConfig.collectionName
    );

    if (!exists) {
      console.log(`Creating collection ${weaviateConfig.collectionName}...`);

      // Create collection with schema
      await client.collections.create({
        name: weaviateConfig.collectionName,
        vectorizer: weaviateConfig.vectorizer, // Using OpenAI vectorizer from config
        properties: [
          {
            name: "path",
            dataType: ["text"],
            description: "The file path of the PDF document",
          },
          {
            name: "filename",
            dataType: ["text"],
            description: "The name of the PDF file",
            indexFilterable: true,
            indexSearchable: true,
          },
          {
            name: "content",
            dataType: ["text"],
            description: "The extracted text content from the PDF",
            indexFilterable: true,
            indexSearchable: true,
            tokenization: "word",
            vectorizePropertyName: true,
          },
          {
            name: "createdAt",
            dataType: ["date"],
            description: "When the document was ingested",
            indexFilterable: true,
          },
        ],
      });

      console.log(
        `Collection ${weaviateConfig.collectionName} created successfully!`
      );
    } else {
      console.log(
        `Collection ${weaviateConfig.collectionName} already exists.`
      );
    }
  } catch (error) {
    console.error("Error ensuring collection exists:", error);
    throw error;
  }
}
