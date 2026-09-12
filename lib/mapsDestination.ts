/** Select a business identity before falling back to internal map coordinates. */
export function getMapsDestination(shop: {
  name?: string;
  address?: string;
  lat?: unknown;
  lng?: unknown;
}): string | undefined {
  const name = shop.name?.trim();
  const address = shop.address?.trim();
  if (name && address) return `${name}, ${address}`;
  if (address) return address;
  if (name) return name;

  const coordinate = (value: unknown) =>
    typeof value === "number" || (typeof value === "string" && value.trim())
      ? Number(value)
      : NaN;
  const lat = coordinate(shop.lat);
  const lng = coordinate(shop.lng);
  if (Number.isFinite(lat) && Math.abs(lat) <= 90 &&
      Number.isFinite(lng) && Math.abs(lng) <= 180) {
    return `${lat},${lng}`;
  }
  return undefined;
}
