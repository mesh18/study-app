import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-65856507/health", (c) => {
  return c.json({ status: "ok" });
});

// Generate flashcards from study notes with progress tracking
app.post("/make-server-65856507/generate-flashcards", async (c) => {
  try {
    const { notes, userId, progressCallback } = await c.req.json();
    
    if (!notes || typeof notes !== 'string') {
      return c.json({ error: 'Notes are required and must be a string' }, 400);
    }

    // Calculate target number of questions based on content length
    const targetQuestions = calculateQuestionCount(notes);
    
    const huggingfaceApiKey = Deno.env.get('HUGGINGFACE_API_KEY');
    if (!huggingfaceApiKey) {
      console.log('Hugging Face API key not configured, using fallback generation');
      const flashcards = await generateAdvancedFlashcards(notes, targetQuestions);
      const savedFlashcards = await saveFlashcards(flashcards, userId, notes);
      return c.json({ flashcards: savedFlashcards, totalGenerated: flashcards.length });
    }

    try {
      // Generate flashcards in batches with different difficulty levels
      const flashcards = await generateFlashcardsWithProgress(notes, targetQuestions, huggingfaceApiKey);
      
      // Save to database
      const savedFlashcards = await saveFlashcards(flashcards, userId, notes);
      
      return c.json({ flashcards: savedFlashcards, totalGenerated: flashcards.length });
    } catch (aiError) {
      console.log(`AI generation failed: ${aiError}, falling back to advanced generation`);
      const flashcards = await generateAdvancedFlashcards(notes, targetQuestions);
      const savedFlashcards = await saveFlashcards(flashcards, userId, notes);
      return c.json({ flashcards: savedFlashcards, totalGenerated: flashcards.length });
    }
  } catch (error) {
    console.log(`Error generating flashcards: ${error}`);
    return c.json({ error: 'Failed to generate flashcards' }, 500);
  }
});

// Progress tracking endpoint for flashcard generation
app.get("/make-server-65856507/generation-progress/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const progress = await kv.get(`progress:${sessionId}`);
    return c.json({ progress: progress || { current: 0, total: 0, status: 'not_started' } });
  } catch (error) {
    console.log(`Error getting progress: ${error}`);
    return c.json({ error: 'Failed to get progress' }, 500);
  }
});

// File upload endpoint
app.post("/make-server-65856507/upload-file", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return c.json({ error: 'File size exceeds 10MB limit' }, 400);
    }

    // Read file content
    const fileContent = await file.text();
    
    // Extract text based on file type
    let extractedText = '';
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      extractedText = fileContent;
    } else if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
      extractedText = fileContent.replace(/[#*`]/g, ''); // Basic markdown cleanup
    } else {
      // For other file types, try to extract text as plain text
      extractedText = fileContent;
    }

    if (!extractedText.trim()) {
      return c.json({ error: 'No text content found in file' }, 400);
    }

    return c.json({ 
      success: true, 
      text: extractedText,
      fileName: file.name,
      fileSize: file.size 
    });
  } catch (error) {
    console.log(`Error uploading file: ${error}`);
    return c.json({ error: 'Failed to process file upload' }, 500);
  }
});

// Get user's saved flashcards
app.get("/make-server-65856507/flashcards/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const flashcards = await kv.getByPrefix(`flashcards:${userId}:`);
    
    return c.json({ flashcards });
  } catch (error) {
    console.log(`Error retrieving flashcards: ${error}`);
    return c.json({ error: 'Failed to retrieve flashcards' }, 500);
  }
});

// Calculate target number of questions based on content length
function calculateQuestionCount(notes: string) {
  const wordCount = notes.split(/\s+/).length;
  const sentenceCount = notes.split(/[.!?]+/).filter(s => s.trim().length > 10).length;
  
  if (wordCount < 100) return Math.min(5, sentenceCount);
  if (wordCount < 300) return Math.min(10, Math.floor(sentenceCount * 0.7));
  if (wordCount < 600) return Math.min(20, Math.floor(sentenceCount * 0.5));
  return Math.min(30, Math.floor(sentenceCount * 0.4));
}

