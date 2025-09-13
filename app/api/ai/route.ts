import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, context } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Get Gemini API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      // Return a mock response for testing
      return NextResponse.json({ 
        completion: `Mock AI Response: I understand you want "${prompt}". This is a test response. Please configure GEMINI_API_KEY in your .env.local file to get real AI responses.`
      });
    }

    // Prepare the context for Gemini
    const systemPrompt = `You are a helpful AI writing assistant. Help the user with their note-taking and writing tasks. 
    
Context from their notes: ${context || 'No context provided'}

User request: ${prompt}

Please provide a helpful, concise response that directly addresses their request. If they're asking for content generation, provide well-structured, useful content.`;

    // Call Gemini API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    console.log('Calling Gemini API:', apiUrl);
    
    const requestBody = {
      contents: [{
        parts: [{
          text: systemPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', response.status, errorData);
      
      // Return a fallback response instead of error
      return NextResponse.json({ 
        completion: `I'm having trouble connecting to the AI service. Please check your internet connection and try again. (Error: ${response.status})`
      });
    }

    const data = await response.json();
    
    // Extract the generated text from Gemini response
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

    return NextResponse.json({ 
      completion: generatedText.trim()
    });

  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      completion: 'Sorry, I encountered an error. Please try again.'
    }, { status: 500 });
  }
}
