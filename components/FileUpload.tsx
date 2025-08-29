import React, { useCallback, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from './ui/utils';

interface FileUploadProps {
  onFileContent: (content: string, fileName: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileContent, onError, disabled }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      onError('File size exceeds 10MB limit. Please choose a smaller file.');
      return;
    }

    // Check file type
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const allowedExtensions = ['.txt', '.md', '.pdf', '.doc', '.docx'];
    const hasValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      onError('Unsupported file type. Please upload .txt, .md, .pdf, .doc, or .docx files.');
      return;
    }

    setUploading(true);
    
    try {
      // For text files, read directly
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const content = await file.text();
        setUploadedFile({ name: file.name, size: file.size });
        onFileContent(content, file.name);
      } else {
        // For other file types, send to server for processing
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', 'temp_user');

        const response = await fetch('/api/upload-file', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to process file');
        }

        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error);
        }

        setUploadedFile({ name: result.fileName, size: result.fileSize });
        onFileContent(result.text, result.fileName);
      }
    } catch (error) {
      console.error('File upload error:', error);
      onError(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setUploading(false);
    }
  }, [onFileContent, onError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled || uploading) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, uploading, handleFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled || uploading) return;
    
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [disabled, uploading, handleFiles]);

  const clearFile = () => {
    setUploadedFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {!uploadedFile ? (
        <Card 
          className={cn(
            "border-2 border-dashed transition-all duration-200 cursor-pointer hover:border-blue-400",
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleChange}
              accept=".txt,.md,.pdf,.doc,.docx"
              disabled={disabled || uploading}
            />
            
            {uploading ? (
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto" />
                <div>
                  <h3 className="font-semibold text-gray-700">Processing File...</h3>
                  <p className="text-sm text-gray-500">Please wait while we extract the text content</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">Upload Study Materials</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Supports: TXT, MD, PDF, DOC, DOCX (max 10MB)
                  </p>
                </div>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={disabled}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-green-800">{uploadedFile.name}</h4>
                <p className="text-sm text-green-600">{formatFileSize(uploadedFile.size)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFile}
              className="text-green-700 hover:text-green-800 hover:bg-green-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}
      
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-full">
          <File className="w-4 h-4" />
          Upload files to automatically extract text for flashcard generation
        </div>
      </div>
    </div>
  );
}