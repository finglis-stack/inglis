import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export const Header = () => {
  return (
    <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <a href="#" className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Inglis Dominium</span>
        </a>
        <nav className="hidden md:flex gap-6 text-sm font-medium">
          <a href="#features" className="text-muted-foreground hover:text-foreground">
            Caractéristiques
          </a>
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground">
            Fonctionnement
          </a>
          <a href="#testimonials" className="text-muted-foreground hover:text-foreground">
            Témoignages
          </a>
        </nav>
        <Button>Obtenir ma carte</Button>
      </div>
    </header>
  );
};