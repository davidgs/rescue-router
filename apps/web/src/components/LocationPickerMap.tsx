import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import { useEffect, useId, useRef } from "react";
import "leaflet/dist/leaflet.css";

async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<{ lat: number; lon: number; label: string }> {
  const res = await fetch(
    `/api/geocode?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
    { credentials: "include" },
  );
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? res.statusText);
  }
  return res.json() as Promise<{ lat: number; lon: number; label: string }>;
}

async function forwardGeocode(q: string): Promise<{
  lat: number;
  lon: number;
  label: string;
}> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? res.statusText);
  }
  return res.json() as Promise<{ lat: number; lon: number; label: string }>;
}

export type MapPickResult = { lat: number; lng: number; label: string };

type LocationPickerMapProps = {
  suggestAddress?: string;
  initialLat?: number | null;
  initialLng?: number | null;
  onPick: (p: MapPickResult) => void;
  onClose: () => void;
};

/**
 * Modal map: click to set an exact lat/lng; address label comes from reverse geocode.
 */
export function LocationPickerMap({
  suggestAddress,
  initialLat,
  initialLng,
  onPick,
  onClose,
}: LocationPickerMapProps) {
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const suggestQ = useQuery({
    queryKey: ["geocode", "suggest", suggestAddress ?? ""] as const,
    queryFn: () => forwardGeocode(suggestAddress!.trim()),
    enabled: !!suggestAddress && suggestAddress.trim().length >= 2,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const hasInitial = initialLat != null && initialLng != null;
    const lat0 = hasInitial ? initialLat! : 38.9;
    const lng0 = hasInitial ? initialLng! : -77.2;
    const zoom = hasInitial ? 16 : 6;

    const map = L.map(el, { scrollWheelZoom: true }).setView([lat0, lng0], zoom);
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          'Tiles &copy; Esri — Source: Esri, TomTom, Garmin, FAO, NOAA, USGS',
        maxZoom: 19,
      },
    ).addTo(map);
    mapRef.current = map;

    const applyPick = (lat: number, lng: number, label: string) => {
      onPickRef.current({ lat, lng, label });
    };

    const placeMarker = (lat: number, lng: number) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const ll = markerRef.current?.getLatLng();
          if (!ll) return;
          void reverseGeocode(ll.lat, ll.lng).then(
            (r) => {
              applyPick(r.lat, r.lon, r.label);
            },
            () => {
              applyPick(
                ll.lat,
                ll.lng,
                `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`,
              );
            },
          );
        });
      }
    };

    if (hasInitial) {
      placeMarker(initialLat!, initialLng!);
    }

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      placeMarker(lat, lng);
      void reverseGeocode(lat, lng).then(
        (r) => {
          applyPick(r.lat, r.lon, r.label);
        },
        () => {
          applyPick(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        },
      );
    });

    return () => {
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [initialLat, initialLng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (initialLat != null && initialLng != null) return;
    const d = suggestQ.data;
    if (!d) return;
    map.setView([d.lat, d.lon], 14);
  }, [suggestQ.data, initialLat, initialLng]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="rr-panel flex max-h-[90vh] w-full max-w-lg flex-col gap-3 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 id={titleId} className="font-semibold rr-ink">
              Set exact meeting place
            </h3>
            <p className="mt-1 text-xs leading-relaxed rr-ink-subtle">
              Click the map for the handoff or pickup spot. The address below
              updates from the map; you can edit it after saving. Drag the pin
              to fine-tune.
            </p>
          </div>
          <button
            type="button"
            className="rr-btn-muted shrink-0 text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {suggestQ.isError && (
          <p className="text-xs rr-text-danger">
            Could not center map on that address. Pan and click manually.
          </p>
        )}
        <div
          ref={containerRef}
          className="h-[min(320px,45vh)] w-full min-h-[220px] overflow-hidden rounded-xl border border-[var(--rr-border)]"
          role="presentation"
        />
        <p className="text-[11px] rr-ink-subtle">
          Basemap tiles © Esri (street/POI style) — reverse geocoding via
          Nominatim.
        </p>
      </div>
    </div>
  );
}
