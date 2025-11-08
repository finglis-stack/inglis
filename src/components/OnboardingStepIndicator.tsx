import { cn } from '@/lib/utils';

interface OnboardingStepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export const OnboardingStepIndicator = ({ steps, currentStep }: OnboardingStepIndicatorProps) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
      <div className="overflow-x-auto pb-2 -mb-2">
        <div className="flex items-center justify-between text-white min-w-max">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;

            return (
              <div key={step} className="flex items-center">
                <div className="flex items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full font-bold transition-colors flex-shrink-0",
                      isActive ? "bg-white text-black" : isCompleted ? "bg-white/50 text-black" : "border-2 border-white/50 text-white/50"
                    )}
                  >
                    {stepNumber}
                  </div>
                  <span className={cn("ml-3 whitespace-nowrap", isActive ? "font-bold" : "text-gray-300")}>
                    {step}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="mx-4 flex-1 border-t-2 border-dashed border-white/30 min-w-[20px]" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};