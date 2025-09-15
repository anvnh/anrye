import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, context, selectedText, explainMode } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Get Gemini API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      // Detect language for mock response
      const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(prompt) || 
                           /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(selectedText || '');
      
      // Return a mock response for testing
      let mockResponse;
      if (isVietnamese) {
        mockResponse = `Phản hồi AI mẫu: Tôi hiểu bạn muốn "${prompt}".`;
        if (selectedText && selectedText.trim()) {
          mockResponse += ` Tôi thấy bạn đã chọn text: "${selectedText}". Tôi có thể giúp bạn chỉnh sửa, cải thiện hoặc thay thế text này.`;
        }
        mockResponse += ` Đây là phản hồi thử nghiệm. Vui lòng cấu hình GEMINI_API_KEY trong file .env.local để nhận phản hồi AI thực.`;
      } else {
        mockResponse = `Mock AI Response: I understand you want "${prompt}".`;
        if (selectedText && selectedText.trim()) {
          mockResponse += ` I can see you have selected text: "${selectedText}". I can help you edit, improve, or replace this text.`;
        }
        mockResponse += ` This is a test response. Please configure GEMINI_API_KEY in your .env.local file to get real AI responses.`;
      }
      
      return NextResponse.json({ 
        completion: mockResponse
      });
    }

    // Detect language of the prompt
    const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(prompt) || 
                         /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(selectedText || '');
    
    // Prepare the context for Gemini
    let systemPrompt = `You are a helpful AI writing assistant. Help the user with their note-taking and writing tasks.`;
    
    // Add language instruction
    if (isVietnamese) {
      systemPrompt += `\n\nIMPORTANT: Respond in Vietnamese (Tiếng Việt).`;
    } else {
      systemPrompt += `\n\nIMPORTANT: Respond in English.`;
    }
    
    if (selectedText && selectedText.trim()) {
      // When there's selected text, focus only on that text
      if (explainMode) {
        systemPrompt += `\n\nYou are working with this selected text: "${selectedText}"\n\nUser request: ${prompt}\n\nPlease explain, analyze, or provide information about the selected text above. Provide a detailed explanation or analysis that will replace the "/ai" trigger text.`;
      } else {
        systemPrompt += `\n\nYou are working with this selected text: "${selectedText}"\n\nUser request: ${prompt}\n\nPlease work ONLY with the selected text above. Provide ONLY the final result without any explanations, introductions, or additional text. If they want to edit, improve, translate, or modify the text, provide ONLY the improved version.`;
      }
    } else {
      // When no selected text, use full context
      systemPrompt += `\n\nContext from their notes: ${context || 'No context provided'}\n\nUser request: ${prompt}\n\nPlease provide a helpful, concise response that directly addresses their request. If they're asking for content generation, provide well-structured, useful content.`;
    }

    // Call Gemini API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
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
