interface TeamLogoProps {
  name: string;
  flagUrl?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

function isImageUrl(value?: string | null) {
  return Boolean(value && /^(https?:)?\/\//.test(value));
}

export default function TeamLogo({
  name,
  flagUrl,
  className = "w-10 h-10",
  imageClassName = "w-8 h-8",
  fallbackClassName = "text-[28px]"
}: TeamLogoProps) {
  if (isImageUrl(flagUrl)) {
    return (
      <span className={`${className} rounded-full border border-border bg-white shadow-sm overflow-hidden grid place-items-center shrink-0`}>
        <img src={flagUrl!} alt={`${name} logo`} className={`${imageClassName} object-contain`} />
      </span>
    );
  }

  return (
    <span className={`${className} rounded-full border border-border bg-white shadow-sm grid place-items-center shrink-0 ${fallbackClassName}`}>
      {flagUrl || "🏳️"}
    </span>
  );
}
