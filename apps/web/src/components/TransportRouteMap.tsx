import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiJson } from "../lib/api";
import { loadGoogleMapsApi } from "../lib/googleMaps";

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

type TransferCandidate = {
  placeName: string;
  address: string;
  lat: number;
  lng: number;
};

export function TransportRouteMap({
  legs,
  orgId,
  transportId,
  canManage,
}: {
  legs: RouteMapLeg[];
  orgId: string;
  transportId: string;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number }>>(
    new Map(),
  );
  const autoFitKeyRef = useRef("");
  const resizeDragRef = useRef<{ startY: number; startHeight: number } | null>(
    null,
  );
  const [isResizing, setIsResizing] = useState(false);
  const [mapHeight, setMapHeight] = useState(420);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transferCandidate, setTransferCandidate] =
    useState<TransferCandidate | null>(null);
  const [transferLegId, setTransferLegId] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [applyingTransfer, setApplyingTransfer] = useState(false);

  const clampMapHeight = useCallback((h: number) => {
    const viewportMax =
      typeof window === "undefined" ? 820 : Math.floor(window.innerHeight * 0.8);
    const max = Math.max(360, viewportMax);
    return Math.min(Math.max(h, 280), max);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    let cancelled = false;
    void loadGoogleMapsApi()
      .then(() => {
        if (cancelled) return;
        const g = (window as Window & { google?: any }).google;
        if (!g?.maps) {
          setErrorMsg("Google Maps failed to initialize.");
          return;
        }
        const map = new g.maps.Map(el, {
          center: { lat: 38.9, lng: -77.2 },
          zoom: 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;
      })
      .catch((e: unknown) => {
        setErrorMsg(e instanceof Error ? e.message : "Could not load Google Maps.");
      });
    return () => {
      cancelled = true;
      overlaysRef.current.forEach((o) => {
        if ("setMap" in o && typeof o.setMap === "function") o.setMap(null);
      });
      overlaysRef.current = [];
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    const map = mapRef.current;
    if (!el || !map || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const g = (window as Window & { google?: any }).google;
      if (g?.maps?.event) g.maps.event.trigger(map, "resize");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapHeight]);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: PointerEvent) => {
      const s = resizeDragRef.current;
      if (!s) return;
      const next = clampMapHeight(s.startHeight + (e.clientY - s.startY));
      setMapHeight(next);
    };
    const onUp = () => {
      resizeDragRef.current = null;
      setIsResizing(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [clampMapHeight, isResizing]);

  const geometryKey = useMemo(() => {
    return legs
      .map((leg) => {
        const s = `${leg.startLat ?? "?"},${leg.startLng ?? "?"}:${leg.startLocation}`;
        const e = `${leg.endLat ?? "?"},${leg.endLng ?? "?"}:${leg.endLocation}`;
        return `${leg.id}:${s}->${e}`;
      })
      .join("|");
  }, [legs]);

  const transferPairs = useMemo(() => {
    const out: Array<{ fromLegId: string; fromSeq: number; toSeq: number }> = [];
    for (let i = 0; i < legs.length - 1; i++) {
      const a = legs[i];
      const b = legs[i + 1];
      if (!a || !b) continue;
      out.push({ fromLegId: a.id, fromSeq: a.sequence, toSeq: b.sequence });
    }
    return out;
  }, [legs]);

  useEffect(() => {
    if (!transferPairs.length) {
      setTransferLegId("");
      return;
    }
    if (!transferPairs.some((p) => p.fromLegId === transferLegId)) {
      setTransferLegId(transferPairs[0]?.fromLegId ?? "");
    }
  }, [transferLegId, transferPairs]);

  useEffect(() => {
    const map = mapRef.current;
    const g = (window as Window & { google?: any }).google;
    if (!map || !g) return;
    let cancelled = false;
    const geocoder = new g.maps.Geocoder();
    const directions = new g.maps.DirectionsService();
    const places = new g.maps.places.PlacesService(map);
    const bounds = new g.maps.LatLngBounds();
    if (!infoWindowRef.current) {
      infoWindowRef.current = new g.maps.InfoWindow();
    }
    const infoWindow = infoWindowRef.current;
    const mapClickListener = map.addListener("click", (e: any) => {
      const escapeHtml = (text: string) =>
        text
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      const showPopup = (place: any) => {
        if (!place?.geometry?.location) return;
        const placeName = String(place.name ?? "Selected business");
        const address = String(place.formatted_address ?? place.vicinity ?? "");
        const buttonId = `rr-transfer-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
        const canApply = canManage && transferPairs.length > 0;
        infoWindow.setContent(
          `<div style="max-width:260px;font:13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
            <div style="font-weight:600;color:#111827;">${escapeHtml(placeName)}</div>
            ${address ? `<div style="margin-top:4px;color:#6b7280;">${escapeHtml(address)}</div>` : ""}
            ${
              canApply
                ? `<button id="${buttonId}" style="margin-top:8px;border:0;border-radius:8px;padding:6px 10px;background:#0f766e;color:#fff;cursor:pointer;">Select transfer location</button>`
                : `<div style="margin-top:8px;color:#6b7280;">Open a manageable route with at least 2 legs to apply this as transfer.</div>`
            }
          </div>`,
        );
        infoWindow.setPosition(place.geometry.location);
        infoWindow.open({ map });
        if (canApply) {
          g.maps.event.addListenerOnce(infoWindow, "domready", () => {
            const btn = document.getElementById(buttonId);
            if (!btn) return;
            btn.addEventListener(
              "click",
              () => {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                setTransferCandidate({
                  placeName,
                  address,
                  lat,
                  lng,
                });
                setTransferError(null);
                infoWindow.close();
              },
              { once: true },
            );
          });
        }
      };
      const setFromPlace = (place: any) => {
        if (!place?.geometry?.location) return false;
        showPopup(place);
        return true;
      };

      // Native Google POI click path.
      if (e?.placeId) {
        if (typeof e.stop === "function") e.stop();
        places.getDetails(
          {
            placeId: e.placeId,
            fields: ["name", "formatted_address", "geometry.location"],
          },
          (place: any, status: any) => {
            if (status === g.maps.places.PlacesServiceStatus.OK && setFromPlace(place)) {
              return;
            }
            // Fall through to proximity lookup if place details fail.
            if (!e?.latLng) return;
            places.nearbySearch(
              {
                location: e.latLng,
                radius: 80,
                keyword: "gas station restaurant cafe supermarket pharmacy",
              },
              (rows: any, nearbyStatus: any) => {
                if (
                  nearbyStatus === g.maps.places.PlacesServiceStatus.OK &&
                  Array.isArray(rows) &&
                  rows[0]
                ) {
                  setFromPlace(rows[0]);
                }
              },
            );
          },
        );
        return;
      }

      // Fallback for icon clicks that don't expose placeId in this browser/session.
      if (!e?.latLng) return;
      places.nearbySearch(
        {
          location: e.latLng,
          radius: 80,
          keyword: "gas station restaurant cafe supermarket pharmacy",
        },
        (rows: any, nearbyStatus: any) => {
          if (
            nearbyStatus === g.maps.places.PlacesServiceStatus.OK &&
            Array.isArray(rows) &&
            rows[0]
          ) {
            setFromPlace(rows[0]);
          }
        },
      );
    });

    overlaysRef.current.forEach((o) => {
      if ("setMap" in o && typeof o.setMap === "function") o.setMap(null);
    });
    overlaysRef.current = [];

    const geocodeLabel = async (
      label: string,
    ): Promise<{ lat: number; lng: number } | null> => {
      const key = label.trim().toLowerCase();
      const cached = geocodeCacheRef.current.get(key);
      if (cached) return cached;
      return new Promise((resolve) => {
        geocoder.geocode(
          { address: label },
          (results: unknown, status: unknown) => {
          if (
            status === g.maps.GeocoderStatus.OK &&
            Array.isArray(results) &&
            (results[0] as { geometry?: { location?: { lat: () => number; lng: () => number } } } | undefined)?.geometry?.location
          ) {
            const loc = (
              results[0] as { geometry: { location: { lat: () => number; lng: () => number } } }
            ).geometry.location;
            const out = { lat: loc.lat(), lng: loc.lng() };
            geocodeCacheRef.current.set(key, out);
            resolve(out);
            return;
          }
          resolve(null);
          },
        );
      });
    };

    const run = async () => {
      setLoading(true);
      setErrorMsg(null);
      const failedStops: string[] = [];
      for (let idx = 0; idx < legs.length; idx++) {
        const leg = legs[idx];
        const color = LEG_LINE_COLORS[idx % LEG_LINE_COLORS.length];
        const start =
          leg.startLat != null && leg.startLng != null
            ? { lat: leg.startLat, lng: leg.startLng }
            : await geocodeLabel(leg.startLocation);
        const end =
          leg.endLat != null && leg.endLng != null
            ? { lat: leg.endLat, lng: leg.endLng }
            : await geocodeLabel(leg.endLocation);
        if (!start || !end) {
          failedStops.push(`Leg ${leg.sequence}`);
          continue;
        }
        const startMarker = new g.maps.Marker({
          map,
          position: start,
          title: `Leg ${leg.sequence} start`,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#fafaf9",
            strokeWeight: 2,
            scale: 7,
          },
        });
        const endMarker = new g.maps.Marker({
          map,
          position: end,
          title: `Leg ${leg.sequence} end`,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 0.5,
            strokeColor: "#fafaf9",
            strokeWeight: 2,
            scale: 6,
          },
        });
        overlaysRef.current.push(startMarker, endMarker);
        bounds.extend(start);
        bounds.extend(end);

        const routePath = await new Promise<Array<{ lat: number; lng: number }> | null>(
          (resolve) => {
          directions.route(
            {
              origin: start,
              destination: end,
              travelMode: g.maps.TravelMode.DRIVING,
            },
            (result: unknown, status: unknown) => {
              if (
                status === g.maps.DirectionsStatus.OK &&
                !!(
                  result &&
                  typeof result === "object" &&
                  Array.isArray(
                    (result as { routes?: Array<{ overview_path?: unknown[] }> }).routes?.[0]
                      ?.overview_path,
                  ) &&
                  (result as { routes: Array<{ overview_path: unknown[] }> }).routes[0]
                    .overview_path.length
                )
              ) {
                resolve(
                  (
                    result as {
                      routes: Array<{ overview_path: Array<{ lat: () => number; lng: () => number }> }>;
                    }
                  ).routes[0].overview_path.map((p: { lat: () => number; lng: () => number }) => ({
                    lat: p.lat(),
                    lng: p.lng(),
                  })),
                );
                return;
              }
              resolve(null);
            },
          );
          },
        );
        const polyline = new g.maps.Polyline({
          map,
          path: routePath ?? [start, end],
          strokeColor: color,
          strokeWeight: 4,
          strokeOpacity: 0.88,
        });
        overlaysRef.current.push(polyline);
        (routePath ?? [start, end]).forEach((p) => bounds.extend(p));
      }

      if (!bounds.isEmpty()) {
        if (geometryKey !== autoFitKeyRef.current) {
          autoFitKeyRef.current = geometryKey;
          map.fitBounds(bounds);
        }
      }

      // One lightweight POI pass from Google Places.
      const center = bounds.isEmpty() ? map.getCenter() : bounds.getCenter();
      if (center) {
        await new Promise<void>((resolve) => {
          places.nearbySearch(
            {
              location: center,
              radius: 4500,
              keyword: "gas station restaurant cafe supermarket pharmacy",
            },
            (results: unknown, status: unknown) => {
              if (status === g.maps.places.PlacesServiceStatus.OK && results) {
                const rows = Array.isArray(results) ? results : [];
                for (const r of rows.slice(0, 35) as Array<{ geometry?: { location?: unknown }; name?: string }>) {
                  if (!r.geometry?.location) continue;
                  const loc = r.geometry.location as { lat: () => number; lng: () => number };
                  const lat = loc.lat();
                  const lng = loc.lng();
                  const marker = new g.maps.Marker({
                    map,
                    position: { lat, lng },
                    title: r.name ?? "Nearby business",
                    icon: {
                      path: g.maps.SymbolPath.CIRCLE,
                      fillColor: "#0ea5e9",
                      fillOpacity: 0.85,
                      strokeColor: "#ffffff",
                      strokeWeight: 1.5,
                      scale: 4.5,
                    },
                  });
                  marker.addListener("click", () => {
                    setTransferCandidate({
                      placeName: r.name ?? "Selected business",
                      address: "",
                      lat,
                      lng,
                    });
                    setTransferError(null);
                  });
                  overlaysRef.current.push(marker);
                }
              }
              resolve();
            },
          );
        });
      }

      if (!cancelled) {
        if (failedStops.length > 0) {
          setErrorMsg(
            "Some stops could not be placed on the map. Add a pin from the leg editor or check the address text.",
          );
        } else {
          setErrorMsg(null);
        }
      }
      if (!cancelled) setLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
      if (mapClickListener && typeof mapClickListener.remove === "function") {
        mapClickListener.remove();
      }
      if (infoWindow && typeof infoWindow.close === "function") infoWindow.close();
    };
  }, [canManage, geometryKey, legs, transferPairs.length]);

  const applyTransfer = useCallback(async () => {
    if (!transferCandidate || !transferLegId) return;
    const idx = legs.findIndex((l) => l.id === transferLegId);
    if (idx < 0 || idx + 1 >= legs.length) {
      setTransferError("Could not determine adjacent legs for this transfer.");
      return;
    }
    const from = legs[idx];
    const to = legs[idx + 1];
    const label = transferCandidate.address
      ? `${transferCandidate.placeName}, ${transferCandidate.address}`
      : transferCandidate.placeName;
    setApplyingTransfer(true);
    setTransferError(null);
    try {
      await apiJson(`/api/orgs/${orgId}/transports/${transportId}/legs/${from.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          endLocation: label,
          endLat: transferCandidate.lat,
          endLng: transferCandidate.lng,
        }),
      });
      await apiJson(`/api/orgs/${orgId}/transports/${transportId}/legs/${to.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          startLocation: label,
          startLat: transferCandidate.lat,
          startLng: transferCandidate.lng,
        }),
      });
      await qc.invalidateQueries({ queryKey: ["legs", transportId] });
      setTransferCandidate(null);
    } catch (e) {
      setTransferError(
        e instanceof Error ? e.message : "Could not apply transfer location.",
      );
    } finally {
      setApplyingTransfer(false);
    }
  }, [legs, orgId, qc, transferCandidate, transferLegId, transportId]);

  return (
    <section
      className="relative overflow-visible rounded-2xl border border-[var(--rr-border)] bg-[var(--rr-surface)] shadow-inner"
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
            Resolving stop coordinates, road routes, and nearby businesses.
          </span>
        </div>
      )}
      {errorMsg && (
        <div
          className="rr-error-box border-b-0 rounded-none border-x-0 border-t-0 px-3 py-2 text-xs"
          role="status"
          aria-live="polite"
        >
          {errorMsg}
        </div>
      )}
      <div
        className="group relative w-full overflow-hidden rounded-xl border border-[var(--rr-border)]"
        style={{ height: mapHeight }}
      >
        <div
          ref={containerRef}
          className="z-0 h-full w-full"
          {...(legs.length > 0
            ? {
                role: "presentation",
              }
            : { "aria-hidden": true })}
        />
        <button
          type="button"
          aria-label="Resize route map"
          title="Drag to resize map"
          className={`absolute bottom-0 left-0 z-[420] h-4 w-full touch-none border-t border-[var(--rr-border)] bg-[var(--rr-surface-raised)]/80 ${isResizing ? "cursor-row-resize" : "cursor-ns-resize"}`}
          onPointerDown={(e) => {
            e.preventDefault();
            resizeDragRef.current = { startY: e.clientY, startHeight: mapHeight };
            setIsResizing(true);
          }}
        >
          <span
            aria-hidden
            className="mx-auto block h-0.5 w-14 rounded-full bg-[var(--rr-text-subtle)]"
          />
        </button>
      </div>
      {canManage && transferCandidate && transferPairs.length > 0 && (
        <div className="rr-panel mt-2 space-y-2 border border-[var(--rr-border)] p-3 text-xs">
          <p className="font-semibold rr-ink">Selected transfer location</p>
          <p className="rr-ink-muted">{transferCandidate.placeName}</p>
          <label className="block rr-ink-muted">
            Apply between legs
            <select
              className="rr-field mt-1 text-xs"
              value={transferLegId}
              onChange={(e) => setTransferLegId(e.target.value)}
            >
              {transferPairs.map((p) => (
                <option key={p.fromLegId} value={p.fromLegId}>
                  Leg {p.fromSeq} end → Leg {p.toSeq} start
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="rr-btn-primary text-xs"
              disabled={applyingTransfer}
              onClick={() => void applyTransfer()}
            >
              {applyingTransfer ? "Applying…" : "Use as transfer location"}
            </button>
            <button
              type="button"
              className="rr-btn-muted text-xs"
              disabled={applyingTransfer}
              onClick={() => setTransferCandidate(null)}
            >
              Cancel
            </button>
          </div>
          {transferError && <p className="rr-text-danger">{transferError}</p>}
        </div>
      )}
      <p
        className="border-t border-[var(--rr-border)] px-3 py-2 text-[11px] leading-snug"
        style={{
          background: "var(--rr-surface-raised)",
          color: "var(--rr-text-subtle)",
        }}
      >
        Powered by Google Maps. Route lines follow road routing when available.
        Orange/faded markers show saved and geocoded leg endpoints. Blue dots
        show nearby businesses (drag the bottom handle to resize).
      </p>
    </section>
  );
}
