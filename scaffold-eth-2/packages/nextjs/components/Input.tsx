import { ChangeEvent } from "react";

interface InputProps {
  label?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}

export const Input = ({ label, value, onChange, placeholder, type = "text", className = "" }: InputProps) => {
  return (
    <div className="form-control w-full">
      {label && <label className="label">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input input-bordered w-full ${className}`}
      />
    </div>
  );
};