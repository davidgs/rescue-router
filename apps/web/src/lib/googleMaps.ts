let googleMapsPromise: Promise<void> | null = null;

function getApiKey(): string | null {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof key === "string" && key.trim().length > 0 ? key.trim() : null;
}

export function loadGoogleMapsApi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps requires a browser environment."));
  }
  const key = getApiKey();
  if (!key) {
    return Promise.reject(
      new Error("VITE_GOOGLE_MAPS_API_KEY is missing. Add it to your local .env."),
    );
  }
  const w = window as Window & { google?: unknown };
  if (w.google) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-rr-google-maps="true"]',
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed loading Google Maps script.")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.rrGoogleMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key,
    )}&libraries=places`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed loading Google Maps script."));
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}
