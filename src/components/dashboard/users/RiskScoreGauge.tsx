import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

const RiskScoreGauge = ({ score }) => {
  const getColor = (s) => {
    if (s >= 70) return '#22c55e'; // green-500
    if (s >= 40) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const data = [{ name: 'score', value: score, fill: getColor(score) }];

  return (
    <div className="relative w-48 h-48">
      <RadialBarChart
        width={192}
        height={192}
        cx="50%"
        cy="50%"
        innerRadius="70%"
        outerRadius="90%"
        barSize={20}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar background dataKey="value" cornerRadius={10} />
      </RadialBarChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color: getColor(score) }}>{score}</span>
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
};

export default RiskScoreGauge;