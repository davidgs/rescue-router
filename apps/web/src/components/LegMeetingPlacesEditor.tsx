import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { apiJson } from "../lib/api";

export type LegForMeetingEditor = {
  id: string;
  startLocation: string;
  endLocation: string;
  startLat?: number | null;
  startLng?: number | null;
  endLat?: number | null;
  endLng?: number | null;
};

type MapPickRequest = {
  legId: string;
  end: "start" | "end";
  suggestAddress: string;
  initialLat?: number | null;
  initialLng?: number | null;
};

type LegMeetingPlacesEditorProps = {
  leg: LegForMeetingEditor;
  orgId: string;
  transportId: string;
  onOpenMapPicker: (ctx: MapPickRequest) => void;
};

export function LegMeetingPlacesEditor({
  leg,
  orgId,
  transportId,
  onOpenMapPicker,
}: LegMeetingPlacesEditorProps) {
  const qc = useQueryClient();
  const baseId = useId();
  const startId = `${baseId}-start`;
  const endId = `${baseId}-end`;

  const [start, setStart] = useState(leg.startLocation);
  const [end, setEnd] = useState(leg.endLocation);

  useEffect(() => {
    setStart(leg.startLocation);
    setEnd(leg.endLocation);
  }, [leg.id, leg.startLocation, leg.endLocation]);

  const startPinned = leg.startLat != null && leg.startLng != null;
  const endPinned = leg.endLat != null && leg.endLng != null;

  const saveAddresses = async () => {
    await apiJson(
      `/api/orgs/${orgId}/transports/${transportId}/legs/${leg.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          startLocation: start.trim(),
          endLocation: end.trim(),
        }),
      },
    );
    void qc.invalidateQueries({ queryKey: ["legs", transportId] });
  };

  const clearStartPin = async () => {
    await apiJson(
      `/api/orgs/${orgId}/transports/${transportId}/legs/${leg.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ startLat: null, startLng: null }),
      },
    );
    void qc.invalidateQueries({ queryKey: ["legs", transportId] });
  };

  const clearEndPin = async () => {
    await apiJson(
      `/api/orgs/${orgId}/transports/${transportId}/legs/${leg.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ endLat: null, endLng: null }),
      },
    );
    void qc.invalidateQueries({ queryKey: ["legs", transportId] });
  };

  return (
    <div className="mt-3 space-y-3 border-t border-stone-100 pt-3 dark:border-stone-800">
      <p className="text-xs font-semibold uppercase tracking-wide rr-ink-subtle">
        Meeting places
      </p>
      <p className="text-[11px] leading-relaxed rr-ink-muted">
        Type an address or use the map for an exact pickup or handoff spot. Pins
        override geocoding for drivers and the route map.
      </p>

      <div className="space-y-1">
        <label htmlFor={startId} className="text-xs font-medium rr-ink-muted">
          Pickup / start
        </label>
        <input
          id={startId}
          className="rr-field text-sm"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="rr-btn-muted text-xs"
            onClick={() =>
              onOpenMapPicker({
                legId: leg.id,
                end: "start",
                suggestAddress: start,
                initialLat: leg.startLat,
                initialLng: leg.startLng,
              })
            }
          >
            Set on map
          </button>
          {startPinned && (
            <button
              type="button"
              className="text-xs font-medium text-stone-600 underline decoration-stone-300/60 underline-offset-2 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              onClick={() => void clearStartPin()}
            >
              Clear pin
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor={endId} className="text-xs font-medium rr-ink-muted">
          Handoff / end
        </label>
        <input
          id={endId}
          className="rr-field text-sm"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="rr-btn-muted text-xs"
            onClick={() =>
              onOpenMapPicker({
                legId: leg.id,
                end: "end",
                suggestAddress: end,
                initialLat: leg.endLat,
                initialLng: leg.endLng,
              })
            }
          >
            Set on map
          </button>
          {endPinned && (
            <button
              type="button"
              className="text-xs font-medium text-stone-600 underline decoration-stone-300/60 underline-offset-2 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              onClick={() => void clearEndPin()}
            >
              Clear pin
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        className="rr-btn border border-stone-800 bg-stone-900 text-white hover:bg-stone-800 dark:border-stone-600 dark:bg-stone-800 dark:hover:bg-stone-700"
        onClick={() => void saveAddresses()}
      >
        Save addresses
      </button>
    </div>
  );
}
