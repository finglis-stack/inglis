import { useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

const LogIcon = ({ status }) => {
  switch (status) {
    case 'success': return <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />;
    case 'error': return <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
    case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
    default: return <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />;
  }
};

export const ProcessingLogConsole = ({ logs }) => {
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div ref={consoleRef} className="h-64 bg-gray-900 text-white font-mono text-xs rounded-md p-4 overflow-y-auto">
      {logs && logs.length > 0 ? (
        logs.map((log, index) => (
          <div key={index} className="flex items-start gap-2 mb-1">
            <LogIcon status={log.status} />
            <span className="flex-1">{log.message}</span>
            <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
          </div>
        ))
      ) : (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>En attente du début du traitement...</span>
        </div>
      )}
    </div>
  );
};