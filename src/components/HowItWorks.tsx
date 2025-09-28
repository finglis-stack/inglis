export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Simple comme 1-2-3</h2>
          <p className="text-muted-foreground mt-2">Obtenez votre carte en quelques étapes faciles.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">1</div>
            <h3 className="text-xl font-semibold">Inscrivez-vous</h3>
            <p className="text-muted-foreground mt-2">Remplissez notre formulaire sécurisé en moins de 5 minutes.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">2</div>
            <h3 className="text-xl font-semibold">Recevez votre carte</h3>
            <p className="text-muted-foreground mt-2">Votre carte Inglis Dominium vous sera livrée directement chez vous.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">3</div>
            <h3 className="text-xl font-semibold">Utilisez-la partout</h3>
            <p className="text-muted-foreground mt-2">Commencez à payer en ligne ou en magasin, en toute simplicité.</p>
          </div>
        </div>
      </div>
    </section>
  );
};