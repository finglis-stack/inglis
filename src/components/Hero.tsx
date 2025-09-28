import { Button } from "@/components/ui/button";

export const Hero = () => {
  return (
    <section className="py-20 md:py-32 lg:py-40 text-center">
      <div className="container px-4 md:px-6">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter">
          La liberté financière, réinventée.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Inglis Dominium: La carte hybride qui combine le meilleur du crédit et du débit. Une solution de paiement 100% québécoise, privée et sécurisée.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button size="lg">Commencez aujourd'hui</Button>
          <Button size="lg" variant="outline">
            En savoir plus
          </Button>
        </div>
      </div>
    </section>
  );
};