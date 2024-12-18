export const MOCK_MESSAGES = [
  {
    role: "user",
    content: "Tell me about Rename Variables",
  },
  {
    role: "assistant",
    content:
      '\nRunning:\n - search_knowledge_base(query=Rename Variables)\n\n**Rename Variables** is an option in JavaScript obfuscation tools like JSConfuser that determines whether variables in the code should be renamed to obscure their original names, making the code harder to understand for someone trying to reverse-engineer it. Here are some key points about the "Rename Variables" feature:\n\n- **Option Name:** `"renameVariables"`\n- **Option Values:** Can be `true`, `false`, or a custom `Function`.\n\n### Functionality\n- When enabled, variables will be renamed to enhance the obfuscation of the code. This helps in preventing easy readability and understanding of the code logic.\n- The renaming can be controlled, allowing for custom renaming strategies or exceptions (e.g., not renaming specific variables).\n\n### Input / Output Example\nAn example is showcased where a function `twoSum` is transformed to have variables with obfuscated names when the option is set as follows:\n\n```javascript\nmodule.exports = { \n  target: \'browser\', \n  renameVariables: true, \n  compact: false, \n  minify: true \n};\n```\n\n### Special Syntax\n- **Access the Renamed Variable:** The comment syntax `/* @js-confuser-var */ "varName"` allows access to variable mappings, particularly useful when using `eval()` functions.\n  \n  ```javascript\n  // Input\n  var message = "Hello world!";\n  eval(`console.log(${ /* @js-confuser-var */ "message" })`);\n  // Output\n  var nSgZyJf = "Hello world!";\n  eval(`console.log(nSgZyJf)`);\n  ```\n  \n- **Prevent Renaming:** To prevent renaming a variable, prefix it with `__NO_JS_CONFUSER_RENAME__`.\n\n  ```javascript\n  var __NO_JS_CONFUSER_RENAME__message1 = "My first message";\n  var message2 = "My other message";\n  ```\n\n### Custom Implementation\n- Using a function in `options.renameVariables(varName)` allows for the inclusion of logic to decide which variable names should be changed.\n\n### Usage Example\nAn example in code form is provided to obfuscate the file `input.js`:\n\n```javascript\nimport JSConfuser from "js-confuser";\nimport {readFileSync, writeFileSync} from "fs";\n\n// Read input code\nconst sourceCode = readFileSync("input.js", "utf8");\nconst options = { \n  target: \'browser\', \n  renameVariables: true \n};\n\nJSConfuser.obfuscate(sourceCode, options).then((result) => {\n  // Write output code\n  writeFileSync("output.js", result.code);\n}).catch(err => {\n  // Error occurred\n  console.error(err);\n});\n```\n\nFor more details, you can refer to the [Rename Variables documentation](https://js-confuser.com/docs/options/renameVariables).',
  },
];
