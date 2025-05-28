import weaviate from "weaviate-ts-client";
import { weaviateConfig } from "../config";

// Define the PDF document schema type
export type PDFDocument = {
  path: string;
  filename: string;
  content: string;
  createdAt: string;
};

// Function to initialize and return the Weaviate client
export async function getWeaviateClient() {
  try {
    // Connect to local Weaviate Docker instance
    const client = weaviate.client({
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
export async function ensureCollection(client: any): Promise<void> {
  try {
    // Check if class exists
    const classObj = await client.schema
      .classGetter()
      .withClassName(weaviateConfig.collectionName)
      .do();

    // If the class doesn't exist, create it
    if (!classObj) {
      console.log(`Creating class ${weaviateConfig.collectionName}...`);

      // Create class with schema
      const classSchema = {
        class: weaviateConfig.collectionName,
        vectorizer: weaviateConfig.vectorizer, // Using OpenAI vectorizer from config
        properties: [
          {
            name: "path",
            dataType: ["string"],
            description: "The file path of the PDF document",
          },
          {
            name: "filename",
            dataType: ["string"],
            description: "The name of the PDF file",
            indexInverted: true,
          },
          {
            name: "content",
            dataType: ["text"],
            description: "The extracted text content from the PDF",
            indexInverted: true,
            tokenization: "word",
          },
          {
            name: "createdAt",
            dataType: ["date"],
            description: "When the document was ingested",
            indexInverted: true,
          },
        ],
      };

      await client.schema.classCreator().withClass(classSchema).do();
      console.log(
        `Class ${weaviateConfig.collectionName} created successfully!`
      );
    } else {
      console.log(`Class ${weaviateConfig.collectionName} already exists.`);
    }
  } catch (error) {
    if (error.message && error.message.includes("not found")) {
      // Class doesn't exist, create it
      console.log(`Creating class ${weaviateConfig.collectionName}...`);

      // Create class with schema
      const classSchema = {
        class: weaviateConfig.collectionName,
        vectorizer: weaviateConfig.vectorizer, // Using OpenAI vectorizer from config
        properties: [
          {
            name: "path",
            dataType: ["string"],
            description: "The file path of the PDF document",
          },
          {
            name: "filename",
            dataType: ["string"],
            description: "The name of the PDF file",
            indexInverted: true,
          },
          {
            name: "content",
            dataType: ["text"],
            description: "The extracted text content from the PDF",
            indexInverted: true,
            tokenization: "word",
          },
          {
            name: "createdAt",
            dataType: ["date"],
            description: "When the document was ingested",
            indexInverted: true,
          },
        ],
      };

      await client.schema.classCreator().withClass(classSchema).do();
      console.log(
        `Class ${weaviateConfig.collectionName} created successfully!`
      );
    } else {
      console.error("Error ensuring class exists:", error);
      throw error;
    }
  }
}
