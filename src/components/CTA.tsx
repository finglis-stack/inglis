import { Button } from "@/components/ui/button";

export const CTA = () => {
  return (
    <section className="py-20">
      <div className="container px-4 md:px-6 text-center">
        <h2 className="text-3xl font-bold">Prêt à lancer votre propre solution de paiement ?</h2>
        <p className="text-muted-foreground mt-2 max-w-lg mx-auto">Contactez notre équipe d'experts pour découvrir comment Inglis Dominium peut transformer votre entreprise.</p>
        <Button size="lg" className="mt-8">Planifier une consultation</Button>
      </div>
    </section>
  );
};