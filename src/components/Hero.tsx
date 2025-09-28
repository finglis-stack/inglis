import { Button } from "@/components/ui/button";

export const Hero = () => {
  return (
    <section className="relative py-20 md:py-32 lg:py-40 text-center text-white overflow-hidden">
      <div className="absolute inset-0 z-[-1]">
        <img
          src="/hero-background.jpg"
          alt="Renard dans la neige"
          className="w-full h-full object-cover filter blur-sm brightness-75"
        />
      </div>
      
      <div className="container relative px-4 md:px-6">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-shadow-lg">
          La liberté financière, réinventée.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-200 text-shadow">
          Inglis Dominium: La carte hybride qui combine le meilleur du crédit et du débit. Une solution de paiement 100% québécoise, privée et sécurisée.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button size="lg">Commencez aujourd'hui</Button>
          <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900">
            En savoir plus
          </Button>
        </div>
      </div>

      <p className="absolute bottom-2 right-4 text-xs text-gray-300/70">
        Photo par Alain Audet
      </p>
    </section>
  );
};