import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'Montant Élevé', 'Score Impact': -25, fill: '#ef4444' },
  { name: 'Vélocité IP', 'Score Impact': -15, fill: '#ef4444' },
  { name: 'Nouvel Appareil', 'Score Impact': -10, fill: '#f97316' },
  { name: 'Heure Inhabituelle', 'Score Impact': -5, fill: '#f97316' },
  { name: 'Client Connu', 'Score Impact': 10, fill: '#22c55e' },
  { name: 'Appareil de Confiance', 'Score Impact': 15, fill: '#22c55e' },
];

const SampleRiskChart = () => (
  <div style={{ width: '100%', height: 300 }}>
    <ResponsiveContainer>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" domain={[-30, 20]} />
        <YAxis type="category" dataKey="name" width={120} />
        <Tooltip cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }} />
        <Legend />
        <Bar dataKey="Score Impact" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default SampleRiskChart;