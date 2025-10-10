# Productivity Tracker - Chrome Extension

A Chrome extension to track the time you spend on websites, built with Next.js and Tailwind CSS.

## How to Install

1.  **Clone & Install Dependencies**:

    ```bash
    git clone <your-repository-url>
    cd productivity-tracker-extension
    npm install
    ```

2.  **Build the Extension**:

    ```bash
    npm run build
    ```

    This creates the final extension files in the `out/` directory.

3.  **Load into Chrome**:
    - Go to `chrome://extensions` and enable **Developer mode**.
    - Click **"Load unpacked"** and select the `out` folder.
    - Click the extension icon in your toolbar to see your tracked time per website.