// Generate flashcards with progress tracking
async function generateFlashcardsWithProgress(notes: string, targetQuestions: number, apiKey: string) {
  const flashcards = [];
  const sessionId = `session_${Date.now()}`;
  
  // Set initial progress
  await kv.set(`progress:${sessionId}`, { current: 0, total: targetQuestions, status: 'generating' });
  
  // Generate different types of questions
  const questionTypes = [
    { type: 'basic', count: Math.ceil(targetQuestions * 0.4), difficulty: 'basic' },
    { type: 'intermediate', count: Math.ceil(targetQuestions * 0.4), difficulty: 'intermediate' },
    { type: 'advanced', count: Math.floor(targetQuestions * 0.2), difficulty: 'advanced' }
  ];
  
  for (const questionType of questionTypes) {
    const prompt = createPromptForDifficulty(notes, questionType.count, questionType.difficulty);
    
    try {
      const response = await fetch(
        'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 800,
              temperature: questionType.difficulty === 'advanced' ? 0.8 : 0.7,
            },
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        const generatedText = result[0]?.generated_text || '';
        const newCards = parseFlashcards(generatedText, notes, questionType.difficulty);
        flashcards.push(...newCards);
        
        // Update progress
        await kv.set(`progress:${sessionId}`, { 
          current: flashcards.length, 
          total: targetQuestions, 
          status: 'generating' 
        });
      }
    } catch (error) {
      console.log(`Error generating ${questionType.type} questions: ${error}`);
    }
  }
  
  // If we don't have enough cards, generate more using fallback method
  if (flashcards.length < targetQuestions) {
    const additionalCards = generateAdvancedFlashcards(notes, targetQuestions - flashcards.length);
    flashcards.push(...additionalCards);
  }
  
  // Final progress update
  await kv.set(`progress:${sessionId}`, { 
    current: flashcards.length, 
    total: targetQuestions, 
    status: 'completed' 
  });
  
  return flashcards.slice(0, targetQuestions);
}

// Create prompts for different difficulty levels
function createPromptForDifficulty(notes: string, count: number, difficulty: string) {
  const basePrompt = `Based on these study notes, generate ${count} question and answer pairs for flashcards.`;
  
  switch (difficulty) {
    case 'basic':
      return `${basePrompt} Focus on basic facts, definitions, and simple recall questions. Format each as "Q: [question] A: [answer]". Notes: ${notes}`;
    case 'intermediate':
      return `${basePrompt} Focus on understanding, application, and analysis questions that require deeper thinking. Format each as "Q: [question] A: [answer]". Notes: ${notes}`;
    case 'advanced':
      return `${basePrompt} Focus on synthesis, evaluation, and critical thinking questions that require connecting multiple concepts. Format each as "Q: [question] A: [answer]". Notes: ${notes}`;
    default:
      return `${basePrompt} Format each as "Q: [question] A: [answer]". Notes: ${notes}`;
  }
}

// Enhanced flashcard parsing with difficulty levels
function parseFlashcards(generatedText: string, originalNotes: string, difficulty: string = 'basic') {
  const flashcards = [];
  
  // Try to extract Q&A pairs from generated text
  const qaPairs = generatedText.match(/Q:\s*(.+?)\s*A:\s*(.+?)(?=Q:|$)/gi);
  
  if (qaPairs && qaPairs.length > 0) {
    qaPairs.forEach((pair, index) => {
      const match = pair.match(/Q:\s*(.+?)\s*A:\s*(.+)/i);
      if (match && match.length >= 3) {
        flashcards.push({
          id: `card_${Date.now()}_${index}_${difficulty}`,
          question: match[1].trim(),
          answer: match[2].trim(),
          difficulty: difficulty,
          type: 'ai_generated'
        });
      }
    });
  }
  
  return flashcards;
}

// Advanced flashcard generation with multiple question types
function generateAdvancedFlashcards(notes: string, targetCount: number) {
  const sentences = notes.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const words = notes.split(/\s+/);
  const flashcards = [];
  
  // Extract key terms (words that appear frequently or are capitalized)
  const keyTerms = extractKeyTerms(notes);
  
  let cardCount = 0;
  
  // Generate different types of questions
  const questionTypes = [
    { type: 'fill_blank', weight: 0.3 },
    { type: 'definition', weight: 0.3 },
    { type: 'true_false', weight: 0.2 },
    { type: 'multiple_choice', weight: 0.2 }
  ];
  
  for (const questionType of questionTypes) {
    const typeCount = Math.ceil(targetCount * questionType.weight);
    
    for (let i = 0; i < typeCount && cardCount < targetCount; i++) {
      let card = null;
      
      switch (questionType.type) {
        case 'fill_blank':
          card = generateFillInBlankCard(sentences, cardCount);
          break;
        case 'definition':
          card = generateDefinitionCard(keyTerms, sentences, cardCount);
          break;
        case 'true_false':
          card = generateTrueFalseCard(sentences, cardCount);
          break;
        case 'multiple_choice':
          card = generateMultipleChoiceCard(sentences, keyTerms, cardCount);
          break;
      }
      
      if (card) {
        flashcards.push(card);
        cardCount++;
      }
    }
  }
  
  return flashcards.slice(0, targetCount);
}

