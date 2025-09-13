'use client';

import { Extension } from '@codemirror/state';
import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

export interface AICompletionOptions {
  onAIRequest: (prompt: string, context: string) => Promise<string>;
}

// AI Service for making requests
export class AIService {
  static async requestCompletion(prompt: string, context: string): Promise<string> {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          context,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('AI API error:', errorData);
        throw new Error(errorData.error || 'AI request failed');
      }

      const data = await response.json();
      return data.completion || 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('AI request error:', error);
      // Return a fallback response instead of throwing
      return 'Sorry, I encountered an error. Please check your internet connection and try again.';
    }
  }
}

export function createAIAutocompleteExtension(options: AICompletionOptions): Extension {
  return autocompletion({
    override: [
      async (context: CompletionContext): Promise<CompletionResult | null> => {
        const { state, pos } = context;
        const line = state.doc.lineAt(pos);
        const text = state.doc.sliceString(line.from, pos);
        
        // Check if user is typing "/ai "
        if (/\/ai\s$/.test(text)) {
          return {
            from: pos - 4,
            to: pos,
            options: [
              {
                label: 'AI Assistant',
                type: 'text',
                detail: 'Open AI floating input',
                apply: () => {
                  // This will be handled by the parent component
                  return '';
                }
              }
            ]
          };
        }
        
        return null;
      }
    ]
  });
}
