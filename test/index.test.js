const request = require('supertest');
const { app, formatTimestamp } = require('../index');
const { chromium } = require('playwright');
const OpenAI = require('openai');

// Mock dependencies
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        on: jest.fn(),
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          waitForLoadState: jest.fn(),
          waitForSelector: jest.fn(),
          click: jest.fn(),
          waitForTimeout: jest.fn()
        }),
        close: jest.fn()
      }),
      close: jest.fn()
    })
  }
}));

jest.mock('openai', () => {
  const mockOpenAI = {
    beta: {
      threads: {
        create: jest.fn().mockResolvedValue({ id: 'thread-123' }),
        messages: {
          create: jest.fn().mockResolvedValue({}),
          list: jest.fn().mockResolvedValue({
            data: [{ content: [{ text: { value: 'AI response with {{videoWalkthroughSection}} and {{needHelpSection}}' } }] }]
          })
        },
        runs: {
          create: jest.fn().mockResolvedValue({ id: 'run-123' }),
          retrieve: jest.fn().mockResolvedValue({ status: 'completed' })
        }
      }
    }
  };
  return jest.fn(() => mockOpenAI);
});

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.OPENAI_ASSISTANT_ID = 'test-assistant-id';

describe('Roster Support Magic API', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return the HTML page', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Loom Transcript Extractor');
      expect(response.text).toContain('<form id="transcriptForm"');
    });
  });

  describe('GET /scrape', () => {
    it('should return 400 if no URL is provided', async () => {
      const response = await request(app).get('/scrape');
      expect(response.status).toBe(400);
      expect(response.text).toBe('Please provide ?url= parameter.');
    });

    it('should scrape and format transcript data', async () => {
      // Mock the transcript data that would be captured from the network response
      const mockTranscriptData = {
        phrases: [
          { ts: 10, value: 'Hello world' },
          { ts: 65, value: 'This is a test' }
        ]
      };

      // Setup the mock to simulate finding transcript data
      const mockContext = {
        on: jest.fn((event, callback) => {
          if (event === 'response') {
            callback({
              url: () => 'https://cdn.loom.com/mediametadata/transcription/123.json',
              json: jest.fn().mockResolvedValue(mockTranscriptData)
            });
          }
        }),
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          waitForLoadState: jest.fn(),
          waitForSelector: jest.fn(),
          click: jest.fn(),
          waitForTimeout: jest.fn()
        })
      };

      chromium.launch.mockResolvedValueOnce({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn()
      });

      const response = await request(app)
        .get('/scrape')
        .query({ url: 'https://www.loom.com/share/123abc' });

      expect(response.status).toBe(200);
      expect(response.text).toContain('[00:10] Hello world');
      expect(response.text).toContain('[01:05] This is a test');
      expect(chromium.launch).toHaveBeenCalledWith({ headless: true });
    });

    it('should handle errors when scraping fails', async () => {
      // Mock a failure in the scraping process
      chromium.launch.mockRejectedValueOnce(new Error('Scraping failed'));

      const response = await request(app)
        .get('/scrape')
        .query({ url: 'https://www.loom.com/share/123abc' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Scraping failed' });
    });
  });

  describe('POST /analyze-transcript', () => {
    it('should return 400 if transcript or originalUrl is missing', async () => {
      const response = await request(app)
        .post('/analyze-transcript')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Transcript and original URL are required' });
    });

    it('should process transcript and return AI response', async () => {
      const mockRequest = {
        transcript: 'This is a test transcript',
        originalUrl: 'https://www.loom.com/share/abc123'
      };

      const response = await request(app)
        .post('/analyze-transcript')
        .send(mockRequest);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      
      // Check that the response contains the replaced template markers
      expect(response.body.response).toContain('https://www.loom.com/embed/abc123');
      expect(response.body.response).toContain('This is a test transcript');
      expect(response.body.response).toContain('support@getroster.com');

      // Verify OpenAI API was called correctly
      const openaiInstance = OpenAI();
      expect(openaiInstance.beta.threads.create).toHaveBeenCalled();
      expect(openaiInstance.beta.threads.messages.create).toHaveBeenCalledWith('thread-123', {
        role: 'user',
        content: expect.stringContaining('This is a test transcript')
      });
    });

    it('should handle errors in the OpenAI API', async () => {
      // Mock a failure in the OpenAI API
      const openaiInstance = OpenAI();
      openaiInstance.beta.threads.create.mockRejectedValueOnce(new Error('OpenAI API error'));

      const response = await request(app)
        .post('/analyze-transcript')
        .send({
          transcript: 'This is a test transcript',
          originalUrl: 'https://www.loom.com/share/abc123'
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to analyze transcript' });
    });
  });

  describe('formatTimestamp', () => {
    it('should format seconds to MM:SS when less than an hour', () => {
      expect(formatTimestamp(45)).toBe('00:45');
      expect(formatTimestamp(90)).toBe('01:30');
      expect(formatTimestamp(599)).toBe('09:59');
    });

    it('should format seconds to HH:MM:SS when an hour or more', () => {
      expect(formatTimestamp(3600)).toBe('01:00:00');
      expect(formatTimestamp(3661)).toBe('01:01:01');
      expect(formatTimestamp(7325)).toBe('02:02:05');
    });
  });
});
