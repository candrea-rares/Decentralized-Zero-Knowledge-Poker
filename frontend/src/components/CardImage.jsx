function cardImageFile(label) {
  if (!label || label.startsWith("Unknown")) {
    return "/cards/back.png";
  }

  const normalized = label
    .toLowerCase()
    .replaceAll(" ", "_")
    .replace("a_", "ace_")
    .replace("k_", "king_")
    .replace("q_", "queen_")
    .replace("j_", "jack_");

  return `/cards/${normalized}.png`;
}

export default function CardImage({
  label,
  hidden = false,
  half = false,
  className = ""
}) {
  const src = hidden ? "/cards/back.png" : cardImageFile(label);

  return (
    <img
      className={`playing-card ${half ? "half-card" : ""} ${className}`}
      src={src}
      alt={hidden ? "Hidden card" : label}
    />
  );
}