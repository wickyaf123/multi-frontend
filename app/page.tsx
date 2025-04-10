'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import Stage1 from '@/components/Stage1';
import Stage2 from '@/components/Stage2';
import Stage3, { MultiResult } from '@/components/Stage3';

export default function MultiBuilderPage() {
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [stake, setStake] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [multiResult, setMultiResult] = useState<MultiResult | null>(null);

  const handleStage1Submit = (stakeValue: number) => {
    setStake(stakeValue);
    setError(null); // Clear previous errors
    setMultiResult(null); // Clear previous results
    setCurrentStage(2);
  };

  const handleStage2Submit = async (winAmountValue: number) => {
    setWinAmount(winAmountValue);
    setError(null);
    setMultiResult(null);
    setIsLoading(true);
    setCurrentStage(3); // Move to stage 3 immediately to show loading

    if (stake === null) {
      setError('Stake amount is missing.');
      setIsLoading(false);
      return;
    }

    try {
      // Create an AbortController to handle timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Get API URL from environment variable or use fallback
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      console.log("Using API URL:", apiUrl); // Add logging to debug
      
      // Ensure your backend URL is correct - make sure to use the full URL
      const response = await fetch(`${apiUrl}/api/generate-multi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          stake, 
          winAmount: winAmountValue,
          alternatives: 3 // Request up to 3 alternatives per player position
        }),
        signal: controller.signal
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
         setError(data.message || data.error || `Error: ${response.statusText}`);
         setMultiResult(null);
      } else {
        // Handle different API formats for backward compatibility
        
        // New format with combination and playerAlternatives
        if (data.combination) {
          // Already in the right format, use as is
          setMultiResult(data);
        }
        // Old format with mainCombination and alternatives
        else if (data.mainCombination) {
          // Keep as is for backward compatibility
          setMultiResult(data);
        }
        // Very old format with just legs
        else if (data.legs) {
          // Convert to the new format 
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
          setMultiResult(data);
        }
        
        setError(null);
      }
    } catch (err: Error | unknown) {
      console.error("API call failed:", err);
      // Check if this was a timeout error
      if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
        setError('The request took too long to complete. Try with different values or try again later.');
      } else {
        const errorMessage = err && typeof err === 'object' && 'message' in err ? err.message : 'Unknown error';
        setError(`Failed to connect to the backend: ${errorMessage}. Is it running?`);
      }
      setMultiResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setError(null); // Clear errors when going back
    if (currentStage === 2) {
      setCurrentStage(1);
    } else if (currentStage === 3) {
       // Decide if going back from results should go to stage 1 or 2
       setCurrentStage(2); // Go back to edit win amount
       setMultiResult(null); // Clear result when going back
    }
  };

   const handleRestart = () => {
       setStake(null);
       setWinAmount(null);
       setError(null);
       setMultiResult(null);
       setIsLoading(false);
       setCurrentStage(1);
   }

  // Handle swapping a player in the multi
  const handleMultiSwap = (updatedResult: MultiResult) => {
    setMultiResult(updatedResult);
    setError(null);
  };

  // Framer Motion Variants for smooth transitions
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  // Determine animation direction
  // This simple example assumes forward is always stage n -> n+1
  // A more robust solution might track the previous stage
  const direction = 1; // Assuming forward motion for simplicity here

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md relative overflow-hidden"> {/* Remove h-[400px] fixed height */}
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentStage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full" // Remove absolute positioning
          >
            {currentStage === 1 && (
              <Stage1 onSubmit={handleStage1Submit} />
            )}
            {currentStage === 2 && stake !== null && (
              <Stage2
                stake={stake}
                onSubmit={handleStage2Submit}
                onBack={handleBack}
              />
            )}
            {currentStage === 3 && stake !== null && winAmount !== null && (
              <Stage3
                isLoading={isLoading}
                error={error}
                result={multiResult}
                onBack={handleBack}
                onRestart={handleRestart}
                onSwap={handleMultiSwap}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
