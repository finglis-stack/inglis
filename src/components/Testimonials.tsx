import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Testimonials = () => {
  return (
    <section id="testimonials" className="py-20 bg-secondary">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Ce que nos utilisateurs en disent</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardContent className="pt-6">
              <blockquote className="italic">"Enfin une carte qui comprend mes besoins. L'aspect hybride est révolutionnaire et le fait que ce soit une entreprise d'ici me rend fier."</blockquote>
            </CardContent>
            <CardFooter className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>JP</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">Jean-Philippe L.</p>
                <p className="text-sm text-muted-foreground">Montréal, QC</p>
              </div>
            </CardFooter>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <blockquote className="italic">"La sécurité était ma priorité. Avec Inglis Dominium, je suis tranquille. Le service à la clientèle est aussi incroyablement réactif."</blockquote>
            </CardContent>
            <CardFooter className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src="https://github.com/vercel.png" alt="@vercel" />
                <AvatarFallback>MÉ</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">Marie-Ève T.</p>
                <p className="text-sm text-muted-foreground">Québec, QC</p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
};