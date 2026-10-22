const ts = require('typescript');
const path = require('path');

const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, './');

const program = ts.createProgram(parsed.fileNames, parsed.options);

const filesToCheck = ['src/user.controller.ts', 'src/buku.controller.ts', 'src/server.ts'];

filesToCheck.forEach(relPath => {
  const fullPath = path.resolve(relPath);
  const sf = program.getSourceFile(fullPath);
  if (!sf) {
    console.log('Source file not found:', fullPath);
    return;
  }
  const diags = [
    ...program.getSyntacticDiagnostics(sf),
    ...program.getSemanticDiagnostics(sf),
    ...program.getSuggestionDiagnostics ? program.getSuggestionDiagnostics(sf) : []
  ];
  console.log(`=== Diagnostics for ${relPath} (${diags.length} issues) ===`);
  diags.forEach(d => {
    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    console.log(`  Line ${line + 1}:${character + 1} [TS${d.code}]: ${msg}`);
  });
});
