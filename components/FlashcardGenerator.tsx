import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Sparkles, FileText, Zap, Upload, Brain, Target } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { GenerationProgress } from './GenerationProgress';

interface FlashcardGeneratorProps {
  notes: string;
  setNotes: (notes: string) => void;
  onGenerate: (targetCount?: number) => void;
  loading: boolean;
  generationProgress?: {
    current: number;
    total: number;
    isGenerating: boolean;
  };
}

export function FlashcardGenerator({ 
  notes, 
  setNotes, 
  onGenerate, 
  loading,
  generationProgress 
}: FlashcardGeneratorProps) {
  const [inputMethod, setInputMethod] = useState<'text' | 'file'>('text');
  const [uploadError, setUploadError] = useState<string>('');
  const [targetQuestionCount, setTargetQuestionCount] = useState<number | null>(null);

  const exampleNotes = `The mitochondria is the powerhouse of the cell. It produces ATP through cellular respiration. Photosynthesis occurs in chloroplasts and converts light energy into chemical energy. DNA is composed of four nucleotides: adenine, thymine, cytosine, and guanine. The cell membrane controls what enters and exits the cell. Ribosomes are responsible for protein synthesis. The nucleus contains the cell's genetic material.`;

  const handleExampleClick = () => {
    setNotes(exampleNotes);
    setInputMethod('text');
  };

  const handleFileContent = (content: string, fileName: string) => {
    setNotes(content);
    setUploadError('');
    setInputMethod('text'); // Switch to text view after successful upload
  };

  const handleFileError = (error: string) => {
    setUploadError(error);
  };

  const calculateEstimatedQuestions = (text: string) => {
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 10).length;
    
    if (wordCount < 100) return Math.min(5, sentenceCount);
    if (wordCount < 300) return Math.min(10, Math.floor(sentenceCount * 0.7));
    if (wordCount < 600) return Math.min(20, Math.floor(sentenceCount * 0.5));
    return Math.min(30, Math.floor(sentenceCount * 0.4));
  };

  const estimatedQuestions = notes ? calculateEstimatedQuestions(notes) : 0;

  const handleGenerate = (customCount?: number) => {
    const targetCount = customCount || estimatedQuestions;
    setTargetQuestionCount(targetCount);
    onGenerate(targetCount);
  };

  return (
    <div className="space-y-6">
      {/* Progress Tracking */}
      {generationProgress?.isGenerating && (
        <GenerationProgress
          isGenerating={generationProgress.isGenerating}
          totalQuestions={generationProgress.total}
          currentProgress={generationProgress.current}
        />
      )}

      {/* Input Method Selection */}
      <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            AI Study Material Input
          </CardTitle>
          <CardDescription>
            Choose how you'd like to input your study materials. The AI will analyze your content 
            and generate comprehensive flashcards with questions ranging from basic to advanced.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Method Tabs */}
          <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as 'text' | 'file')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Text Input
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                File Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <Textarea
                placeholder="Paste your study notes here... (e.g., definitions, concepts, formulas, key facts, lecture content)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[200px] text-base resize-none"
              />
              
              {notes && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white rounded-lg border">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {notes.split(/\s+/).length}
                    </div>
                    <div className="text-xs text-gray-600">Words</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {notes.split(/[.!?]+/).filter(s => s.trim().length > 10).length}
                    </div>
                    <div className="text-xs text-gray-600">Sentences</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">
                      {estimatedQuestions}
                    </div>
                    <div className="text-xs text-gray-600">Est. Questions</div>
                  </div>
                  <div className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {estimatedQuestions <= 5 ? 'Basic' : estimatedQuestions <= 15 ? 'Standard' : 'Comprehensive'}
                    </Badge>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="file" className="space-y-4">
              <FileUpload
                onFileContent={handleFileContent}
                onError={handleFileError}
                disabled={loading}
              />
              
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {uploadError}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Generation Controls */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => handleGenerate()} 
                disabled={loading || !notes.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex-1"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Generating {targetQuestionCount || estimatedQuestions} Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate {estimatedQuestions} Flashcards
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleExampleClick}
                className="flex items-center gap-2"
                disabled={loading}
              >
                <Zap className="w-4 h-4" />
                Try Example
              </Button>
            </div>

            {/* Custom Generation Options */}
            {notes && !loading && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 self-center">Quick generate:</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleGenerate(10)}
                  disabled={!notes.trim()}
                >
                  <Target className="w-3 h-3 mr-1" />
                  10 Cards
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleGenerate(20)}
                  disabled={!notes.trim()}
                >
                  <Target className="w-3 h-3 mr-1" />
                  20 Cards
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleGenerate(30)}
                  disabled={!notes.trim()}
                >
                  <Target className="w-3 h-3 mr-1" />
                  30 Cards
                </Button>
              </div>
            )}

            <div className="text-sm text-gray-500">
              💡 <strong>Smart Generation:</strong> The AI creates questions at different difficulty levels - 
              basic recall (40%), intermediate application (40%), and advanced analysis (20%). 
              More content = more comprehensive flashcards!
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Brain className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-green-700">Multi-Level AI</h3>
            <p className="text-sm text-green-600">Basic to advanced question generation</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Upload className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-purple-700">File Upload</h3>
            <p className="text-sm text-purple-600">Support for documents up to 10MB</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-blue-700">Smart Scaling</h3>
            <p className="text-sm text-blue-600">5-30 questions based on content</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="font-semibold text-orange-700">Progress Tracking</h3>
            <p className="text-sm text-orange-600">Real-time generation progress</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}