import { useTheme } from "../../context/ThemeContext";
import logoLight from "../../assets/newdev-light.png";
import logoDark from "../../assets/newdev-dark.jpg";

/**
 * Renders the correct NewDev logo asset for the active theme. Pass
 * forceTheme to override (used by the splash screen, which always shows
 * the dark mark regardless of the user's saved preference).
 */
export default function Logo({ className = "h-9 w-auto", forceTheme }) {
  const { theme } = useTheme();
  const activeTheme = forceTheme || theme;
  const src = activeTheme === "dark" ? logoDark : logoLight;

  return <img src={src} alt="NewDev Digital Solutions" className={className} />;
}
