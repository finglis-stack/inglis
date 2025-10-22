import { DollarSign, Award, Layers, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const featureKeys = [
  {
    icon: <DollarSign className="h-8 w-8 text-primary" />,
    titleKey: "features.feature1_title",
    descriptionKey: "features.feature1_desc",
  },
  {
    icon: <Award className="h-8 w-8 text-primary" />,
    titleKey: "features.feature2_title",
    descriptionKey: "features.feature2_desc",
  },
  {
    icon: <Layers className="h-8 w-8 text-primary" />,
    titleKey: "features.feature3_title",
    descriptionKey: "features.feature3_desc",
  },
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    titleKey: "features.feature4_title",
    descriptionKey: "features.feature4_desc",
  },
];

export const Features = () => {
  const { t } = useTranslation();

  return (
    <section id="features" className="py-20 bg-secondary">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">{t('features.title')}</h2>
          <p className="text-muted-foreground mt-2">{t('features.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {featureKeys.map((feature, index) => (
            <Card key={index}>
              <CardHeader>
                {feature.icon}
                <CardTitle className="mt-4">{t(feature.titleKey)}</CardTitle>
                <CardDescription className="mt-2">{t(feature.descriptionKey)}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};