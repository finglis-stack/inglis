import { DollarSign, Award, Layers, Users } from "lucide-react";
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
  const { t } = useTranslation('landing');

  return (
    <section id="features" className="py-20 bg-white">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight">{t('features.title')}</h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{t('features.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {featureKeys.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-xl bg-primary/10 mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold">{t(feature.titleKey)}</h3>
              <p className="text-muted-foreground mt-2">{t(feature.descriptionKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};