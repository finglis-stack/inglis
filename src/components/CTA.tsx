import { Button } from "@/components/ui/button";

export const CTA = () => {
  return (
    <section className="py-20">
      <div className="container px-4 md:px-6 text-center">
        <h2 className="text-3xl font-bold">Prêt à transformer votre expérience de paiement ?</h2>
        <p className="text-muted-foreground mt-2 max-w-lg mx-auto">Rejoignez des milliers de Québécois qui ont déjà fait le saut vers une finance plus simple et plus sûre.</p>
        <Button size="lg" className="mt-8">Rejoignez Inglis Dominium aujourd'hui</Button>
      </div>
    </section>
  );
};