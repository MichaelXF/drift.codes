import Model from "./Model";
import Anthropic from "@anthropic-ai/sdk";

export default class AnthropicModel extends Model {
  constructor(apiKey) {
    super();

    this.providerName = "Anthropic";
    this.modelName = "claude-3-5-sonnet-20241022";
    this.displayName = "Claude 3.5 Sonnet";

    this.client = new Anthropic({
      apiKey: apiKey, // This is the default and can be omitted
      dangerouslyAllowBrowser: true,
    });

    this.history = [];
  }

  async sendMessageStream(message, ...files) {
    async function convertToBase64(blobOrBuffer) {
      if (blobOrBuffer instanceof Blob) {
        return await blobToBase64(blobOrBuffer);
      }
      if (blobOrBuffer instanceof ArrayBuffer) {
        return arrayBufferToBase64(blobOrBuffer);
      }

      console.error(blobOrBuffer);
      throw new Error("Unsupported type");
    }

    function arrayBufferToBase64(buffer) {
      let binary = "";
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    function blobToBase64(blob) {
      console.log(blob);

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = function () {
          var dataUrl = reader.result;
          var base64 = dataUrl.split(",")[1];
          resolve(base64);
        };

        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    const content = [];
    for (const file of files) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: file.mimeType,
          data: await convertToBase64(file.blob),
        },
      });
    }

    content.push({
      type: "text",
      text: message,
    });

    const params = {
      model: this.modelName,
      max_tokens: 8192,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: content,
        },
      ],
      stream: true,
    };
    return await this.client.messages.create(params);
  }

  getPartText(part) {
    if (part.type === "content_block_delta") {
      const delta = part.delta;
      if (delta.type === "text_delta") {
        return delta.text;
      }
    }

    return "";
  }
}
