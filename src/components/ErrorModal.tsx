"use client";

import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorModalProps {
  message: string;
  onRetry: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ message, onRetry }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/20 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white border border-border shadow-2xl text-center">
        <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>

        <h3 className="text-2xl font-serif text-ink-primary tracking-tight">Connection Issue</h3>
        <p className="mt-2 text-sm text-ink-secondary leading-relaxed">
          {message || "Something went wrong with the live connection."}
        </p>

        <Button
          onClick={onRetry}
          className="mt-8 w-full h-12 bg-coral hover:bg-coral-dark text-white rounded-xl font-medium text-base transition-all active:scale-[0.98] shadow-md"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          <span>Try Again</span>
        </Button>
      </div>
    </div>
  );
};
