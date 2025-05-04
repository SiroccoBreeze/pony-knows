"use client"

import React, { createContext, useState, useContext, useCallback } from 'react';

interface LoaderContextType {
  isLoading: boolean;
  setLoading: (value: boolean) => void;
  message: string | null;
  setMessage: (value: string | null) => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export function LoaderProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const setLoading = useCallback((value: boolean) => {
    setIsLoading(value);
  }, []);

  return (
    <LoaderContext.Provider
      value={{ isLoading, setLoading, message, setMessage }}
    >
      {children}
    </LoaderContext.Provider>
  );
}

export function useLoader() {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error('useLoader必须在LoaderProvider内部使用');
  }
  return context;
} 