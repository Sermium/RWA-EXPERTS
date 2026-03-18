'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface ProgressStepsProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

const STEPS = [
  { number: 1, label: 'Asset Info' },
  { number: 2, label: 'Tokenization' },
  { number: 3, label: 'Documents & Contact' },
  { number: 4, label: 'Review' },
];

export function ProgressSteps({ currentStep, onStepClick }: ProgressStepsProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.number}>
            <button
              onClick={() => onStepClick(step.number)}
              disabled={step.number > currentStep}
              className="flex flex-col items-center group"
            >
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
                  ${step.number < currentStep
                    ? 'bg-green-500 text-white'
                    : step.number === currentStep
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                  }
                  ${step.number <= currentStep ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}
                `}
              >
                {step.number < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  step.number <= currentStep ? 'text-white' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </button>

            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 rounded ${
                  step.number < currentStep ? 'bg-green-500' : 'bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
