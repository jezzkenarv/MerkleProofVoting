export const Spinner = ({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  return (
    <div
      className={`animate-spin rounded-full border-t-2 border-primary border-solid ${sizeClasses[size]} ${className}`}
    ></div>
  );
};
