import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Testimonials = () => {
  return (
    <section id="testimonials" className="py-20 bg-secondary">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Ce que nos partenaires en disent</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardContent className="pt-6">
              <blockquote className="italic">"L'intégration de la solution Inglis Dominium nous a permis de lancer une carte de crédit innovante en un temps record, tout en réduisant nos coûts opérationnels de manière significative."</blockquote>
            </CardContent>
            <CardFooter className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src="" alt="Logo Banque" />
                <AvatarFallback>DF</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">Directeur des Finances</p>
                <p className="text-sm text-muted-foreground">Grande institution financière</p>
              </div>
            </CardFooter>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <blockquote className="italic">"Le programme de cartes prépayées en marque blanche a transformé notre programme de fidélité. C'est un outil marketing puissant et une nouvelle source de revenus pour nous."</blockquote>
            </CardContent>
            <CardFooter className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src="" alt="Logo Commerce" />
                <AvatarFallback>VM</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">Vice-Présidente Marketing</p>
                <p className="text-sm text-muted-foreground">Chaîne de commerces de détail</p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
};