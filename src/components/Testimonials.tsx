import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { Quote } from "lucide-react";

export const Testimonials = () => {
  const { t } = useTranslation('landing');

  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight">{t('testimonials.title')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <Quote className="h-8 w-8 text-primary mb-4" />
              <blockquote className="text-lg italic text-foreground">"{t('testimonials.testimonial1_quote')}"</blockquote>
              <div className="flex items-center gap-4 mt-6">
                <Avatar>
                  <AvatarImage src="" alt="Logo Banque" />
                  <AvatarFallback>DF</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{t('testimonials.testimonial1_author')}</p>
                  <p className="text-sm text-muted-foreground">{t('testimonials.testimonial1_company')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <Quote className="h-8 w-8 text-primary mb-4" />
              <blockquote className="text-lg italic text-foreground">"{t('testimonials.testimonial2_quote')}"</blockquote>
              <div className="flex items-center gap-4 mt-6">
                <Avatar>
                  <AvatarImage src="" alt="Logo Commerce" />
                  <AvatarFallback>VM</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{t('testimonials.testimonial2_author')}</p>
                  <p className="text-sm text-muted-foreground">{t('testimonials.testimonial2_company')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};