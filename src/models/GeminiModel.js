import Model from "./Model";

const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");

export default class GeminiModel extends Model {
  constructor(apiKey) {
    super();

    this.providerName = "Gemini";
    this.modelName = "gemini-2.0-flash-exp";
    this.displayName = "Gemini 2.0 Flash";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: this.modelName,
    });
    const chatSession = model.startChat();

    this.chatSession = chatSession;

    this.fileManager = new GoogleAIFileManager(apiKey);
  }

  async uploadFile(blob, displayName, mimeType) {
    const uploadResult = await this.fileManager.uploadFile(blob, {
      mimeType,
      displayName: displayName,
    });
    const file = uploadResult.file;

    console.log(`Uploaded file ${file.displayName} as: ${file.name}`);

    return file;
  }

  async sendMessageStream(message, ...files) {
    const parts = [];

    for (const file of files) {
      const geminiFile = await this.uploadFile(
        file.blob,
        file.name,
        file.mimeType
      );

      parts.push({
        fileData: {
          mimeType: geminiFile.mimeType,
          fileUri: geminiFile.uri,
        },
      });
    }

    parts.push({
      text: message,
    });

    var response = await this.chatSession.sendMessageStream(parts);

    return response.stream;
  }

  getPartText(part) {
    return part.text();
  }
}
