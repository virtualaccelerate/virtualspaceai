import markAsset from "@/assets/virtual-space-mark.png.asset.json";

type Props = { className?: string; size?: number };

/**
 * Virtual Space brand mark — official logo from the brandbook.
 */
export function VirtualSpaceLogo({ className, size = 32 }: Props) {
  return (
    <img
      src={markAsset.url}
      alt="Virtual Space"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
