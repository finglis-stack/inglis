import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Lottie from "lottie-react";
import animationData from "@/assets/processing-animation.json";

const ProcessingPaymentModal = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-center">Traitement en cours</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <Lottie animationData={animationData} loop={true} style={{ width: 150, height: 150 }} />
          <p className="text-muted-foreground">Veuillez patienter pendant que nous traitons votre paiement...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProcessingPaymentModal;