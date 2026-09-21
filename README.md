## Prerequisites

Before getting started, make sure you have the following installed on your system:
* **Node.js**: 
  * **v20 or higher**: If you only want to run or edit the application in normal development mode.
  * **v25.5.0 or higher**: Strictly required if you want to use the native `--build-sea` command to compile the standalone `.exe`.
* **npm**: (Comes bundled with Node.js).

---

## How to Run (Development Mode)

If you are just editing the code and want to test changes quickly without compiling an executable file, follow these steps:

1. Open your terminal in the project directory.
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Launch the application using Node.js:
   ```bash
   node server.js
   ```
4. Open your browser and navigate to `http://localhost:3000` if it doesn't do so already.

---

## How to Build a Standalone Executable (`.exe`)

This method bundles your JavaScript files, styles, and third-party modules (like Express) into a single standalone Windows executable binary. **Users will not need Node.js installed to run this executable.**

### Step 1: Install Build Dependencies
Ensure your dependencies are locally cached so the compiler can access them:
```bash
npm install
```

### Step 2: Bundle Code with esbuild
Because Node's executable environment only parses unified CommonJS scripts natively, compile your ES modules into a production bundle:
```bash
npx esbuild server.js --bundle --platform=node --format=cjs --outfile=dist/bundle.js
```

### Step 3: Compile the Executable Binary
Verify that your `sea-config.json` is configured properly, then invoke the internal Node.js single-executable builder:
```bash
node --build-sea sea-config.json
```

Your fresh, production-ready binary (`VRC-Log-Viewer.exe` or your configured output name) will appear right inside your root directory.
