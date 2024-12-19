import Model from "./Model";
import OpenAI, { toFile } from "openai";

export default class OpenAIModel extends Model {
  constructor(apiKey) {
    super();
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    this.messages = []; // Store conversation history

    this.providerName = "OpenAI";
    this.modelName = "gpt-4o"; // Adjust model based on needs
    this.displayName = "GPT-4o";
  }

  async uploadFile(blob, displayName, mimeType) {
    try {
      if (!blob) throw new Error("No file provided");

      // Use OpenAI's toFile helper to prepare the file for upload
      const fileForUpload = await toFile(blob, displayName);

      const file = await this.client.files.create({
        file: fileForUpload,
        purpose: "assistants", // Adjust purpose as needed
      });

      console.log(`Uploaded file ${displayName} as: ${file.id}`);

      return {
        name: file.id,
        displayName,
        mimeType,
        uri: file.url,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }

  async convertToBase64DataUrl(blobOrBuffer, mimeType) {
    function blobToBase64DataUrl(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = function () {
          var dataUrl = reader.result;
          resolve(dataUrl);
        };

        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    // Convert to Blob -> Base64 Data URL
    let asBlob = blobOrBuffer;

    if (asBlob instanceof ArrayBuffer) {
      asBlob = new Blob([asBlob], { type: mimeType });
    }

    if (asBlob instanceof Blob) {
      return await blobToBase64DataUrl(asBlob);
    }

    console.error(blobOrBuffer);
    throw new Error("Unsupported type");
  }

  async sendMessageStream(message, ...files) {
    try {
      // Prepare message content
      let content = [];

      // Upload and add files if present
      for (const file of files) {
        content.push({
          type: "image_url", // Assuming images, adjust based on file type
          image_url: {
            url: await this.convertToBase64DataUrl(file.blob, file.mimeType),
          },
        });
      }

      // Add text message
      content.push({
        type: "text",
        text: message,
      });

      // Add message to conversation history
      this.messages.push({
        role: "user",
        content: content,
      });

      // Create streaming completion
      const stream = await this.client.chat.completions.create({
        model: this.modelName, // Use appropriate model based on needs
        messages: this.messages,
        stream: true,
      });

      // Store assistant's response
      let fullResponse = "";
      const responseStream = new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            fullResponse += content;
            controller.enqueue(content);
          }
          controller.close();
        },
      });

      // Add assistant's response to conversation history
      this.messages.push({
        role: "assistant",
        content: fullResponse,
      });

      return responseStream;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  getPartText(part) {
    return part; // OpenAI already returns text directly
  }
}
