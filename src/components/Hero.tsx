import { Button } from "@/components/ui/button";

export const Hero = () => {
  return (
    <section className="relative py-20 md:py-32 lg:py-40 text-center text-white overflow-hidden">
      <div className="absolute inset-0 z-[-1]">
        <img
          src="/hero-background.jpg"
          alt="Place Royale, Québec"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>
      
      <div className="container relative px-4 md:px-6">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-shadow-lg">
          Votre Programme de Cartes. Zéro Frais d'Interchange.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-200 text-shadow">
          Lancez votre propre carte de paiement en marque blanche. Une plateforme complète pour les banques, institutions financières et commerçants qui souhaitent innover sans les coûts traditionnels.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary">Commencez maintenant!</Button>
          <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary">
            Contactez-nous
          </Button>
        </div>
      </div>

      <p className="absolute bottom-2 right-4 text-xs text-gray-300/70">
        Photo par DEZALB
      </p>
    </section>
  );
};