import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

const getImpactColor = (impact) => {
  const numericImpact = parseInt(impact, 10);
  if (numericImpact < 0) return 'text-red-500';
  if (numericImpact > 0) return 'text-green-500';
  return 'text-gray-500';
};

const RiskAnalysisLog = ({ log }) => {
  if (!log || log.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal d'Analyse Chronologique</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-8">
          <div className="absolute left-[15px] top-0 h-full w-0.5 bg-gray-200" />
          <ul className="space-y-4">
            {log.map((item, index) => (
              <li key={index} className="relative flex items-start gap-4">
                <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-4 ring-white">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold">{item.step}</p>
                    <p className="text-xs text-gray-400">+{item.timestamp}ms</p>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-muted-foreground">{item.result}</p>
                    <p className={`text-sm font-mono font-semibold ${getImpactColor(item.impact)}`}>{item.impact}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskAnalysisLog;