import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="bg-gray-900 sticky top-0 z-50 border-b border-gray-700">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <a href="#" className="flex items-center">
          <img src="/logo.png" alt="Inglis Dominium Logo" className="h-10" />
        </a>
        <nav className="hidden md:flex gap-6 text-sm font-medium">
          <a href="#features" className="text-gray-300 hover:text-white transition-colors">
            Caractéristiques
          </a>
          <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">
            Fonctionnement
          </a>
          <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors">
            Témoignages
          </a>
        </nav>
        <Button>Obtenir ma carte</Button>
      </div>
    </header>
  );
};