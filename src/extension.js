const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const cors = require('cors'); // Add CORS package
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all origins (or specify allowed origins)
app.use(cors({
  origin: 'https://x.com', // Allow requests from x.com
  methods: ['GET', 'POST'], // Allow these HTTP methods
  allowedHeaders: ['Content-Type'], // Allow these headers
}));

app.use(express.json());

// Initialize Google Generative AI with API key from environment
const genAI = new GoogleGenerativeAI('');

// Base Cloudinary URL
const CLOUDINARY_BASE_URL = 'https://d3cvnrw4bpahxk.cloudfront.net/thedogepound/original/';

// Fetch image from Cloudinary and convert to base64
async function fetchCloudinaryImage(dogeNumber) {
  const url = `${CLOUDINARY_BASE_URL}${dogeNumber}.png`;
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    return base64Image;
  } catch (error) {
    throw new Error('Failed to fetch image from Cloudinary: ' + error.message);
  }
}

// API endpoint for generating modified Doge image
app.post('/api/generate-doge', async (req, res) => {
  const { dogeNumber, prompt } = req.body;

  // Validate inputs
  if (!dogeNumber || isNaN(dogeNumber) || dogeNumber < 0 || dogeNumber > 9999) {
    return res.status(400).json({ error: 'Invalid Doge number. Must be between 0 and 9999.' });
  }
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  try {
    // Fetch and convert image to base64
    const base64Image = await fetchCloudinaryImage(dogeNumber);

    // Prepare content for Gemini model
    const contents = [
      { text: `Modify this Doge image to: ${prompt}` },
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Image
        }
      }
    ];

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp-image-generation',
      generationConfig: {
        responseModalities: ['Text', 'Image']
      }
    });

    // Generate content
    const response = await model.generateContent(contents);
    const parts = response.response.candidates[0].content.parts;

    for (const part of parts) {
      if (part.inlineData) {
        return res.json({
          success: true,
          image: part.inlineData.data, // Return base64 image
          mimeType: part.inlineData.mimeType
        });
      } else if (part.text) {
        return res.json({
          success: true,
          text: part.text // Return text if no image
        });
      }
    }

    return res.status(500).json({ error: 'No image or text generated from Gemini.' });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
