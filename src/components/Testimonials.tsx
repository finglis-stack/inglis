import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";

export const Testimonials = () => {
  const { t } = useTranslation();

  return (
    <section id="testimonials" className="py-20 bg-secondary">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">{t('testimonials.title')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardContent className="pt-6">
              <blockquote className="italic">"{t('testimonials.testimonial1_quote')}"</blockquote>
            </CardContent>
            <CardFooter className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src="" alt="Logo Banque" />
                <AvatarFallback>DF</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{t('testimonials.testimonial1_author')}</p>
                <p className="text-sm text-muted-foreground">{t('testimonials.testimonial1_company')}</p>
              </div>
            </CardFooter>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <blockquote className="italic">"{t('testimonials.testimonial2_quote')}"</blockquote>
            </CardContent>
            <CardFooter className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src="" alt="Logo Commerce" />
                <AvatarFallback>VM</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{t('testimonials.testimonial2_author')}</p>
                <p className="text-sm text-muted-foreground">{t('testimonials.testimonial2_company')}</p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
};