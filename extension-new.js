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

    let disposable = vscode.commands.registerCommand('api-calls-explorer.showAPICalls', function () {
        console.log('Command "api-calls-explorer.showAPICalls" executed');

        const panel = vscode.window.createWebviewPanel(
            'apiCallsExplorer',
            'API Calls Explorer',
            vscode.ViewColumn.One,
            {}
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
    });

    context.subscriptions.push(disposable);
}

function findAPICalls(dir) {
    console.log('Scanning directory:', dir);

    let apiCalls = [];
	const ignorePatterns = [
        '**/node_modules/**',
        '**/dist/**',          // Example: Exclude dist directory
        '**/build/**',         // Example: Exclude build directory
        '**/pages/**',         // Example: Exclude build directory
        '**/*.test.js',        // Example: Exclude test files
        '**/*.config.js'         // Example: Exclude spec files
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
        const ast = acornLoose.parse(content, { ecmaVersion: 2020, sourceType: 'module' });

        walk.simple(ast, {
            CallExpression(node) {
                if (node.callee.type === 'Identifier' && node.callee.name === 'fetch') {
                    apiCalls.push({ file, call: content.slice(node.start, node.end) });
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
    const regex = /requests\.(get|post|put|delete|patch|options|head)\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        apiCalls.push({ file, call: match[0] });
    }
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
    let content = '<h1>API Calls</h1><ul>';
    apiCalls.forEach(apiCall => {
        content += `<li><strong>${apiCall.file}</strong>: ${apiCall.call}</li>`;
    });
    content += '</ul>';
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