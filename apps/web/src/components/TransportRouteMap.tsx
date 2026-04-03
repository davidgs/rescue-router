import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type RouteMapLeg = {
  id: string;
  sequence: number;
  startLocation: string;
  endLocation: string;
  startLat?: number | null;
  startLng?: number | null;
  endLat?: number | null;
  endLng?: number | null;
};

const LEG_LINE_COLORS = [
  "#c2410c",
  "#0f766e",
  "#1d4ed8",
  "#7c3aed",
  "#b45309",
];

type Stop = {
  key: string;
  label: string;
  lat?: number | null;
  lng?: number | null;
};

async function geocodeAddress(q: string): Promise<{
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

function stopsFromLegs(legs: RouteMapLeg[]): Stop[] {
  const out: Stop[] = [];
  for (const leg of legs) {
    out.push({
      key: `${leg.id}-start`,
      label: leg.startLocation,
      lat: leg.startLat,
      lng: leg.startLng,
    });
    out.push({
      key: `${leg.id}-end`,
      label: leg.endLocation,
      lat: leg.endLat,
      lng: leg.endLng,
    });
  }
  return out;
}

export function TransportRouteMap({ legs }: { legs: RouteMapLeg[] }) {
  const stops = useMemo(() => stopsFromLegs(legs), [legs]);

  const textOnlyQueries = useMemo(() => {
    return stops
      .filter((s) => s.lat == null || s.lng == null)
      .map((s) => ({ key: s.key, label: s.label }));
  }, [stops]);

  const geoQueries = useQueries({
    queries: textOnlyQueries.map(({ key, label }) => ({
      queryKey: ["geocode", "text", key, label] as const,
      queryFn: () => geocodeAddress(label),
      staleTime: 1000 * 60 * 60 * 24,
      retry: 1,
    })),
  });

  const coordByStopKey = useMemo(() => {
    const m = new Map<string, { lat: number; lon: number }>();
    let ti = 0;
    for (const s of stops) {
      if (s.lat != null && s.lng != null) {
        m.set(s.key, { lat: s.lat, lon: s.lng });
      } else {
        const d = geoQueries[ti++]?.data;
        if (d) m.set(s.key, { lat: d.lat, lon: d.lon });
      }
    }
    return m;
  }, [stops, geoQueries]);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const map = L.map(el, { scrollWheelZoom: true }).setView(
      [38.9, -77.2],
      6,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) return;
      map.removeLayer(layer);
    });

    if (legs.length === 0) return;

    const boundsPts: L.LatLngTuple[] = [];

    legs.forEach((leg, idx) => {
      const start = coordByStopKey.get(`${leg.id}-start`);
      const end = coordByStopKey.get(`${leg.id}-end`);
      if (!start || !end) return;
      const color = LEG_LINE_COLORS[idx % LEG_LINE_COLORS.length];
      L.polyline(
        [
          [start.lat, start.lon],
          [end.lat, end.lon],
        ],
        { color, weight: 4, opacity: 0.88 },
      ).addTo(map);

      const pin =
        leg.startLat != null && leg.startLng != null ? " (exact pin)" : "";
      L.circleMarker([start.lat, start.lon], {
        radius: 9,
        color: "#fafaf9",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(`Leg ${leg.sequence} · start${pin}\n${leg.startLocation}`, {
          direction: "top",
        });

      const endPin =
        leg.endLat != null && leg.endLng != null ? " (exact pin)" : "";
      L.circleMarker([end.lat, end.lon], {
        radius: 7,
        color: "#fafaf9",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.55,
      })
        .addTo(map)
        .bindTooltip(`Leg ${leg.sequence} · handoff / end${endPin}\n${leg.endLocation}`, {
          direction: "top",
        });

      boundsPts.push(
        [start.lat, start.lon],
        [end.lat, end.lon],
      );
    });

    if (boundsPts.length) {
      map.fitBounds(L.latLngBounds(boundsPts), {
        padding: [48, 48],
        maxZoom: 8,
      });
    }
  }, [legs, coordByStopKey]);

  const loading = geoQueries.some((q) => q.isPending);
  const anyError = geoQueries.some((q) => q.isError);
  const allResolved =
    textOnlyQueries.length === 0 || geoQueries.every((q) => !q.isPending);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[var(--rr-border)] bg-[var(--rr-surface)] shadow-inner"
      aria-label={
        legs.length
          ? `Route map with ${legs.length} leg${legs.length === 1 ? "" : "s"}`
          : "Route map"
      }
    >
      {loading && (
        <div
          className="absolute inset-0 z-[400] flex flex-col items-center justify-center gap-2 bg-[var(--rr-surface)]/92 px-4 text-sm text-[var(--rr-text-muted)] backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="font-medium text-[var(--rr-text)]">Plotting route…</span>
          <span className="max-w-xs text-center text-xs text-[var(--rr-text-subtle)]">
            Geocoding stops without a map pin (OpenStreetMap). Pinned locations
            use your exact coordinates.
          </span>
        </div>
      )}
      {allResolved && anyError && (
        <div
          className="rr-error-box border-b-0 rounded-none border-x-0 border-t-0 px-3 py-2 text-xs"
          role="status"
          aria-live="polite"
        >
          Some stops could not be placed on the map. Add a pin from the leg
          editor or check the address text.
        </div>
      )}
      <div
        ref={containerRef}
        className="z-0 h-[min(420px,55vh)] w-full min-h-[280px] sm:min-h-[360px]"
        {...(legs.length > 0
          ? {
              role: "presentation",
            }
          : { "aria-hidden": true })}
      />
      <p
        className="border-t border-[var(--rr-border)] px-3 py-2 text-[11px] leading-snug"
        style={{
          background: "var(--rr-surface-raised)",
          color: "var(--rr-text-subtle)",
        }}
      >
        Map data © OpenStreetMap contributors · Straight lines between stops.
        Orange markers: saved pins are exact; faded markers use geocoded
        addresses only.
      </p>
    </section>
  );
}
