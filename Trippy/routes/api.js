var express = require('express');
var router = express.Router();
var config = require('../config/config.js');

const fsPromises = require('fs').promises;

// use a dynamic import for node-fetch
const axios = require('axios');

router.post('/search', async function(req, res, next) {
  const { query, searchType } = req.body;
  // Basic input validation
  if (!query || !searchType) {
    return res.status(400).json({ error: 'Missing required fields: query, searchType' });
  }
  if (!config.googleApiKey || !config.cx) {
    return res.status(500).json({ error: 'Google API keys not configured' });
  }
  const url = `https://www.googleapis.com/customsearch/v1?key=${config.googleApiKey}&cx=${config.cx}&searchType=${searchType}&q=${encodeURIComponent(query)}`;
  try {
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Error:', error);
    const msg = error.response?.data?.error?.message || error.message || 'Unknown error';
    res.status(502).json({ error: `Google API error: ${msg}` });
  }
});

 const path = require('path');
 const filePath = path.join(__dirname, 'Basic.txt')

const { OpenAI } = require('openai');
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY
});

router.post('/GPTItinerary', async function(req, res, next) {
  try {
    const promptPath = path.join(__dirname, '..', 'Basic.txt');
    const systemPrompt = await fsPromises.readFile(promptPath, 'utf8');
    const { message } = req.body;
    
    if (!config.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Missing or invalid message field' });
    }
    
    // Use fine-tuned model
    const modelId = process.env.ITIN_MODEL_ID || "ft:gpt-4o-mini-2024-07-18:zillow:itins:BS6XMtry";
    console.log(`Using model: ${modelId}`);
    
    // Call OpenAI API and await its response
    let completion;
    try {
      const requestOptions = {
        model: modelId,
        response_format: { type: "json_object" },
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      };
      
      console.log('API request options:', JSON.stringify(requestOptions, null, 2));
      completion = await openai.chat.completions.create(requestOptions);
      
      // Log the response structure to debug
      console.log('API response structure:', JSON.stringify({
        status: completion.status,
        model: completion.model,
        responseKeys: Object.keys(completion),
        choices: completion.choices ? completion.choices.length : 0,
        firstChoice: completion.choices && completion.choices[0] ? 
          {
            keys: Object.keys(completion.choices[0]),
            messageKeys: completion.choices[0].message ? Object.keys(completion.choices[0].message) : null,
            content: completion.choices[0].message ? completion.choices[0].message.content : null
          } : null
      }, null, 2));
      
    } catch (apiErr) {
      console.error('OpenAI API error:', apiErr);
      const msg = apiErr.response?.data?.error?.message || apiErr.message || 'Unknown error';
      return res.status(502).json({ error: `OpenAI API error: ${msg}` });
    }
    
    const responseData = {
      completion: {
        content: completion.choices[0].message.content
      }
    };
    
    console.log('Sending response:', JSON.stringify(responseData, null, 2));
    res.status(200).json(responseData);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

module.exports = router;
