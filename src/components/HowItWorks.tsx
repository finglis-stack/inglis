export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Un Lancement en 3 Étapes Clés</h2>
          <p className="text-muted-foreground mt-2">Notre processus d'intégration est simple, rapide et transparent.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">1</div>
            <h3 className="text-xl font-semibold">Consultation & Stratégie</h3>
            <p className="text-muted-foreground mt-2">Nous définissons ensemble vos besoins pour créer un programme de cartes sur mesure qui atteint vos objectifs d'affaires.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">2</div>
            <h3 className="text-xl font-semibold">Intégration & Personnalisation</h3>
            <p className="text-muted-foreground mt-2">Nos équipes techniques intègrent notre plateforme à vos systèmes et personnalisent les cartes selon votre marque.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">3</div>
            <h3 className="text-xl font-semibold">Lancement & Croissance</h3>
            <p className="text-muted-foreground mt-2">Nous vous accompagnons lors du lancement de votre programme et vous fournissons les outils pour en assurer le succès.</p>
          </div>
        </div>
      </div>
    </section>
  );
};