// Extract key terms from the text
function extractKeyTerms(text: string) {
  const words = text.split(/\s+/);
  const termFreq = {};
  const keyTerms = [];
  
  // Count word frequency and find capitalized words
  words.forEach(word => {
    const cleaned = word.replace(/[^\w]/g, '').toLowerCase();
    if (cleaned.length > 3) {
      termFreq[cleaned] = (termFreq[cleaned] || 0) + 1;
    }
    
    // Add capitalized words as potential key terms
    if (word.match(/^[A-Z][a-z]+/) && word.length > 3) {
      keyTerms.push(word.replace(/[^\w]/g, ''));
    }
  });
  
  // Add frequently occurring words
  Object.entries(termFreq).forEach(([term, freq]) => {
    if (freq > 1 && term.length > 4) {
      keyTerms.push(term);
    }
  });
  
  return [...new Set(keyTerms)].slice(0, 20);
}

// Generate fill-in-the-blank cards
function generateFillInBlankCard(sentences: string[], index: number) {
  if (sentences.length === 0) return null;
  
  const sentence = sentences[index % sentences.length].trim();
  const words = sentence.split(' ');
  
  if (words.length > 5) {
    const keyWordIndex = Math.floor(words.length / 2);
    const keyWord = words[keyWordIndex].replace(/[^\w]/g, '');
    const question = sentence.replace(words[keyWordIndex], '______');
    
    return {
      id: `card_${Date.now()}_${index}_fill`,
      question: `Fill in the blank: ${question}`,
      answer: keyWord,
      difficulty: 'basic',
      type: 'fill_blank'
    };
  }
  
  return null;
}

// Generate definition cards
function generateDefinitionCard(keyTerms: string[], sentences: string[], index: number) {
  if (keyTerms.length === 0) return null;
  
  const term = keyTerms[index % keyTerms.length];
  const relevantSentence = sentences.find(s => s.toLowerCase().includes(term.toLowerCase()));
  
  if (relevantSentence) {
    return {
      id: `card_${Date.now()}_${index}_def`,
      question: `What is ${term}?`,
      answer: relevantSentence.trim(),
      difficulty: 'intermediate',
      type: 'definition'
    };
  }
  
  return null;
}

// Generate true/false cards
function generateTrueFalseCard(sentences: string[], index: number) {
  if (sentences.length === 0) return null;
  
  const sentence = sentences[index % sentences.length].trim();
  
  return {
    id: `card_${Date.now()}_${index}_tf`,
    question: `True or False: ${sentence}`,
    answer: 'True',
    difficulty: 'basic',
    type: 'true_false'
  };
}

// Generate multiple choice cards
function generateMultipleChoiceCard(sentences: string[], keyTerms: string[], index: number) {
  if (keyTerms.length === 0 || sentences.length === 0) return null;
  
  const term = keyTerms[index % keyTerms.length];
  const relevantSentence = sentences.find(s => s.toLowerCase().includes(term.toLowerCase()));
  
  if (relevantSentence) {
    const otherTerms = keyTerms.filter(t => t !== term).slice(0, 3);
    const choices = [term, ...otherTerms].sort(() => Math.random() - 0.5);
    
    return {
      id: `card_${Date.now()}_${index}_mc`,
      question: `Which term is described by: "${relevantSentence}"?\nA) ${choices[0]}\nB) ${choices[1]}\nC) ${choices[2]}\nD) ${choices[3] || 'None of the above'}`,
      answer: `${String.fromCharCode(65 + choices.indexOf(term))}) ${term}`,
      difficulty: 'advanced',
      type: 'multiple_choice'
    };
  }
  
  return null;
}

// Save flashcards to database
async function saveFlashcards(flashcards: any[], userId: string, originalNotes: string) {
  const timestamp = Date.now();
  const noteId = `note_${timestamp}`;
  
  // Save the original notes
  await kv.set(`notes:${userId}:${noteId}`, {
    id: noteId,
    content: originalNotes,
    createdAt: timestamp,
  });
  
  // Save each flashcard
  const savedFlashcards = [];
  for (let i = 0; i < flashcards.length; i++) {
    const flashcard = {
      ...flashcards[i],
      userId,
      noteId,
      createdAt: timestamp,
    };
    
    await kv.set(`flashcards:${userId}:${flashcard.id}`, flashcard);
    savedFlashcards.push(flashcard);
  }
  
  return savedFlashcards;
}

Deno.serve(app.fetch);