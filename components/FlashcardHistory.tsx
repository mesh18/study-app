import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Calendar, FileText, Play, Trash2, History } from 'lucide-react';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  userId?: string;
  noteId?: string;
  createdAt?: number;
}

interface FlashcardHistoryProps {
  userId: string;
  onLoadFlashcards: () => Promise<Flashcard[]>;
  onSelectFlashcards: (flashcards: Flashcard[]) => void;
}

export function FlashcardHistory({ userId, onLoadFlashcards, onSelectFlashcards }: FlashcardHistoryProps) {
  const [flashcardSets, setFlashcardSets] = useState<Record<string, Flashcard[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const allFlashcards = await onLoadFlashcards();
      
      // Group flashcards by noteId
      const grouped = allFlashcards.reduce((acc, card) => {
        const noteId = card.noteId || 'unknown';
        if (!acc[noteId]) {
          acc[noteId] = [];
        }
        acc[noteId].push(card);
        return acc;
      }, {} as Record<string, Flashcard[]>);

      setFlashcardSets(grouped);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown date';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPreviewText = (flashcards: Flashcard[]) => {
    const firstCard = flashcards[0];
    if (!firstCard) return 'No content';
    return firstCard.question.length > 100 
      ? firstCard.question.substring(0, 100) + '...'
      : firstCard.question;
  };

  const selectFlashcardSet = (flashcards: Flashcard[]) => {
    onSelectFlashcards(flashcards);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          <span className="ml-3">Loading history...</span>
        </CardContent>
      </Card>
    );
  }

  const setEntries = Object.entries(flashcardSets);

  if (setEntries.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <History className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No History Yet</h3>
          <p className="text-gray-500 max-w-md">
            Once you generate flashcards, they'll appear here for easy access. 
            Start by creating your first set in the Generate tab!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Study History</h2>
          <p className="text-gray-600">Your previously generated flashcard sets</p>
        </div>
        <Button onClick={loadHistory} variant="outline" size="sm">
          <History className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-4 pr-4">
          {setEntries
            .sort(([, a], [, b]) => (b[0]?.createdAt || 0) - (a[0]?.createdAt || 0))
            .map(([noteId, flashcards]) => {
              const firstCard = flashcards[0];
              const createdAt = firstCard?.createdAt;
              
              return (
                <Card key={noteId} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          Flashcard Set
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(createdAt)}
                        </CardDescription>
                      </div>
                      <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm font-medium">
                        {flashcards.length} cards
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {getPreviewText(flashcards)}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => selectFlashcardSet(flashcards)}
                        className="flex items-center gap-2"
                        size="sm"
                      >
                        <Play className="w-4 h-4" />
                        Study Now
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // In a real app, you might want to add delete functionality
                          alert('Delete functionality would be implemented here');
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </ScrollArea>

      <div className="text-center text-sm text-gray-500">
        {setEntries.length} flashcard set{setEntries.length !== 1 ? 's' : ''} saved
      </div>
    </div>
  );
}