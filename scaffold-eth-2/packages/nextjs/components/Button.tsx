import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export const Button = ({ children, className = "", disabled = false, onClick, type = "button" }: ButtonProps) => {
  return (
    <button
      type={type}
      className={`btn ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};