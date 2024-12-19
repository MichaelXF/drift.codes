import * as acorn from "acorn";
import acornTypeScript from "acorn-typescript";
import * as babelParser from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";

const escodegen = require("escodegen");
const prettier = require("prettier/standalone");
const parserBabel = require("prettier/parser-babel");
const parserTypeScript = require("prettier/parser-typescript");
const prettierPluginEstree = require("prettier/plugins/estree");

export async function formatCode(requestID, code, language = "javascript") {
  let formattedCode;
  try {
    if (language === "javascript") {
      formattedCode = await prettier.format(code, {
        parser: "babel",
        plugins: [parserBabel, prettierPluginEstree],
        singleQuote: true,
      });
    } else if (language === "typescript") {
      formattedCode = await prettier.format(code, {
        parser: "typescript",
        plugins: [parserTypeScript, prettierPluginEstree], // Use TypeScript parser
        singleQuote: true,
      });
    } else if (language === "json") {
      formattedCode = await prettier.format(code, {
        parser: "json",
      });
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }
  } catch (err) {
    postMessage({
      event: "error",
      data: {
        requestID: requestID,
        error: err,
      },
    });
    return;
  }

  postMessage({
    event: "success",
    data: {
      requestID: requestID,
      code: formattedCode,
    },
  });
}

export function convertTSCodeToJSCode(requestID, code) {
  try {
    // Parse the TypeScript code into an AST
    const ast = babelParser.parse(code, {
      sourceType: "module",
      plugins: ["typescript"], // Enable TypeScript parsing
    });

    // Traverse and remove TypeScript-specific nodes
    traverse(ast, {
      TSTypeAnnotation(path) {
        path.remove(); // Remove type annotations
      },
      TSTypeAliasDeclaration(path) {
        path.remove(); // Remove type alias declarations
      },
      TSInterfaceDeclaration(path) {
        path.remove(); // Remove interface declarations
      },
      TSAsExpression(path) {
        path.replaceWith(path.node.expression); // Replace `as` expressions with the inner expression
      },
      TSTypeParameterInstantiation(path) {
        path.remove(); // Remove type parameter instantiations
      },
      TSTypeParameterDeclaration(path) {
        path.remove(); // Remove type parameter declarations
      },
      TSDeclareFunction(path) {
        path.remove(); // Remove declared functions
      },
      TSModuleDeclaration(path) {
        path.remove(); // Remove TypeScript namespaces
      },
      TSEnumDeclaration(path) {
        path.remove(); // Remove enums
      },
    });

    // Generate the resulting JavaScript code
    const { code: jsCode } = generate(ast);

    // Return the processed code
    postMessage({
      event: "success",
      data: {
        requestID: requestID,
        code: jsCode,
      },
    });
  } catch (error) {
    // Handle errors and return the error message
    postMessage({
      event: "error",
      data: {
        requestID: requestID,
        error: error.message,
      },
    });
  }
}
