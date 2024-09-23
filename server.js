const express = require('express');
const multer = require('multer');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const textToSpeech = require('@google-cloud/text-to-speech');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Set up Google Vision client for OCR
const visionClient = new ImageAnnotatorClient();

// Set up Google Text-to-Speech client
const ttsClient = new textToSpeech.TextToSpeechClient();

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware to parse JSON requests
app.use(express.json());

// POST route to scan product label
app.post('/api/scan-label', upload.single('labelImage'), async (req, res) => {
    try {
      const filePath = req.file.path;
  
      // Perform OCR using Google Vision API
      const [result] = await visionClient.textDetection(filePath);
      const textAnnotations = result.textAnnotations;
  
      if (textAnnotations.length > 0) {
        const extractedText = textAnnotations[0].description;
        res.json({ success: true, text: extractedText });
      } else {
        res.status(400).json({ success: false, message: 'No text found' });
      }
    } catch (error) {
      console.error('Error processing label', error);
      res.status(500).json({ success: false, message: 'OCR failed' });
    }
  });

  app.post('/api/health-analysis', async (req, res) => {
    try {
      const { productData } = req.body;
  
      // Example analysis logic
      const harmfulIngredients = ['sugar', 'trans fat'];
      const foundHarmful = productData.ingredients.filter(ingredient =>
        harmfulIngredients.includes(ingredient.toLowerCase())
      );
  
      res.json({
        success: true,
        analysis: {
          harmfulIngredients: foundHarmful.length > 0 ? foundHarmful : 'None',
          calories: productData.nutritionalInfo.calories,
        },
      });
    } catch (error) {
      console.error('Error in health analysis', error);
      res.status(500).json({ success: false, message: 'Health analysis failed' });
    }
  });

  app.post('/api/voice-feedback', async (req, res) => {
    try {
      const { healthSummary } = req.body;
  
      const request = {
        input: { text: healthSummary },
        voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3' },
      };
  
      // Perform Text-to-Speech
      const [response] = await ttsClient.synthesizeSpeech(request);
      const audioContent = response.audioContent;
  
      // Return the audio file (base64 encoded)
      res.json({
        success: true,
        audioContent: audioContent.toString('base64'),
      });
    } catch (error) {
      console.error('Error generating voice feedback', error);
      res.status(500).json({ success: false, message: 'Voice feedback failed' });
    }
  });

