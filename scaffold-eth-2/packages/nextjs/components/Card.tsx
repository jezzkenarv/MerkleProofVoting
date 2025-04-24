import { ReactNode } from "react";

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
  return (
    <div className={`bg-base-100 shadow-xl rounded-xl border border-base-300 ${className}`}>
      {children}
    </div>
  );
};