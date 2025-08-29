import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Brain, CheckCircle, Zap, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface GenerationProgressProps {
  isGenerating: boolean;
  totalQuestions: number;
  currentProgress: number;
  onComplete?: () => void;
}

export function GenerationProgress({ 
  isGenerating, 
  totalQuestions, 
  currentProgress, 
  onComplete 
}: GenerationProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('preparing');

  useEffect(() => {
    if (isGenerating) {
      setAnimatedProgress(0);
      setCurrentPhase('preparing');
    }
  }, [isGenerating]);

  useEffect(() => {
    if (currentProgress > 0) {
      setAnimatedProgress(currentProgress);
      
      // Update phase based on progress
      const progressPercentage = (currentProgress / totalQuestions) * 100;
      if (progressPercentage === 0) {
        setCurrentPhase('preparing');
      } else if (progressPercentage < 40) {
        setCurrentPhase('basic');
      } else if (progressPercentage < 80) {
        setCurrentPhase('intermediate');
      } else if (progressPercentage < 100) {
        setCurrentPhase('advanced');
      } else {
        setCurrentPhase('completed');
        onComplete?.();
      }
    }
  }, [currentProgress, totalQuestions, onComplete]);

  const phases = [
    {
      key: 'preparing',
      label: 'Analyzing content...',
      icon: Brain,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      key: 'basic',
      label: 'Generating basic questions...',
      icon: BookOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      key: 'intermediate',
      label: 'Creating intermediate questions...',
      icon: Zap,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      key: 'advanced',
      label: 'Crafting advanced questions...',
      icon: Brain,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      key: 'completed',
      label: 'Flashcards ready!',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  ];

  const currentPhaseInfo = phases.find(p => p.key === currentPhase) || phases[0];
  const progressPercentage = totalQuestions > 0 ? (animatedProgress / totalQuestions) * 100 : 0;

  if (!isGenerating && currentProgress === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full"
    >
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${currentPhaseInfo.bgColor}`}>
              <currentPhaseInfo.icon className={`w-5 h-5 ${currentPhaseInfo.color}`} />
            </div>
            <span>Generating Your Flashcards</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                {currentPhaseInfo.label}
              </span>
              <span className="text-sm text-gray-600">
                {animatedProgress} / {totalQuestions} questions
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-3"
            />
            <div className="text-right">
              <span className="text-sm font-medium text-blue-600">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>

          {/* Phase Indicators */}
          <div className="grid grid-cols-4 gap-2">
            {phases.slice(1, 5).map((phase, index) => {
              const phaseProgress = Math.max(0, Math.min(100, 
                ((animatedProgress - (index * totalQuestions / 4)) / (totalQuestions / 4)) * 100
              ));
              const isActive = currentPhase === phase.key;
              const isCompleted = phaseProgress >= 100;

              return (
                <div key={phase.key} className="space-y-2">
                  <div className={`text-xs text-center font-medium ${
                    isActive ? phase.color : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {phase.label.split(' ')[1]} {/* Show second word */}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-green-500' : 
                        isActive ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, phaseProgress))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Estimated Time */}
          {isGenerating && currentProgress < totalQuestions && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white/60 px-3 py-2 rounded-full">
                <Brain className="w-4 h-4" />
                <span>
                  Estimated time: {Math.max(1, Math.ceil((totalQuestions - currentProgress) * 2))} seconds
                </span>
              </div>
            </div>
          )}

          {/* Question Types Progress */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-blue-200">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {Math.min(Math.ceil(totalQuestions * 0.4), Math.max(0, animatedProgress - Math.ceil(totalQuestions * 0.6)))}
              </div>
              <div className="text-xs text-gray-600">Basic</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600">
                {Math.min(Math.ceil(totalQuestions * 0.4), Math.max(0, animatedProgress - Math.ceil(totalQuestions * 0.4)))}
              </div>
              <div className="text-xs text-gray-600">Intermediate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">
                {Math.min(Math.floor(totalQuestions * 0.2), Math.max(0, animatedProgress - Math.ceil(totalQuestions * 0.8)))}
              </div>
              <div className="text-xs text-gray-600">Advanced</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}