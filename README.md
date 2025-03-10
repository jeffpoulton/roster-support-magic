# Loom Transcript Magic

A web application that extracts transcripts from Loom videos and uses AI to generate structured documentation. The tool converts Loom video content into well-formatted markdown documentation with embedded video players and transcripts.

## Features

- Extracts transcripts from Loom videos
- Generates structured markdown documentation using OpenAI
- Embeds Loom video players with proper formatting
- Provides copy-to-clipboard functionality
- Real-time validation of Loom URLs

## Prerequisites

- Node.js (v14 or higher)
- An OpenAI API key
- An OpenAI Assistant ID configured for documentation generation

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Create a `.env` file in the root directory with:
```
OPENAI_API_KEY=your_api_key_here
OPENAI_ASSISTANT_ID=your_assistant_id_here
PORT=3000  # optional, defaults to 3000
```

## Running the Application

1. Start the server:
```bash
node index.js
```
2. Open your browser to `http://localhost:3000`

## Usage

1. Paste a Loom video URL (format: `https://www.loom.com/share/[video-id]`)
2. Click "Make magic ✨"
3. Wait for the transcript extraction and AI analysis
4. Copy the generated markdown using the copy button

## API Endpoints

- `GET /scrape?url=[loom-url]`: Extracts transcript from a Loom video
- `POST /analyze-transcript`: Generates documentation from transcript

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_ASSISTANT_ID`: ID of your OpenAI Assistant
- `PORT`: Server port (optional, defaults to 3000)

## Dependencies

- express
- playwright
- openai
- dotenv

## License

MIT

## Support

For support, please contact [support@getroster.com](mailto:support@getroster.com) 