"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { ExtractedActivityData, DocumentParseResponse } from "@/types";

interface DocumentUploadProps {
  onExtracted: (data: ExtractedActivityData) => void;
  onError?: (error: string) => void;
}

const SUPPORTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentUpload({ onExtracted, onError }: DocumentUploadProps) {
  const { getToken } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    confidence?: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return "Please upload a PDF or Word document (.pdf or .docx)";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File is too large. Maximum size is 10MB.";
    }
    return null;
  }, []);

  const processFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setResult({ success: false, message: validationError });
      onError?.(validationError);
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    setResult(null);

    try {
      const token = await getToken();
      const response: DocumentParseResponse = await api.parseDocument(token, file);

      if (response.success && response.data) {
        const confidence = response.data.confidence_score;
        let message = "Document parsed successfully!";

        if (confidence < 0.3) {
          message = "Document parsed, but confidence is low. Please review all fields carefully.";
        } else if (confidence < 0.6) {
          message = "Document parsed. Some fields may need adjustment.";
        }

        setResult({
          success: true,
          message,
          confidence,
        });
        onExtracted(response.data);
      } else {
        const errorMsg = response.error || "Failed to extract meeting data from document";
        setResult({ success: false, message: errorMsg });
        onError?.(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "An unexpected error occurred";
      setResult({ success: false, message: errorMsg });
      onError?.(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [getToken, onExtracted, onError, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Upload Meeting Document</h3>
          {selectedFile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Upload a PDF or Word document with meeting notes to automatically extract meeting details.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div
          onClick={!isProcessing ? handleClick : undefined}
          onDrop={!isProcessing ? handleDrop : undefined}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg p-6
            transition-colors cursor-pointer
            flex flex-col items-center justify-center gap-2
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
            ${isProcessing ? "pointer-events-none opacity-75" : ""}
          `}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">
                Analyzing document with AI...
              </span>
            </>
          ) : selectedFile ? (
            <>
              <FileText className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Drop a file here or click to browse
              </span>
              <span className="text-xs text-muted-foreground">
                PDF or DOCX, max 10MB
              </span>
            </>
          )}
        </div>

        {result && (
          <div
            className={`
              flex items-start gap-2 p-3 rounded-md text-sm
              ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}
            `}
          >
            {result.success ? (
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <p>{result.message}</p>
              {result.confidence !== undefined && (
                <p className="text-xs mt-1 opacity-75">
                  Confidence: {Math.round(result.confidence * 100)}%
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
