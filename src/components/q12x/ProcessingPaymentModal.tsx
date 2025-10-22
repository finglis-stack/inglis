import Lottie from "lottie-react";
import animationData from "/public/animations/happy-fox.json";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ProcessingPaymentModalProps {
  isOpen: boolean;
}

const ProcessingPaymentModal = ({ isOpen }: ProcessingPaymentModalProps) => {
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
          <DialogTitle>Traitement de votre paiement</DialogTitle>
          <DialogDescription>
            Veuillez patienter pendant que nous communiquons avec votre institution financière.
          </DialogDescription>
        </DialogHeader>
        <div className="py-8">
          <Lottie animationData={animationData} loop={true} style={{ height: 150 }} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProcessingPaymentModal;