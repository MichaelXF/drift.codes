import {
  FunctionCallingMode,
  VertexAI,
  SchemaType,
} from "@google-cloud/vertexai";
import { listFiles, readFile, saveFile } from "../../src/utils/file-utils";

export default class AI {
  async getSystemInstruction() {
    return `You are a code completion AI assistant for JavaScript with React
Respond only with code completions, NEVER USE MARKDOWN
Each message is a requested code completion, independent from previous messages. You may use previous messages for background context but do not autocomplete for them. ONLY CREATE COMPLETIONS FOR THE MOST RECENT MESSAGE.
Provide generated code samples given the user's message
Do not use imports or try to replace the user's code
Do not write more code than requested for the current message (Such as creating new unrelated functions)
The user's comments may provide more insights to what they hoping to be generated
---
User's project details:
Project Name: "${this.projectName}"
`;
  }

  get editorComponent() {
    return this.options.editorComponent;
  }

  get fs() {
    return this.editorComponent.fs;
  }

  get db() {
    return this.editorComponent.db;
  }

  get apiKey() {
    return this.options.apiKey;
  }

  get projectName() {
    return this.options.projectName;
  }

  constructor(options) {
    this.options = options;
    this.options = options;
    this.genAI = new VertexAI(this.apiKey);

    this.generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };

    this.functions = [];
    this.functionExecutors = {};

    this.addFunction(
      {
        name: "add",
        description: "Add two numbers",
        properties: ["a:number", "b:number"],
      },
      ({ a, b }) => a + b
    );

    this.addFunction(
      {
        name: "ListFiles",
        description:
          "List all files in the specified directory or root path if not provided",
        properties: ["path:string - directory path"],
      },
      async (parameters) => {
        return await listFiles(this.projectName);
      }
    );

    this.addFunction(
      {
        name: "ReadFile",
        description: "Read the contents of a file",
        properties: ["path:string - file path"],
      },
      async (p) => {
        return await readFile(this.projectName, p.path);
      }
    );

    this.addFunction(
      {
        name: "WriteFile",
        description: "Write the contents to a file",
        properties: [
          "path:string - file path",
          "content:string - file content",
        ],
      },
      async (p) => {
        await saveFile(this.projectName, p.path, p.content);
      }
    );

    this.addFunction(
      {
        name: "SearchFiles",
        description: "Search files using query from indexed files",
        properties: ["query:string - search query"],
      },
      async (p) => {
        var documents = await this.db.searchDocuments(p.query);
        var files = documents.map(async (doc) => {
          return {
            filePath: doc.id,
            content: await readFile(this.projectName, doc.id),
          };
        });

        return files;
      }
    );

    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction: this.systemInstruction,
      generationConfig: this.generationConfig,
      tools: [
        {
          functionDeclarations: this.functions,
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY,
        },
      },
    });

    this.embeddingsModel = this.genAI.getGenerativeModel({
      model: "models/text-embedding-004",
    });
  }

  addFunction({ name, description, properties }, functionToRun) {
    const propertiesObject = {};

    properties.forEach((property) => {
      const [name, typeAndDescription] = property.split(":", 2);
      const [type, description] = typeAndDescription.split(" - ", 2);

      propertiesObject[name] = {
        type: type || "string",
        description: description || `The ${name} property`,
      };
    });

    this.functions.push({
      name: name,
      description: description,
      parameters: {
        type: SchemaType.OBJECT,
        properties: propertiesObject,
      },
    });

    this.functionExecutors[name] = functionToRun;
  }

  async generateEmbeddings(text) {
    const result = await this.embeddingsModel.embedContent(text);
    return result.embedding.values;
  }

  async printResponse(message) {
    var iter = this.run(message);
    var fullResponse = "";

    while (true) {
      const { value, done } = await iter.next();
      fullResponse += value;
      console.log(value);
      if (done) {
        break;
      }
    }

    return fullResponse;
  }

  async *run(messageContent, _chat) {
    const chat = _chat || this.model.startChat();
    const response = await chat.sendMessageStream(messageContent);

    for await (const part of response.stream) {
      const functionCalls = part.functionCalls();
      if (Array.isArray(functionCalls)) {
        const functionResults = [];
        for (const functionCall of functionCalls) {
          yield "- Running Function: " + functionCall.name;
          const functionExecutor = this.functionExecutors[functionCall.name];

          if (functionExecutor) {
            const result = await functionExecutor(functionCall.args);
            functionResults.push({
              functionResponse: {
                name: functionCall.name,
                response: {
                  name: functionCall.name,
                  content: result,
                },
              },
            });
          }
        }

        yield* this.run(
          [
            {
              functionResponse: {
                name: "ListFiles",
                response: {
                  name: "ListFiles",
                  content: { weather: "super nice" },
                },
              },
            },
          ],
          chat
        );
      }

      const text = part.text();
      if (text) {
        yield text;
      }
    }

    return response;
  }
}
