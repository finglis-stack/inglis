import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { subject: 'Vitesse de Frappe', A: 85, B: 110, fullMark: 150 },
  { subject: 'Mouvements Souris', A: 90, B: 70, fullMark: 150 },
  { subject: 'Temps sur Page', A: 120, B: 130, fullMark: 150 },
  { subject: 'Scroll', A: 75, B: 90, fullMark: 150 },
  { subject: 'Copier/Coller', A: 140, B: 50, fullMark: 150 },
];

const SampleBehavioralChart = () => (
  <div style={{ width: '100%', height: 300 }}>
    <ResponsiveContainer>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis angle={30} domain={[0, 150]} />
        <Radar name="Utilisateur Légitime" dataKey="A" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
        <Radar name="Comportement Suspect" dataKey="B" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  </div>
);

export default SampleBehavioralChart;