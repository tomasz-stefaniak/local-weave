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
    // Get the current schema to check if our class exists
    const schema = await client.schema.getter().do();

    // Check if our class already exists in the schema
    const classExists =
      schema.classes &&
      schema.classes.some(
        (c: any) => c.class === weaviateConfig.collectionName
      );

    if (!classExists) {
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
    console.error("Error ensuring class exists:", error);
    throw error;
  }
}
