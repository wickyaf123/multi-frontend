'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import Stage1And2, { SportType } from '@/components/Stage1And2';
import Stage3, { MultiResult } from '@/components/Stage3';

// Function to get or create a userId
const getOrCreateUserId = (): string => {
  let userId = localStorage.getItem('multiBuilderUserId');
  if (!userId) {
    // Generate a simple UUID-like string if crypto.randomUUID is not available
    // For more robust UUIDs, consider a library if needed for other purposes
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      userId = crypto.randomUUID();
    } else {
      // Basic fallback for environments without crypto.randomUUID
      userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    localStorage.setItem('multiBuilderUserId', userId);
  }
  return userId;
};

export default function MultiBuilderPage() {
  const [stake, setStake] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [sportType, setSportType] = useState<SportType>('nrl');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [multiResult, setMultiResult] = useState<MultiResult | null>(null);

  const handleCombinedSubmit = async (stakeValue: number, winAmountValue: number, sportTypeValue: SportType, maxOddsPerLeg?: number) => {
    setStake(stakeValue);
    setWinAmount(winAmountValue);
    setSportType(sportTypeValue);
    setError(null);
    setMultiResult(null);
    setIsLoading(true);

    const userId = getOrCreateUserId(); // Get or create userId

    try {
      // Create an AbortController to handle timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Get API URL from environment variable or use fallback
      // IMPORTANT: In local development, we'll try both the environment variable and localhost if needed
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      
      console.log("🔌 Attempting to connect to backend at:", apiUrl);
      
      // Log frontend details
      console.log("🖥️ Frontend environment:", {
        nodeEnv: process.env.NODE_ENV,
        nextPublicApiUrl: process.env.NEXT_PUBLIC_API_URL,
        useLocalFallback: !process.env.NEXT_PUBLIC_API_URL
      });
      
      console.log("📦 Sending data:", { 
        stake: stakeValue, 
        winAmount: winAmountValue,
        sportType: sportTypeValue,
        alternatives: 3,
        userId: userId, // Add userId to the payload
        maxOddsPerLeg: maxOddsPerLeg // Add maxOddsPerLeg to the payload
      });
      
      let response;
      try {
        // First try with the primary URL
        console.log(`🔄 Sending POST request to ${apiUrl}/api/generate-multi`);
        response = await fetch(`${apiUrl}/api/generate-multi`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            stake: stakeValue, 
            winAmount: winAmountValue,
            sportType: sportTypeValue,
            alternatives: 3,
            userId: userId, // Add userId to the payload
            maxOddsPerLeg: maxOddsPerLeg // Add maxOddsPerLeg to the payload
          }),
          signal: controller.signal
        });
      } catch (fetchError) {
        console.error("❌ Primary fetch failed:", fetchError);
        
        // If we're using an environment variable that failed, try localhost as a fallback
        if (process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === 'development') {
          console.log("🔄 Trying localhost fallback...");
          controller.abort(); // Abort the previous request
          
          // Create a new abort controller for the fallback request
          const fallbackController = new AbortController();
          
          response = await fetch(`http://localhost:5001/api/generate-multi`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              stake: stakeValue, 
              winAmount: winAmountValue,
              sportType: sportTypeValue,
              alternatives: 3,
              userId: userId, // Add userId to the payload for fallback request
              maxOddsPerLeg: maxOddsPerLeg // Add maxOddsPerLeg to the payload for fallback request
            }),
            signal: fallbackController.signal
          });
        } else {
          // Re-throw if we can't try a fallback
          throw fetchError;
        }
      }
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      console.log("🔄 Response status:", response.status, response.statusText);
      console.log("🔄 Response headers:", Object.fromEntries([...response.headers.entries()]));

      // Try to parse JSON, but handle potential parsing errors
      let data;
      try {
        const text = await response.text();
        console.log("🔄 Raw response text:", text.substring(0, 300) + (text.length > 300 ? '...' : ''));
        
        // Parse the text to JSON
        try {
          data = JSON.parse(text);
          console.log("📊 Parsed data:", data);
        } catch (jsonError) {
          console.error("❌ JSON parsing error:", jsonError);
          throw new Error(`Failed to parse server response: ${jsonError}. Raw response: ${text.substring(0, 100)}`);
        }
      } catch (parseError) {
        console.error("❌ Response text error:", parseError);
        throw new Error(`Failed to read server response: ${parseError}`);
      }

      if (!response.ok) {
         const errorMsg = data?.message || data?.error || `Error: ${response.statusText}`;
         console.error("❌ API error:", errorMsg);
         setError(errorMsg);
         setMultiResult(null);
      } else {
        // Handle different API formats for backward compatibility
        
        // New format with combination and playerAlternatives
        if (data.combination) {
          // Already in the right format, use as is
          console.log("✅ Using new API format with combination");
          setMultiResult(data);
        }
        // Old format with mainCombination and alternatives
        else if (data.mainCombination) {
          // Keep as is for backward compatibility
          console.log("✅ Using compatibility format with mainCombination");
          setMultiResult(data);
        }
        // Very old format with just legs
        else if (data.legs) {
          // Convert to the new format 
          console.log("✅ Converting from legacy format with legs");
          data.combination = {
            legs: data.legs,
            achievedOdds: data.achievedOdds || 0,
            potentialWin: data.potentialWin || 0
          };
          // Empty player alternatives
          data.playerAlternatives = {};
          setMultiResult(data);
        }
        // Unexpected format
        else {
          console.warn("⚠️ Received unexpected data format:", data);
          setMultiResult(data);
        }
        
        setError(null);
      }
    } catch (err: Error | unknown) {
      console.error("❌ API call failed:", err);
      // Check if this was a timeout error
      if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
        setError('The request took too long to complete. Try with different values or try again later.');
      } else {
        const errorMessage = err && typeof err === 'object' && 'message' in err ? err.message : 'Unknown error';
        setError(`Failed to connect to the backend: ${errorMessage}. Please check that the backend API is running and accessible.`);
      }
      setMultiResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle swapping a player in the multi
  const handleMultiSwap = (updatedResult: MultiResult) => {
    setMultiResult(updatedResult);
    setError(null);
  };

  const handleRestart = () => {
    setStake(null);
    setWinAmount(null);
    setError(null);
    setMultiResult(null);
    setIsLoading(false);
  }

  // Title is now only shown in the Stage3 component

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
      
      {/* Main layout - side by side on larger screens, stacked on mobile */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left side: Input form - now takes 2/5 of the space instead of 1/2 */}
        <div className="lg:col-span-2">
          <Stage1And2 
            onSubmit={handleCombinedSubmit}
            isLoading={isLoading}
          />
        </div>
        
        {/* Right side: Results - now takes 3/5 of the space instead of 1/2 */}
        <div className="lg:col-span-3">
          {multiResult || error || isLoading ? (
            <Stage3
              isLoading={isLoading}
              error={error}
              result={multiResult}
              onBack={handleRestart}
              onRestart={handleRestart}
              onSwap={handleMultiSwap}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-card border border-primary/20 rounded-lg p-8 text-center">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-foreground">Your Multi Results</h3>
              <p className="text-muted-foreground mt-2">
                Fill out the form on the left and click "Generate Multi" to see your results here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
