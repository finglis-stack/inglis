import { useState } from 'react';
import { Shield, AlertTriangle, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type CreditReport = {
  id: string;
  full_name: string;
  ssn: string;
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  phone_number: string;
  email: string;
  credit_score: number;
  credit_history: Array<{
    date: string;
    type: string;
    details: string;
    status: 'Paid' | 'Late' | 'Active';
  }>;
};

const CreditReportAccess = () => {
  const [ssn, setSsn] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CreditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReport(null);

    const { data, error: dbError } = await supabase
      .from('credit_reports')
      .select('*')
      .eq('ssn', ssn)
      .single();

    if (dbError || !data) {
      setError(`DOSSIER NON TROUVÉ POUR LE NAS : ${ssn}`);
      setReport(null);
    } else {
      setReport(data as CreditReport);
    }

    setLoading(false);
  };

  const handleReset = () => {
    setSsn('');
    setReport(null);
    setError(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const getScoreColor = (score: number) => {
    if (score >= 800) return 'text-green-500';
    if (score >= 740) return 'text-lime-500';
    if (score >= 670) return 'text-yellow-500';
    if (score >= 580) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <>
      <style>{`
        body {
          background-color: #008080;
          font-family: 'MS Sans Serif', 'Arial', sans-serif;
        }
        .win95-window {
          background-color: #C0C0C0;
          border: 2px solid;
          border-top-color: #FFFFFF;
          border-left-color: #FFFFFF;
          border-right-color: #000000;
          border-bottom-color: #000000;
          box-shadow: 2px 2px 0px #000000;
        }
        .win95-title-bar {
          background: linear-gradient(to right, #000080, #1084d0);
          color: white;
          padding: 2px 4px;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .win95-content {
          padding: 1rem;
        }
        .win95-input {
          border: 2px solid;
          border-top-color: #808080;
          border-left-color: #808080;
          border-right-color: #FFFFFF;
          border-bottom-color: #FFFFFF;
          background-color: #FFFFFF;
          padding: 0.25rem 0.5rem;
        }
        .win95-button {
          background-color: #C0C0C0;
          border: 2px solid;
          border-top-color: #FFFFFF;
          border-left-color: #FFFFFF;
          border-right-color: #000000;
          border-bottom-color: #000000;
          padding: 0.25rem 0.75rem;
          box-shadow: 1px 1px 0px #000000;
        }
        .win95-button:active {
          border-top-color: #000000;
          border-left-color: #000000;
          border-right-color: #FFFFFF;
          border-bottom-color: #FFFFFF;
          box-shadow: none;
          transform: translate(1px, 1px);
        }
        .win95-status-bar {
          border: 1px solid;
          border-top-color: #808080;
          border-left-color: #808080;
          padding: 2px 4px;
          margin: 0 -1rem -1rem -1rem;
          margin-top: 1rem;
        }
        .win95-table {
          width: 100%;
          border-collapse: collapse;
        }
        .win95-table th, .win95-table td {
          border: 1px solid #808080;
          padding: 4px;
          text-align: left;
        }
        .win95-table th {
          background-color: #C0C0C0;
        }
        .win95-table tr:nth-child(even) {
          background-color: #FFFFFF;
        }
        .win95-table tr:nth-child(odd) {
          background-color: #F0F0F0;
        }
        @media print {
          body {
            background-color: #FFFFFF !important;
          }
          .print-hidden {
            display: none !important;
          }
          .win95-window {
            border: none !important;
            box-shadow: none !important;
            background-color: #FFFFFF !important;
          }
          .win95-content {
            padding: 0 !important;
          }
          .print-text-black {
            color: #000000 !important;
          }
          .print-border {
            border: 1px solid #808080 !important;
          }
        }
      `}</style>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="win95-window w-full max-w-3xl">
          <div className="win95-title-bar print-hidden">
            <span>BUREAU DE CRÉDIT</span>
            <div className="flex gap-1">
              <span className="w-4 h-4 bg-gray-300 border border-black flex items-center justify-center text-xs font-mono">_</span>
              <span className="w-4 h-4 bg-gray-300 border border-black flex items-center justify-center text-xs font-mono">[]</span>
              <span className="w-4 h-4 bg-gray-300 border border-black flex items-center justify-center text-xs font-mono">X</span>
            </div>
          </div>
          
          <div className="win95-content">
            {!report && (
              <div className="print-hidden">
                <div className="flex items-center gap-4 mb-4">
                  <Shield size={32} />
                  <h1 className="text-xl font-bold">Accès Sécurisé - Bureau de Crédit</h1>
                </div>
                <p className="mb-4 text-sm">
                  Ce système est réservé au personnel autorisé. Toutes les activités sont surveillées et enregistrées.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4 border-t-2 border-white border-l-2 pt-4">
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
                      placeholder="***-***-***"
                      required
                    />
                  </div>
                  <div className="text-right">
                    <button type="submit" className="win95-button" disabled={loading}>
                      {loading ? 'RECHERCHE...' : 'SOUMETTRE'}
                    </button>
                  </div>
                </form>
                {error && (
                  <div className="mt-4 p-4 bg-yellow-200 border border-yellow-400 text-yellow-800 flex items-center gap-2">
                    <AlertTriangle />
                    <span>ERREUR: {error}</span>
                  </div>
                )}
              </div>
            )}

            {report && (
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold print-text-black">{report.full_name}</h2>
                    <p className="print-text-black">NAS: ***-***-{report.ssn.slice(6)}</p>
                  </div>
                  <div className="text-center p-2 border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white print-border">
                    <p className="font-bold print-text-black">SCORE DE CRÉDIT</p>
                    <p className={`text-5xl font-mono font-bold ${report.credit_score ? getScoreColor(report.credit_score) : 'text-gray-500'} print-text-black`}>
                      {report.credit_score ?? 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <h3 className="font-bold print-text-black">Informations Personnelles</h3>
                    <div className="p-2 bg-white border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white mt-1 print-border">
                      <p className="print-text-black">{report.address?.street}</p>
                      <p className="print-text-black">{report.address?.city}, {report.address?.province} {report.address?.postalCode}</p>
                      <p className="print-text-black">{report.address?.country}</p>
                      <p className="print-text-black">Tél: {report.phone_number}</p>
                      <p className="print-text-black">Email: {report.email}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-bold mb-2 print-text-black">Historique de Crédit</h3>
                  <div className="h-64 overflow-y-scroll bg-white border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white print-border">
                    <table className="win95-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Détails</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.credit_history && report.credit_history.length > 0 ? (
                          report.credit_history.map((item, index) => (
                            <tr key={index}>
                              <td>{item.date}</td>
                              <td>{item.type}</td>
                              <td>{item.details}</td>
                              <td className={item.status === 'Late' ? 'text-red-600 font-bold' : ''}>{item.status}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center' }}>AUCUN HISTORIQUE DE CRÉDIT DISPONIBLE</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="text-right mt-4 print-hidden">
                  <button onClick={handlePrint} className="win95-button mr-2">
                    <Printer className="inline-block mr-2 h-4 w-4" />
                    IMPRIMER PDF
                  </button>
                  <button onClick={handleReset} className="win95-button">
                    NOUVELLE RECHERCHE
                  </button>
                </div>
              </div>
            )}

            <div className="win95-status-bar print-hidden">
              <p className="text-xs">PRÊT</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreditReportAccess;