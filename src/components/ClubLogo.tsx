// react-doctor-disable only-export-components
import clubLogo from "@/assets/club-logo.webp";
import clubLogoAvif from "@/assets/club-logo.avif";
import schoolLogo from "@/assets/school_logo.webp";
import schoolLogoAvif from "@/assets/school_logo.avif";
import OptimizedImage from "@/components/common/OptimizedImage";

// Asset re-exports kept here so import sites don't change modules.
/* eslint-disable react-refresh/only-export-components -- image asset re-exports, not runtime code */
export { clubLogo, clubLogoAvif, schoolLogo, schoolLogoAvif };
/* eslint-enable react-refresh/only-export-components */

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
  const numericSize = typeof size === "number" ? size : undefined;
  const sizeStyle: React.CSSProperties = size
    ? { width: typeof size === "number" ? `${size}px` : size, height: typeof size === "number" ? `${size}px` : size }
    : {};

  return (
    <>
      <OptimizedImage
        src={clubLogo}
        avifSrc={clubLogoAvif}
        alt={alt}
        width={numericSize}
        height={numericSize}
        priority={priority}
        className={`bg-transparent ${className || ""}`}
        style={{ ...sizeStyle, ...style }}
      />
      {showSchool && (
        <OptimizedImage
          src={schoolLogo}
          avifSrc={schoolLogoAvif}
          alt="School Logo"
          width={numericSize}
          height={numericSize}
          priority={priority}
          className={`bg-transparent ${className || ""}`}
          style={{ ...sizeStyle, ...style }}
        />
      )}
    </>
  );
};

export default ClubLogo;
