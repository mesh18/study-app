import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ChevronLeft, ChevronRight, RotateCcw, BookOpen, CheckCircle, Brain, Zap, Target, Eye, X, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty?: string;
  type?: string;
}

interface FlashcardViewerProps {
  flashcards: Flashcard[];
}

interface CardAttempt {
  attempts: number;
  isCorrect: boolean;
  userAnswers: string[];
  showAnswer: boolean;
}

export function FlashcardViewer({ flashcards }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completedCards, setCompletedCards] = useState(new Set<number>());
  const [userInput, setUserInput] = useState('');
  const [cardAttempts, setCardAttempts] = useState<Map<number, CardAttempt>>(new Map());
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);

  if (!flashcards || flashcards.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Flashcards Yet</h3>
          <p className="text-gray-500 max-w-md">
            Generate some flashcards from your study notes to start studying! 
            Go to the Generate tab and paste your notes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentCard = flashcards[currentIndex];
  const currentAttempt = cardAttempts.get(currentIndex) || {
    attempts: 0,
    isCorrect: false,
    userAnswers: [],
    showAnswer: false
  };

  // Reset input and feedback when changing cards
  useEffect(() => {
    setUserInput('');
    setShowFeedback(null);
    setIsFlipped(false);
  }, [currentIndex]);

  const normalizeAnswer = (answer: string): string => {
    return answer.toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  };

  const checkAnswer = () => {
    if (!userInput.trim()) return;

    const userAnswer = normalizeAnswer(userInput);
    const correctAnswer = normalizeAnswer(currentCard.answer);
    
    // Check for exact match or if user answer is contained in correct answer
    const isCorrect = userAnswer === correctAnswer || 
                     correctAnswer.includes(userAnswer) ||
                     userAnswer.includes(correctAnswer);

    const newAttempt: CardAttempt = {
      attempts: currentAttempt.attempts + 1,
      isCorrect,
      userAnswers: [...currentAttempt.userAnswers, userInput],
      showAnswer: !isCorrect && currentAttempt.attempts + 1 >= 3
    };

    setCardAttempts(prev => new Map(prev.set(currentIndex, newAttempt)));
    setShowFeedback(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      // Mark as completed and move to next card after delay
      setCompletedCards(prev => new Set([...prev, currentIndex]));
      setTimeout(() => {
        nextCard();
      }, 1500);
    } else if (newAttempt.attempts >= 3) {
      // Show reveal option after 3 attempts
      setTimeout(() => {
        setShowFeedback(null);
      }, 2000);
    } else {
      // Clear input for next attempt
      setTimeout(() => {
        setUserInput('');
        setShowFeedback(null);
      }, 1500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  };

  const revealAnswer = () => {
    setIsFlipped(true);
    setCardAttempts(prev => new Map(prev.set(currentIndex, {
      ...currentAttempt,
      showAnswer: true
    })));
  };

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const markAsCompleted = () => {
    setCompletedCards(prev => new Set([...prev, currentIndex]));
    setTimeout(nextCard, 500);
  };

  const resetProgress = () => {
    setCompletedCards(new Set());
    setCardAttempts(new Map());
    setCurrentIndex(0);
    setIsFlipped(false);
    setUserInput('');
    setShowFeedback(null);
  };

  const completionPercentage = Math.round((completedCards.size / flashcards.length) * 100);

  const getDifficultyInfo = (difficulty: string = 'basic') => {
    switch (difficulty) {
      case 'basic':
        return { icon: BookOpen, color: 'bg-green-100 text-green-700', label: 'Basic' };
      case 'intermediate':
        return { icon: Zap, color: 'bg-yellow-100 text-yellow-700', label: 'Intermediate' };
      case 'advanced':
        return { icon: Brain, color: 'bg-purple-100 text-purple-700', label: 'Advanced' };
      default:
        return { icon: Target, color: 'bg-gray-100 text-gray-700', label: 'Standard' };
    }
  };

  const difficultyStats = flashcards.reduce((acc, card) => {
    const diff = card.difficulty || 'basic';
    acc[diff] = (acc[diff] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Study Progress</h3>
          <span className="text-sm text-gray-600">
            {completedCards.size} of {flashcards.length} cards completed
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        
        {/* Difficulty breakdown */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          {Object.entries(difficultyStats).map(([difficulty, count]) => {
            const info = getDifficultyInfo(difficulty);
            const completed = flashcards.filter((card, index) => 
              (card.difficulty || 'basic') === difficulty && completedCards.has(index)
            ).length;
            
            return (
              <div key={difficulty} className="text-center">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${info.color} mb-1`}>
                  <info.icon className="w-3 h-3" />
                  {info.label}
                </div>
                <div className="text-sm text-gray-600">
                  {completed} / {count}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="text-center text-lg font-semibold text-gray-700 mt-2">
          {completionPercentage}% Complete
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex justify-center">
        <div className="relative w-full max-w-2xl">
          {!isFlipped ? (
            /* Question Side with Input */
            <Card className={`w-full border-2 ${
              completedCards.has(currentIndex) 
                ? 'border-green-300 bg-green-50' 
                : currentAttempt.attempts > 0 && !currentAttempt.isCorrect
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-blue-300 bg-blue-50'
            } shadow-lg transition-all duration-300`}>
              <CardContent className="p-8">
                {/* Question Header */}
                <div className="text-center mb-6">
                  <div className="mb-4 flex items-center justify-center gap-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                      completedCards.has(currentIndex) 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {completedCards.has(currentIndex) ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <BookOpen className="w-4 h-4" />
                      )}
                      Question
                    </div>
                    
                    {currentCard.difficulty && (
                      <Badge variant="outline" className={getDifficultyInfo(currentCard.difficulty).color}>
                        {getDifficultyInfo(currentCard.difficulty).label}
                      </Badge>
                    )}
                  </div>
                  
                  <h2 className="text-xl font-semibold mb-6 leading-relaxed">
                    {currentCard.question}
                  </h2>
                </div>

                {/* Answer Input Section */}
                {!completedCards.has(currentIndex) && !currentAttempt.showAnswer && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Your Answer:
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Type your answer here..."
                          className="flex-1"
                          disabled={showFeedback !== null}
                        />
                        <Button 
                          onClick={checkAnswer}
                          disabled={!userInput.trim() || showFeedback !== null}
                          className="min-w-[80px]"
                        >
                          Check
                        </Button>
                      </div>
                    </div>

                    {/* Attempt Counter */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>
                        Attempt {currentAttempt.attempts + 1} of 3
                      </span>
                      {currentAttempt.attempts > 0 && (
                        <span className="text-orange-600">
                          {3 - currentAttempt.attempts} attempts remaining
                        </span>
                      )}
                    </div>

                    {/* Previous Attempts */}
                    {currentAttempt.userAnswers.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500">
                          Previous attempts:
                        </label>
                        <div className="space-y-1">
                          {currentAttempt.userAnswers.map((answer, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <X className="w-3 h-3 text-red-500" />
                              <span className="text-gray-600 line-through">{answer}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reveal Answer Option (after 3 attempts) */}
                {currentAttempt.attempts >= 3 && !currentAttempt.isCorrect && !currentAttempt.showAnswer && (
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-orange-100 border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-center gap-2 text-orange-700 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">3 attempts completed</span>
                      </div>
                      <p className="text-sm text-orange-600 mb-3">
                        You've used all your attempts. Would you like to see the answer?
                      </p>
                      <Button 
                        onClick={revealAnswer}
                        variant="outline"
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Reveal Answer
                      </Button>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {completedCards.has(currentIndex) && (
                  <div className="text-center">
                    <div className="p-4 bg-green-100 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Correct!</span>
                      </div>
                      <p className="text-sm text-green-600">
                        Well done! Moving to next card...
                      </p>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {showFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 p-3 rounded-lg border ${
                      showFeedback === 'correct'
                        ? 'bg-green-100 border-green-200 text-green-700'
                        : 'bg-red-100 border-red-200 text-red-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {showFeedback === 'correct' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      <span className="font-medium">
                        {showFeedback === 'correct' ? 'Correct!' : 'Not quite right'}
                      </span>
                    </div>
                    {showFeedback === 'incorrect' && currentAttempt.attempts < 3 && (
                      <p className="text-sm mt-1">Try again!</p>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Answer Side */
            <Card className="w-full border-2 border-green-300 bg-green-50 shadow-lg transition-all duration-300">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
                <div className="mb-4 flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Answer
                  </div>
                  
                  {currentCard.difficulty && (
                    <Badge variant="outline" className={getDifficultyInfo(currentCard.difficulty).color}>
                      {getDifficultyInfo(currentCard.difficulty).label}
                    </Badge>
                  )}
                  
                  {currentCard.type && (
                    <Badge variant="secondary" className="text-xs">
                      {currentCard.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl font-semibold mb-4 leading-relaxed text-green-800">
                  {currentCard.answer}
                </h2>
                
                {/* Show user's attempts if they failed */}
                {currentAttempt.userAnswers.length > 0 && !currentAttempt.isCorrect && (
                  <div className="mt-4 p-3 bg-white/60 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 mb-2">Your attempts:</p>
                    <div className="space-y-1">
                      {currentAttempt.userAnswers.map((answer, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          {index + 1}. {answer}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-gray-600 text-sm mt-4">Review the answer, then continue studying</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevCard}
            disabled={flashcards.length <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          {/* Only show flip button when answer is revealed or card is completed */}
          {(isFlipped || completedCards.has(currentIndex) || currentAttempt.showAnswer) && (
            <Button
              variant="outline"
              size="sm"
              onClick={flipCard}
              className="min-w-[100px]"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {isFlipped ? 'Back to Question' : 'Show Answer'}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={nextCard}
            disabled={flashcards.length <= 1}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          {isFlipped && !completedCards.has(currentIndex) && (
            <Button
              onClick={markAsCompleted}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Learned
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetProgress}
            disabled={completedCards.size === 0 && cardAttempts.size === 0}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All Progress
          </Button>
        </div>
      </div>

      {/* Card counter */}
      <div className="text-center text-sm text-gray-600">
        Card {currentIndex + 1} of {flashcards.length}
      </div>
    </div>
  );
}