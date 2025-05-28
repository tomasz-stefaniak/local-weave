const { app, Tray, Menu, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let tray = null;
let searchWindow = null;

// Function to execute the search command
async function executeSearch(query) {
  console.log('\n=== Starting Search Process ===');
  console.log('Search query:', query);
  return new Promise((resolve, reject) => {
    console.log('Spawning search process...');
    // Use npm run search to execute the search command
    const searchProcess = spawn('npm', ['run', 'search', query], {
      cwd: path.join(__dirname, '..'),  // Go up one level to the local-weave directory
      shell: true
    });

    let output = '';
    let error = '';

    searchProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      console.log('\n=== Search Process Output ===');
      console.log(chunk);
      output += chunk;
    });

    searchProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      console.error('\n=== Search Process Error ===');
      console.error(chunk);
      error += chunk;
    });

    searchProcess.on('close', (code) => {
      console.log('\n=== Search Process Completed ===');
      console.log('Exit code:', code);
      if (code === 0) {
        try {
          console.log('\n=== Parsing Search Results ===');
          // Parse the output to extract search results
          const results = parseSearchResults(output);
          console.log('Number of results found:', results.length);
          console.log('Parsed results:', JSON.stringify(results, null, 2));
          resolve(results);
        } catch (parseError) {
          console.error('\n=== Error Parsing Results ===');
          console.error('Parse error:', parseError);
          reject(parseError);
        }
      } else {
        console.error('\n=== Search Failed ===');
        console.error('Error output:', error);
        reject(new Error(`Search failed: ${error}`));
      }
    });
  });
}

// Function to parse search results from command output
function parseSearchResults(output) {
  console.log('\n=== Starting Result Parsing ===');
  console.log('Raw output length:', output.length);
  const results = [];
  const lines = output.split('\n');
  console.log('Number of lines to process:', lines.length);
  let currentResult = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      continue;
    }

    // Check if this is a new result (starts with a number and 📄)
    if (line.match(/^\d+\s+📄/)) {
      if (currentResult) {
        results.push(currentResult);
      }
      
      // Extract filename
      const filename = line.split('📄')[1].trim();
      currentResult = {
        title: filename,
        path: '',
        createdAt: '',
        description: '',
        certainty: ''
      };
    } else if (currentResult) {
      // Parse other result details
      if (line.startsWith('📁 Path:')) {
        currentResult.path = line.replace('📁 Path:', '').trim();
      } else if (line.startsWith('🗓️  Created:')) {
        currentResult.createdAt = line.replace('🗓️  Created:', '').trim();
      } else if (line.startsWith('🎯 Relevance:')) {
        const certaintyMatch = line.match(/(\d+\.\d+)%/);
        if (certaintyMatch) {
          currentResult.certainty = certaintyMatch[1];
        }
      } else if (line.startsWith('📝 Content:')) {
        // Get the next line as the content snippet
        if (i + 1 < lines.length) {
          currentResult.description = lines[i + 1].trim();
          i++; // Skip the next line since we've used it
        }
      }
    }
  }

  // Add the last result if exists
  if (currentResult) {
    results.push(currentResult);
  }

  console.log('\n=== Parsing Complete ===');
  console.log('Total results found:', results.length);
  console.log('Parsed results:', JSON.stringify(results, null, 2));
  return results;
}

function createSearchWindow() {
  searchWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false,
    alwaysOnTop: true,
    transparent: true,
    hasShadow: true,
    backgroundColor: '#00000000'
  });

  searchWindow.loadFile('index.html');
  searchWindow.center();
  
  // Open DevTools in development
  searchWindow.webContents.openDevTools();
  
  searchWindow.once('ready-to-show', () => {
    searchWindow.show();
  });

  ipcMain.on('hide-window', () => {
    if (searchWindow) {
      searchWindow.hide();
    }
  });

  // Handle search requests from renderer
  ipcMain.handle('perform-search', async (event, query) => {
    try {
      console.log('Received search request for:', query);
      const results = await executeSearch(query);
      console.log('Sending results back to renderer:', results);
      return results;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  });
}

function toggleSearchWindow() {
  if (searchWindow === null) {
    createSearchWindow();
  } else {
    if (searchWindow.isVisible()) {
      searchWindow.hide();
    } else {
      searchWindow.show();
      searchWindow.focus();
    }
  }
}

app.whenReady().then(() => {
  createSearchWindow();
  
  try {
    const iconPath = path.resolve(__dirname, 'icon.icns');
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Search', click: toggleSearchWindow },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    tray.setToolTip('Local Weave Search');
    tray.setContextMenu(contextMenu);
    tray.on('click', toggleSearchWindow);
  } catch (error) {
    console.error('Error creating tray:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (searchWindow === null) {
    createSearchWindow();
  } else {
    searchWindow.show();
  }
}); 