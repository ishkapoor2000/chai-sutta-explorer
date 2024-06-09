const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const acorn = require('acorn');
const acornLoose = require('acorn-loose');
const walk = require('acorn-walk');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Extension "API Calls Explorer" is now active!');

    let disposable = vscode.commands.registerCommand('chai-sutta-explorer.showChaiSuttaSpots', function () {
        console.log('Command "chai-sutta-explorer.showChaiSuttaSpots" executed');

        const panel = vscode.window.createWebviewPanel(
            'apiCallsExplorer',
            'API Calls Explorer',
            vscode.ViewColumn.One,
            {
                enableScripts: true // Enable scripts in the webview
            }
        );

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const folderPath = workspaceFolders[0].uri.fsPath;
            console.log('Workspace folder path:', folderPath);

            try {
                const apiCalls = findAPICalls(folderPath);
                console.log('API Calls found:', apiCalls);
                panel.webview.html = getWebviewContent(apiCalls);
            } catch (error) {
                console.error('Error finding API calls:', error);
                panel.webview.html = getWebviewContent();
            }
        } else {
            console.log('No workspace folder found');
            panel.webview.html = getWebviewContent();
        }

        panel.webview.onDidReceiveMessage(
            async message => {
                const fileUri = vscode.Uri.file(message.file);
                const document = await vscode.workspace.openTextDocument(fileUri);
                const editor = await vscode.window.showTextDocument(document);
                const lineToGo = message.line - 1; // VS Code lines are 0-based

                editor.selections = [new vscode.Selection(lineToGo, 0, lineToGo, 0)];
                editor.revealRange(new vscode.Range(lineToGo, 0, lineToGo, 0), vscode.TextEditorRevealType.InCenter);
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

function findAPICalls(dir) {
    console.log('Scanning directory:', dir);

    let apiCalls = [];
    const ignorePatterns = [
        '**/node_modules/**',
        '**/config/**',
        '**/Context/**',
        '**/schemas/**',
        '**/utils/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.js',
        '**/*next-env.d.ts',
        '**/*.config.js'
    ];

    const jsFiles = glob.sync(`${dir}/**/*.{js,jsx,ts,tsx}`, { ignore: ignorePatterns });
    const pyFiles = glob.sync(`${dir}/**/*.py`, { ignore: ignorePatterns });

    console.log('JavaScript/TypeScript files:', jsFiles);
    console.log('Python files:', pyFiles);

    jsFiles.forEach(file => {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const calls = findJsApiCalls(content, file);
            apiCalls = apiCalls.concat(calls);
        } catch (error) {
            console.error(`Error reading or parsing JS file ${file}:`, error);
        }
    });

    pyFiles.forEach(file => {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const calls = findPyApiCalls(content, file);
            apiCalls = apiCalls.concat(calls);
        } catch (error) {
            console.error(`Error reading or parsing Python file ${file}:`, error);
        }
    });

    return apiCalls;
}

function findJsApiCalls(content, file) {
    let apiCalls = [];
    try {
        const ast = acornLoose.parse(content, { ecmaVersion: 2020, sourceType: 'module', locations: true });

        walk.simple(ast, {
            CallExpression(node) {
                if (node.callee.type === 'Identifier' && node.callee.name === 'fetch') {
                    const methodNode = node.arguments[1] && node.arguments[1].properties.find(prop => prop.key.name === 'method');
                    const method = methodNode ? methodNode.value.value : 'GET';
                    apiCalls.push({ file, call: content.slice(node.start, node.end), line: node.loc.start.line, method });
                }
            }
        });
    } catch (error) {
        console.error(`Error parsing JS content in file ${file}:`, error);
    }
    return apiCalls;
}

function findPyApiCalls(content, file) {
    let apiCalls = [];
    const lines = content.split('\n');
    const regex = /requests\.(get|post|put|delete|patch|options|head)\(([^)]+)\)/g;
    lines.forEach((line, index) => {
        let match;
        while ((match = regex.exec(line)) !== null) {
            apiCalls.push({ file, call: match[0], line: index + 1, method: match[1].toUpperCase() });
        }
    });
    return apiCalls;
}

/**
 * The function `getWebviewContent` generates HTML content displaying a list of API calls with their
 * corresponding file names.
 * @param [apiCalls] - An array of objects representing API calls. Each object has two properties:
 * @returns The function `getWebviewContent` returns a string containing HTML content representing a
 * list of API calls. Each API call is displayed as a list item with the file name and the call itself.
 */
function getWebviewContent(apiCalls = []) {
    let content = `
        <h1>Chai Sutta Spots</h1>
        <h2>Chai - GET</h2>
		<ul>
			${apiCalls.filter(call => call.method === 'GET').map(apiCall => {
				const link = `command:chai-sutta-explorer.openFileAtLine?${encodeURIComponent(JSON.stringify({ file: apiCall.file, line: apiCall.line }))}`;
				return `<li><a title="${apiCall.file}" href="${link}">${path.basename(apiCall.file)}:${apiCall.line}</a> ${apiCall.call}</li>`;
			}).join('')}
		</ul>
		<h2>Sutta - POST</h2>
		<ul>
			${apiCalls.filter(call => call.method === 'POST').map(apiCall => {
				const link = `command:chai-sutta-explorer.openFileAtLine?${encodeURIComponent(JSON.stringify({ file: apiCall.file, line: apiCall.line }))}`;
				return `<li><a title="${apiCall.file}" href="${link}">${path.basename(apiCall.file)}:${apiCall.line}</a> ${apiCall.call}</li>`;
			}).join('')}
		</ul>
        <script>
            const vscode = acquireVsCodeApi();
            document.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const href = e.target.getAttribute('href');
                    const data = JSON.parse(decodeURIComponent(href.split('?')[1]));
                    vscode.postMessage(data);
                });
            });
        </script>
    `;
    return content;
}

// This method is called when your extension is deactivated
function deactivate() {
    console.log('Extension "API Calls Explorer" is now deactivated');
}

module.exports = {
    activate,
    deactivate
}
