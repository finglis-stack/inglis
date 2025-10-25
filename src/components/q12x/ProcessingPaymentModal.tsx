import { useState, useEffect } from 'react';
import Lottie from "lottie-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';

interface ProcessingPaymentModalProps {
  isOpen: boolean;
}

const ProcessingPaymentModal = ({ isOpen }: ProcessingPaymentModalProps) => {
  const { t } = useTranslation('q12x');
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    if (isOpen && !animationData) {
      fetch('/animations/happy-fox.json')
        .then((response) => response.json())
        .then((data) => setAnimationData(data))
        .catch(error => console.error("Error loading animation:", error));
    }
  }, [isOpen, animationData]);

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="sm:max-w-[425px] text-center"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <style>{`
          [data-state="open"] > button[aria-label="Close"] {
            display: none;
          }
        `}</style>
        <DialogHeader>
          <DialogTitle>{t('processingModal.title')}</DialogTitle>
          <DialogDescription>
            {t('processingModal.desc')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-8">
          {animationData ? (
            <Lottie animationData={animationData} loop={true} style={{ height: 150 }} />
          ) : (
            <div style={{ height: 150 }} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProcessingPaymentModal;