// react-doctor-disable only-export-components
import clubLogo from "@/assets/club-logo.png";
import schoolLogo from "@/assets/school_logo.png";
import OptimizedImage from "@/components/ui/OptimizedImage";

export { clubLogo, schoolLogo };

interface ClubLogoProps {
  size?: number | string;
  priority?: boolean;
  showSchool?: boolean;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

const ClubLogo = ({
  size,
  priority = false,
  showSchool = false,
  alt = "YICDVP Logo",
  className,
  style,
}: ClubLogoProps) => {
  const sizeStyle: React.CSSProperties = size
    ? { width: typeof size === "number" ? `${size}px` : size, height: typeof size === "number" ? `${size}px` : size }
    : {};

  return (
    <>
      <OptimizedImage
        src={clubLogo}
        alt={alt}
        priority={priority}
        className={`bg-transparent ${className || ""}`}
        style={{ ...sizeStyle, ...style }}
      />
      {showSchool && (
        <OptimizedImage
          src={schoolLogo}
          alt="School Logo"
          priority={priority}
          className={`bg-transparent ${className || ""}`}
          style={{ ...sizeStyle, ...style }}
        />
      )}
    </>
  );
};

export default ClubLogo;
