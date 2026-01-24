import React, { useEffect } from 'react';

type MobileLayoutProps = {
  title?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
};

const MobileLayout = ({ title, children, headerRight }: MobileLayoutProps) => {
  // Force dark theme pour un look fintech sombre et cohérent
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      // ne retire pas la classe pour garder l'expérience sombre cohérente
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-foreground flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="max-w-md mx-auto w-full px-4 py-4 flex flex-col gap-6 flex-1">
        {title ? (
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-light tracking-wide text-white/90">
              {title}
            </h1>
            {headerRight ? <div>{headerRight}</div> : null}
          </div>
        ) : null}

        <div className="flex-1 flex flex-col">{children}</div>
      </div>
    </div>
  );
};

export default MobileLayout;