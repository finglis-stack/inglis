import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const StepIndicator = ({ steps, currentStep }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="space-y-6">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className="relative flex items-start">
            {stepIdx !== steps.length - 1 ? (
              <div className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
            ) : null}
            <div className="flex h-8 w-8 items-center">
              {currentStep > step.id ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                  <Check className="h-5 w-5 text-white" aria-hidden="true" />
                </span>
              ) : currentStep === step.id ? (
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                </span>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="ml-4 flex min-w-0 flex-col">
              <span className={cn("text-sm font-semibold", currentStep === step.id ? "text-primary" : "text-gray-900")}>
                {step.name}
              </span>
              <span className="text-sm text-gray-500">{step.description}</span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};