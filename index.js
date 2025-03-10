// index.js
const express = require('express');
const { chromium } = require('playwright');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Add body parsing middleware BEFORE routes
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // You'll need to set this environment variable
});

/**
 * Example route that uses Playwright to scrape or do some quick action
 * For demonstration, we'll do a short headless navigation and return the page's title.
 */
app.get('/', async (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Roster Support Magic</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" rel="stylesheet" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/toolbar/prism-toolbar.min.css" rel="stylesheet" />
      <style>
        body { 
          font-family: Arial, sans-serif; 
          max-width: 800px; 
          margin: 40px auto; 
          padding: 0 20px; 
        }
        .form-group { 
          margin-bottom: 20px;
          display: flex;
          gap: 10px;
          align-items: flex-end;
        }
        .input-container {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        input[type="url"] { 
          padding: 8px; 
          margin-top: 8px; 
        }
        button { 
          padding: 10px 20px; 
          background: #0066ff; 
          color: white; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer;
          height: 37px;
        }
        .button:hover {
          background: #0052cc;
        }
        button:disabled {
          background: #cccccc;
        }
        .error { 
          color: red; 
          display: none; 
          margin-top: 5px; 
        }
        #loading { 
          display: none; 
          margin-top: 20px; 
        }
        #transcript {
          white-space: pre-wrap;
          background: #f5f5f5;
          padding: 20px;
          margin-top: 20px;
          display: none;
        }
        #analysisLoading {
          display: none;
          margin-top: 20px;
        }
        .code-container {
          position: relative;
          margin-top: 20px;
          display: none;
        }
        .copy-button {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 5px 10px;
          background: #0066ff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .copy-button:hover {
          background: #0052cc;
        }
        pre[class*="language-"] {
          margin-top: 0;
          padding: 2.5em;
          border-radius: 4px;
          white-space: pre-wrap;       /* CSS3 */
        }
        code[class*="language-"] {
          white-space: pre-wrap !important;
        }
      </style>
    </head>
    <body>
      <h1>Loom Transcript Extractor</h1>
      
      <form id="transcriptForm" onsubmit="return false;">
        <div class="form-group">
          <div class="input-container">
            <label for="loomUrl">Loom Video URL</label>
            <input type="url" id="loomUrl" required 
                   placeholder="https://www.loom.com/share/..." 
                   pattern="https://www\.loom\.com/share/[a-zA-Z0-9]+(\?.*)?$"
            >
            <div class="error" id="urlError">Please enter a valid Loom URL (https://www.loom.com/share/...)</div>
          </div>
          <button type="submit" id="submitBtn">Make magic ✨</button>
        </div>
      </form>

      <div id="loading">
        Extracting Loom transcript...
      </div>

      <div id="analysisLoading">
        Generating article from transcript...
      </div>

      <pre id="transcript"></pre>
      <div id="analysis" class="code-container">
        <button class="copy-button" onclick="copyToClipboard()">Copy</button>
        <pre><code class="language-markdown"></code></pre>
      </div>

      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markdown.min.js"></script>
      <script>
        const form = document.getElementById('transcriptForm');
        const urlInput = document.getElementById('loomUrl');
        const urlError = document.getElementById('urlError');
        const loading = document.getElementById('loading');
        const transcript = document.getElementById('transcript');
        const submitBtn = document.getElementById('submitBtn');
        const analysisLoading = document.getElementById('analysisLoading');
        const analysis = document.getElementById('analysis');

        urlInput.addEventListener('input', () => {
          urlError.style.display = 'none';
        });

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const url = urlInput.value.trim().split('?')[0];
          
          if (!url.match(new RegExp('^https://www\.loom\.com/share/[a-zA-Z0-9]+$'))) {
            console.log('URL validation failed');
            urlError.style.display = 'block';
            return;
          }

          loading.style.display = 'block';
          transcript.style.display = 'none';
          analysis.style.display = 'none';
          submitBtn.disabled = true;

          try {
            // Get transcript
            const response = await fetch(\`/scrape?url=\${encodeURIComponent(url)}\`);
            if (!response.ok) throw new Error('Failed to fetch transcript');
            
            const transcriptText = await response.text();
            transcript.textContent = transcriptText;
            // transcript.style.display = 'block';

            // Show analysis loading state
            analysisLoading.style.display = 'block';

            // Get AI analysis
            const analysisResponse = await fetch('/analyze-transcript', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                transcript: transcriptText,
                originalUrl: url 
              }),
            });

            if (!analysisResponse.ok) {
              throw new Error('Failed to analyze transcript');
            }

            const analysisResult = await analysisResponse.json();
            const codeElement = document.querySelector('#analysis code');
            codeElement.textContent = analysisResult.response;
            analysis.style.display = 'block';
            
            // Trigger Prism to highlight the new content
            Prism.highlightElement(codeElement);

          } catch (error) {
            alert('Error: ' + error.message);
          } finally {
            loading.style.display = 'none';
            analysisLoading.style.display = 'none';
            submitBtn.disabled = false;
          }
        });

        function copyToClipboard() {
          const codeElement = document.querySelector('#analysis code');
          const textToCopy = codeElement.textContent;
          
          navigator.clipboard.writeText(textToCopy).then(() => {
            const copyButton = document.querySelector('.copy-button');
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
              copyButton.textContent = 'Copy';
            }, 2000);
          }).catch(err => {
            console.error('Failed to copy:', err);
          });
        }
      </script>
    </body>
    </html>
  `);
});

