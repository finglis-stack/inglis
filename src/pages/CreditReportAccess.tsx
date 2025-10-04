import { useState } from 'react';
import { Shield } from 'lucide-react';

const CreditReportAccess = () => {
  const [ssn, setSsn] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simule une requête réseau
    setTimeout(() => {
      alert(`Recherche pour le NAS : ${ssn}\n(Fonctionnalité non implémentée)`);
      setLoading(false);
    }, 1500);
  };

  return (
    <>
      <style>{`
        body {
          background-color: #C0C0C0;
          font-family: 'Times New Roman', Times, serif;
        }
        .win95-container {
          background-color: #C0C0C0;
          border: 2px solid;
          border-top-color: #FFFFFF;
          border-left-color: #FFFFFF;
          border-right-color: #808080;
          border-bottom-color: #808080;
          padding: 1rem;
          box-shadow: 2px 2px 5px rgba(0,0,0,0.5);
        }
        .win95-input {
          border: 2px solid;
          border-top-color: #808080;
          border-left-color: #808080;
          border-right-color: #FFFFFF;
          border-bottom-color: #FFFFFF;
          background-color: #FFFFFF;
          padding: 0.25rem 0.5rem;
          font-family: 'Courier New', Courier, monospace;
        }
        .win95-button {
          background-color: #C0C0C0;
          border: 2px solid;
          border-top-color: #FFFFFF;
          border-left-color: #FFFFFF;
          border-right-color: #808080;
          border-bottom-color: #808080;
          padding: 0.5rem 1rem;
          box-shadow: 1px 1px 0px #000000;
        }
        .win95-button:active {
          border-top-color: #808080;
          border-left-color: #808080;
          border-right-color: #FFFFFF;
          border-bottom-color: #FFFFFF;
          box-shadow: none;
          transform: translate(1px, 1px);
        }
      `}</style>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="win95-container w-full max-w-md">
          <div className="flex items-center gap-4 mb-4">
            <Shield size={32} />
            <h1 className="text-xl font-bold">Accès - Bureau Fédéral de Crédit</h1>
          </div>
          <p className="mb-4 text-sm">
            Ce système est réservé au personnel autorisé. Toutes les activités sont surveillées et enregistrées.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="ssn" className="block mb-1 font-bold">
                Numéro d'Assurance Sociale (NAS):
              </label>
              <input
                id="ssn"
                type="text"
                value={ssn}
                onChange={(e) => setSsn(e.target.value)}
                className="win95-input w-full"
                placeholder="___-___-___"
                required
              />
            </div>
            <div className="text-right">
              <button type="submit" className="win95-button" disabled={loading}>
                {loading ? 'Recherche...' : 'Soumettre'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreditReportAccess;