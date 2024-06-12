# Chai-Sutta Manager
**Manage Your API Zen with Chai and Sutta!**

Welcome to the Chai-Sutta Manager, your ultimate companion for handling all your API calls in style! Because coding runs on chai (GET) and sutta (POST)!

## Currently Supports

- JavaScript files (.js, .jsx, .ts, .tsx)
- Fetch Requests (GET, POST)

## Upcoming

Support for API calls in langauges
- Python
- Java
- Ruby
- PHP
- Go

More API call methods
[x] PUT (_Chai Latte_)
- DELETE (_Cold Coffee_)
- PATCH (_Weed_)
- UPDATE (_Green Tea_)

More API request frameworks
- Axios
- Requests
- XMLHttps

## Features

Explore and manage your API calls effortlessly with our extension. Need a break? Grab a chai (GET) or sutta (POST) and keep coding like a pro!

- Scans your project for API calls using `fetch` in JavaScript/TypeScript and `requests` in Python.
- Displays the API calls in a dedicated webview panel.
- Allows you to jump directly to the API call location in the source code.

## Usage
- Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P on macOS).
- Type >`Show Chai Sutta Spots` and select it.
- The Chai Sutta Explorer panel will display all found API calls, categorized by HTTP method.
- Click on any API call link to navigate directly to the source code location.


## Configuration

You can customize the behavior of the Chai Sutta Explorer extension using the following settings:
`chaiSuttaExplorer.ignorePatterns`

Specifies glob patterns to ignore when searching for API calls. This setting helps exclude unnecessary files or directories from the scan.

#### Default Value

```json
{
  "chaiSuttaExplorer.ignorePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/*.test.js",
    "**/*.config.js"
  ]
}
```
How to Configure
- Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P on macOS`).
- Type Preferences: Open Settings (JSON) and select it.
- Add or modify the `chaiSuttaExplorer.ignorePatterns` setting as desired. 


## Customizing Method Names

You can customize the display names for different HTTP methods via the `chaiSuttaExplorer.methodInfo` setting. This allows you to personalize the way API methods are represented in the extension.

### How to Configure

1. **Open Settings**:
   - Go to File > Preferences > Settings (or press `Ctrl + ,`).
   - Alternatively, open the Command Palette (`Ctrl + Shift + P`) and type "Preferences: Open Settings (UI)".

2. **Search for Chai Sutta Explorer**:
   - In the Settings search bar, type `chaiSuttaExplorer` to filter settings related to this extension.

3. **Edit Method Info**:
   - Find the `chaiSuttaExplorer.methodInfo` setting. This setting allows you to specify custom names for different HTTP methods.
   - Click on `Edit in settings.json` to open your settings file in JSON format.

4. **Add Your Custom Names**:
   - Add your custom names for the methods in the JSON file. Here's an example configuration:

```json
{
    "chaiSuttaExplorer.methodInfo": {
        "GET": {
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
        }
    }
}
```

## Requirements

Just bring your love for chai and sutta, and you're all set to manage your API calls like a boss!

## Extension Settings

This extension offers the following settings:

* `chaiSuttaManager.enable`: Enable/disable this extension.
* `chaiSuttaManager.location`: Set your preferred chai-sutta spot for coding inspiration.

## Using the Extension

- **Open a Project**: Open a project folder that contains JavaScript, TypeScript, or Python files.
- **Run the Command**: Open the Command Palette ```(Ctrl + Shift + P)``` and type *Chai Sutta Explorer: Show Chai Sutta Spots* to execute the command.
- **View API Calls**: A new panel will open in the VS Code editor, displaying your API calls grouped by method with your custom names.

## Known Issues

No known issues. We're too busy enjoying our chai-sutta and managing API calls like a breeze!

## Release Notes

### 2.5.2

Enhance your coding zen with the Chai-Sutta Manager!

---
## For more information

* [Ask us a question](https://marketplace.visualstudio.com/items?itemName=IshKapoor.chai-sutta-explorer&ssr=false#review-details)
* [Write a review](https://marketplace.visualstudio.com/items?itemName=IshKapoor.chai-sutta-explorer&ssr=false#review-details)

**Happy Coding with Chai-Sutta Management!**