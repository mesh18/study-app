import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BookOpen, Brain, Sparkles, History } from 'lucide-react';
import { FlashcardGenerator } from './FlashcardGenerator';
import { FlashcardViewer } from './FlashcardViewer';
import { FlashcardHistory } from './FlashcardHistory';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty?: string;
  type?: string;
  userId?: string;
  noteId?: string;
  createdAt?: number;
}

export function StudyBuddy() {
  const [notes, setNotes] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substr(2, 9));
  const [activeTab, setActiveTab] = useState('generate');
  const [generationProgress, setGenerationProgress] = useState({
    current: 0,
    total: 0,
    isGenerating: false
  });

  const generateFlashcards = async (targetCount?: number) => {
    if (!notes.trim()) {
      alert('Please enter some study notes first!');
      return;
    }

    // Calculate target count if not provided
    const wordCount = notes.split(/\s+/).length;
    const sentenceCount = notes.split(/[.!?]+/).filter(s => s.trim().length > 10).length;
    let calculatedTarget = targetCount;
    
    if (!calculatedTarget) {
      if (wordCount < 100) calculatedTarget = Math.min(5, sentenceCount);
      else if (wordCount < 300) calculatedTarget = Math.min(10, Math.floor(sentenceCount * 0.7));
      else if (wordCount < 600) calculatedTarget = Math.min(20, Math.floor(sentenceCount * 0.5));
      else calculatedTarget = Math.min(30, Math.floor(sentenceCount * 0.4));
    }

    setLoading(true);
    setGenerationProgress({
      current: 0,
      total: calculatedTarget || 10,
      isGenerating: true
    });

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-65856507/generate-flashcards`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ notes, userId, targetCount: calculatedTarget }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Simulate progress for demonstration
      const flashcards = data.flashcards || [];
      for (let i = 0; i <= flashcards.length; i++) {
        setGenerationProgress(prev => ({ ...prev, current: i }));
        if (i < flashcards.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setFlashcards(flashcards);
      setActiveTab('study');
    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert('Failed to generate flashcards. Please try again.');
    } finally {
      setLoading(false);
      setGenerationProgress(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const loadSavedFlashcards = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-65856507/flashcards/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.flashcards || [];
      }
    } catch (error) {
      console.error('Error loading saved flashcards:', error);
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-full">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Study Buddy
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Transform your study notes into interactive flashcards instantly using AI. 
            Simply paste your notes and let our AI generate engaging questions and answers.
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="study" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Study
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-6">
            <FlashcardGenerator
              notes={notes}
              setNotes={setNotes}
              onGenerate={generateFlashcards}
              loading={loading}
              generationProgress={generationProgress}
            />
          </TabsContent>

          <TabsContent value="study" className="mt-6">
            <FlashcardViewer flashcards={flashcards} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <FlashcardHistory 
              userId={userId} 
              onLoadFlashcards={loadSavedFlashcards}
              onSelectFlashcards={setFlashcards}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}