import { DollarSign, Award, Layers, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    icon: <DollarSign className="h-8 w-8 text-primary" />,
    title: "Zéro Frais d'Interchange",
    description: "Éliminez une source de coûts majeure et augmentez vos marges sur chaque transaction grâce à notre processeur de paiement privé.",
  },
  {
    icon: <Award className="h-8 w-8 text-primary" />,
    title: "Solution Marque Blanche Complète",
    description: "Renforcez votre marque avec des cartes de débit, crédit ou prépayées personnalisées à votre image, sans frais de développement initiaux.",
  },
  {
    icon: <Layers className="h-8 w-8 text-primary" />,
    title: "Flexibilité Hybride Inégalée",
    description: "Offrez des produits de crédit, débit et prépayés sur une seule carte, vous permettant de créer des offres uniques pour vos clients.",
  },
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: "Partenariat et Expertise Locale",
    description: "Bénéficiez d'une intégration simple et d'un support expert basé au Québec pour lancer votre programme de cartes rapidement.",
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-20 bg-secondary">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Une Plateforme de Paiement Révolutionnaire</h2>
          <p className="text-muted-foreground mt-2">Conçue pour optimiser vos revenus et fidéliser vos clients.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardHeader>
                {feature.icon}
                <CardTitle className="mt-4">{feature.title}</CardTitle>
                <CardDescription className="mt-2">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};