app.get('/scrape', async (req, res) => {
  const urlToScrape = req.query.url;
  if (!urlToScrape) {
    return res.status(400).send('Please provide ?url= parameter.');
  }

  let browser;
  try {
    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    let transcriptData = null;

    // Listen for network responses to find the transcript call
    context.on('response', async (response) => {
      const url = response.url();
      if (url.includes('cdn.loom.com/mediametadata/transcription') && url.includes('.json')) {
        try {
          transcriptData = await response.json();
        } catch (err) {
          console.error('Error parsing transcript JSON:', err);
        }
      }
    });

    // Create new page and go to Loom URL
    const page = await context.newPage();
    await page.goto(urlToScrape);
    await page.waitForLoadState('domcontentloaded');

    // Try to click transcript button if needed
    const transcriptButtonSelector = 'button[data-testid="sidebar-tab-Transcript"]';
    try {
      await page.waitForSelector(transcriptButtonSelector, { timeout: 5000 });
      await page.click(transcriptButtonSelector);
    } catch (err) {
      // Button might not be needed, continue
    }

    // Wait for transcript request to complete
    await page.waitForTimeout(5000);

    // Format transcript if found
    if (!transcriptData) {
      throw new Error('No transcript data found');
    }

    let formattedTranscript = '';
    if (Array.isArray(transcriptData.phrases)) {
      transcriptData.phrases.forEach((phrase) => {
        const timeLabel = formatTimestamp(phrase.ts);
        formattedTranscript += `[${timeLabel}] ${phrase.value}\n`;
      });
    } else {
      throw new Error('Unexpected transcript data format');
    }

    return res.send(formattedTranscript);

  } catch (error) {
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Add this new route
app.post('/analyze-transcript', async (req, res) => {
  try {
    const { transcript, originalUrl } = req.body;
    
    if (!transcript || !originalUrl) {
      return res.status(400).json({ error: 'Transcript and original URL are required' });
    }

    // Extract video ID from the original URL
    const videoId = originalUrl.split('/').pop();

    // Create the template replacement
    const videoWalkthroughReplacement = `
:::iframe{iframeHeight="0" code="<div style=&#x22;position: relative; padding-bottom: 58.31533477321814%; height: 0;&#x22;><iframe src=&#x22;https://www.loom.com/embed/${videoId}&#x22; frameborder=&#x22;0&#x22; webkitallowfullscreen mozallowfullscreen allowfullscreen style=&#x22;position: absolute; top: 0; left: 0; width: 100%; height: 100%;&#x22;></iframe></div>"}

:::

:::expandable-heading
### Video transcript

This is a transcript from the Loom video walkthrough.

${transcript}
:::`;

    const needHelpReplacement = `
If you need any additional assistance with with your Roster account, feel free to contact our support team at [support@getroster.com](mailto:support@getroster.com). We're here to help!
`;

    // Get response from OpenAI
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Here is the Loom transcript: ${transcript}`
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID,
    });

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    let assistantResponse = messages.data[0].content[0].text.value;

    // Replace the template marker with our constructed section
    assistantResponse = assistantResponse.replace('{{videoWalkthroughSection}}', videoWalkthroughReplacement);
    assistantResponse = assistantResponse.replace('{{needHelpSection}}', needHelpReplacement);

    res.json({ response: assistantResponse });

  } catch (error) {
    console.error('Error analyzing transcript:', error);
    res.status(500).json({ error: 'Failed to analyze transcript' });
  }
});

// Export for testing
module.exports = {
  app,
  formatTimestamp
};

// Move the app.listen call inside a conditional
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

function formatTimestamp(tsSeconds) {
    const hours = Math.floor(tsSeconds / 3600);
    const minutes = Math.floor((tsSeconds % 3600) / 60);
    const seconds = Math.floor(tsSeconds % 60);
  
    if (hours > 0) {
      return (
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0')
      );
    }
    return (
      String(minutes).padStart(2, '0') + ':' +
      String(seconds).padStart(2, '0')
    );
  }