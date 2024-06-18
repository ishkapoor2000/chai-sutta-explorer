const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
// @ts-ignore
const { TreeItem, TreeItemCollapsibleState } = require('vscode');
const acorn = require('acorn');
const acornLoose = require('acorn-loose');
const walk = require('acorn-walk');

let chaiSuttaTreeDataProvider;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Extension "Chai Sutta Explorer" is now active!');

	// Check if methodInfo is empty and show a notification
	const configuration = vscode.workspace.getConfiguration('chaiSuttaExplorer');
	const methodInfoConfig = configuration.get('methodInfo');
	if (!methodInfoConfig || Object.keys(methodInfoConfig).length === 0) {
		vscode.window.showWarningMessage(
			'Chai Sutta Explorer: Methods are empty. Please configure methods in settings.',
			'Open Settings'
		).then(selection => {
			if (selection === 'Open Settings') {
				vscode.commands.executeCommand('workbench.action.openSettings', 'chaiSuttaExplorer.methodInfo');
			}
		});
	}

	let disposableWebview = vscode.commands.registerCommand('chai-sutta-explorer.showChaiSuttaSpots', function () {
		console.log('Command "chai-sutta-explorer.showChaiSuttaSpots" executed');

		const panel = vscode.window.createWebviewPanel(
			'chaiSuttaExplorer',
			'Chai Sutta Explorer',
			vscode.ViewColumn.One,
			{
				enableScripts: true // Enable scripts in the webview
			}
		);

		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			const folderPath = workspaceFolders[0].uri.fsPath;

			try {
				const apiCalls = findAPICalls(folderPath);
				panel.webview.html = getWebviewContent(apiCalls);
			} catch (error) {
				console.error('Error finding API calls:', error);
				panel.webview.html = getWebviewContent();
			}
		} else {
			console.error('No workspace folder found');
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

	context.subscriptions.push(disposableWebview);

	context.subscriptions.push(vscode.commands.registerCommand('chai-sutta-explorer.filterTreeView', async () => {
		const filter = await vscode.window.showInputBox({
			placeHolder: 'Type to filter API calls by method name'
		});
		chaiSuttaTreeDataProvider.setFilter(filter);
		chaiSuttaTreeDataProvider.refresh();
	}));

	// Register the tree view
	chaiSuttaTreeDataProvider = new ChaiSuttaTreeDataProvider(context);
	vscode.window.registerTreeDataProvider('chaiSuttaExplorerTreeView', chaiSuttaTreeDataProvider);

	// Register the command to refresh the tree view
	context.subscriptions.push(vscode.commands.registerCommand('chai-sutta-explorer.refreshTreeView', () => {
		chaiSuttaTreeDataProvider.refresh();
	}));

	// Register the command to open a file at a specific line
	context.subscriptions.push(vscode.commands.registerCommand('chai-sutta-explorer.openFileAtLine', async (file, line) => {
		const fileUri = vscode.Uri.file(file);
		const document = await vscode.workspace.openTextDocument(fileUri);
		const editor = await vscode.window.showTextDocument(document);
		const lineToGo = line - 1; // VS Code lines are 0-based

		editor.selections = [new vscode.Selection(lineToGo, 0, lineToGo, 0)];
		editor.revealRange(new vscode.Range(lineToGo, 0, lineToGo, 0), vscode.TextEditorRevealType.InCenter);
	}));

}

function findAPICalls(dir) {

	let apiCalls = [];
	const configuration = vscode.workspace.getConfiguration('chaiSuttaExplorer');
	const ignorePatterns = configuration.get('ignorePatterns');

	const jsFiles = glob.sync(`${dir}/**/*.{js,jsx,ts,tsx}`, { ignore: ignorePatterns });
	const pyFiles = glob.sync(`${dir}/**/*.py`, { ignore: ignorePatterns });

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
					// @ts-ignore
					const methodNode = node.arguments[1] && node.arguments[1].properties.find(prop => prop.key.name === 'method');
					const method = methodNode ? methodNode.value.value : 'GET';
					apiCalls.push({ file, call: content.slice(node.start, node.end), line: node.loc.start.line, method });
					// @ts-ignore
				} else if (node.callee.type === 'MemberExpression' && node.callee.object.name === 'axios') {
					// @ts-ignore
					const method = node.callee.property.name.toUpperCase();
					apiCalls.push({ file, call: content.slice(node.start, node.end), line: node.loc.start.line, method });
				} else if (node.callee.type === 'Identifier' && node.callee.name === 'axios') {
					// @ts-ignore
					const methodNode = node.arguments[0] && node.arguments[0].properties.find(prop => prop.key.name === 'method');
					const method = methodNode ? methodNode.value.value.toUpperCase() : 'GET';
					apiCalls.push({ file, call: content.slice(node.start, node.end), line: node.loc.start.line, method });
				}
			},
			NewExpression(node) {
				// @ts-ignore
				if (node.callee.name === 'XMLHttpRequest') {
					walk.simple(node, {
						CallExpression(innerNode) {
							// @ts-ignore
							if (innerNode.callee.property && innerNode.callee.property.name === 'open') {
								// @ts-ignore
								const method = innerNode.arguments[0].value;
								apiCalls.push({ file, call: content.slice(innerNode.start, innerNode.end), line: innerNode.loc.start.line, method });
							}
						}
					});
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
	// Read user configuration
	const configuration = vscode.workspace.getConfiguration('chaiSuttaExplorer');
	const methodInfoConfig = configuration.get('methodInfo');

	// Check if methodInfoConfig is empty
	const isMethodInfoEmpty = !methodInfoConfig || Object.keys(methodInfoConfig).length === 0;

	// Group API calls by method
	const methodCalls = {};
	apiCalls.forEach(call => {
		const { method } = call;
		if (!methodCalls[method]) {
			methodCalls[method] = [];
		}
		if (methodInfoConfig[method]) {
			methodCalls[method].push(call);
		}
	});

	// Generate HTML content for each method section
	let content = `
        <h1>Chai Sutta Spots</h1>
		<div id="loader" style="display: none;">
            <p>Loading...</p>
        </div>
		<div id="content">
    `;

	for (const method in methodCalls) {
		const calls = methodCalls[method];

		const methodName = methodInfoConfig[method]?.name;
		if (calls.length > 0) {
			content += `
                <h2>${methodName} - ${method}</h2>
                <ul>
                    ${calls.map(call => {
				const link = `command:chai-sutta-explorer.openFileAtLine?${encodeURIComponent(JSON.stringify({ file: call.file, line: call.line }))}`;
				return `<li><a title="${call.file}" href="${link}">${path.basename(call.file)}:${call.line}</a> ${call.call}</li>`;
			}).join('')}
                </ul>
            `;
		}
	}

	// If there are no calls for any method, add a message and a link to settings
	if (
		apiCalls.length === 0 ||
		isMethodInfoEmpty) {
		content += `
			<h2>No API calls found.</h2>
			<p>Please configure Methods in the extension settings</p>
			<p>Use the following json as sample and place it in Mothod Info settings. Then execute the command again.</p>
			<code style="white-space: pre-wrap;" onclick="alert('copy')">"GET": {
	"name": "Chai☕"
},
"POST": {
	"name": "Sutta🚬"
},
"PUT": {
	"name": "Chai Latte🍼"
},
"DELETE": {
	"name": "Cold Coffee🍵"
},
"PATCH": {
	"name": "Weed🚭"
},
"UPDATE": {
	"name": "Green Tea🥗"
}</code>
		`;
	}

	content += `</div>`;

	// Add script for VS Code communication
	content += `
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

			document.getElementById('loader').style.display = 'block';
            document.getElementById('content').style.display = 'none';

            window.onload = () => {
                document.getElementById('loader').style.display = 'none';
                document.getElementById('content').style.display = 'block';
            };
        </script>
    `;

	return content;
}

/**
 * Tree view data provider for Chai Sutta Explorer extension.
 */
class ChaiSuttaTreeDataProvider {
	constructor(context) {
		this._context = context;
		this._onDidChangeTreeData = new vscode.EventEmitter();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
		this.filter = '';
	}

	setFilter(filter) {
        this.filter = filter;
    }

    refresh() {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element) {
		return element;
	}

	getChildren(element) {
		if (element) {
			// If we are at a method level, return the API calls for that method
			return Promise.resolve(element.apiCalls.map(call => {
				const item = new TreeItem(`⚡${path.basename(call.file)}:${call.line} ${call.call}`, TreeItemCollapsibleState.None);
				item.command = {
					command: 'chai-sutta-explorer.openFileAtLine',
					title: 'Open file',
					arguments: [call.file, call.line]
				};
				return item;
			}));
		} else {
			// If we are at the root level, return the methods
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders) {
				return Promise.resolve([]);
			}

			const rootPath = workspaceFolders[0].uri.fsPath;
			const apiCalls = findAPICalls(rootPath);
			const methodInfoConfig = vscode.workspace.getConfiguration('chaiSuttaExplorer').get('methodInfo');

			const methodCalls = {};
			apiCalls.forEach(call => {
				const { method } = call;
				if (!methodCalls[method]) {
					methodCalls[method] = [];
				}
				if (methodInfoConfig[method]) {
					methodCalls[method].push(call);
				}
			});

			const items = [];
			for (const method in methodCalls) {
				if (this.filter && !method.toLowerCase().includes(this.filter.toLowerCase())) {
                    continue;
                }

                const calls = methodCalls[method];
				const methodName = methodInfoConfig[method]?.name || method;
				const methodTreeItem = new MethodTreeItem(`${methodName} (${calls.length})`, vscode.TreeItemCollapsibleState.Collapsed, calls);
				items.push(methodTreeItem);
			}

			return Promise.resolve(items);
		}
	}
}

class MethodTreeItem extends vscode.TreeItem {
	constructor(label, collapsibleState, apiCalls = []) {
		super(label, collapsibleState);
		this.apiCalls = apiCalls;
	}
}


// This method is called when your extension is deactivated
function deactivate() {
	console.log('Extension "Chai Sutta Explorer" is now deactivated');
}

module.exports = {
	activate,
	deactivate
}
		