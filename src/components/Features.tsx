import { CreditCard, Lock, Globe, Sprout } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    icon: <CreditCard className="h-8 w-8 text-primary" />,
    title: "Le meilleur des deux mondes",
    description: "Profitez de la flexibilité du crédit et du contrôle du débit en une seule carte.",
  },
  {
    icon: <Lock className="h-8 w-8 text-primary" />,
    title: "Confidentialité assurée",
    description: "Notre processeur de paiement privé garantit la sécurité et l'anonymat de vos transactions.",
  },
  {
    icon: <Globe className="h-8 w-8 text-primary" />,
    title: "Utilisable partout",
    description: "Grâce à notre système 'open loop', votre carte est acceptée chez des millions de commerçants.",
  },
  {
    icon: <Sprout className="h-8 w-8 text-primary" />,
    title: "Fièrement québécois",
    description: "Soutenez une technologie financière locale, conçue et opérée ici même, au Québec.",
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-20 bg-secondary">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Pourquoi choisir Inglis Dominium ?</h2>
          <p className="text-muted-foreground mt-2">La solution de paiement qui s'adapte à vous.</p>
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