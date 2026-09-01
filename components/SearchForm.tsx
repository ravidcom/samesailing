"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCruiseLineNamesAction,
  getShipsForLine,
  getDatesForShip,
  type ShipOption,
} from "@/lib/cruiseActions";
import type { SailingDate } from "@/lib/cruiseData";

export default function SearchForm() {
  const router = useRouter();
  const [line, setLine] = useState("");
  const [ship, setShip] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  const [lineNames, setLineNames] = useState<string[]>([]);
  const [ships, setShips] = useState<ShipOption[]>([]);
  const [shipsLoading, setShipsLoading] = useState(false);
  const [dates, setDates] = useState<SailingDate[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);

  const selectedShip = useMemo(() => ships.find((s) => s.id === ship), [ships, ship]);

  useEffect(() => {
    let cancelled = false;
    getCruiseLineNamesAction().then((result) => {
      if (!cancelled) setLineNames(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!line) return;
    let cancelled = false;
    getShipsForLine(line).then((result) => {
      if (!cancelled) {
        setShips(result);
        setShipsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [line]);

  useEffect(() => {
    if (!line || !ship) return;
    let cancelled = false;
    getDatesForShip(line, ship).then((result) => {
      if (!cancelled) {
        setDates(result);
        setDatesLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [line, ship]);

  function handleLineChange(value: string) {
    setLine(value);
    setShip("");
    setDate("");
    setShips([]);
    setDates([]);
    setError("");
    setShipsLoading(!!value);
    setDatesLoading(false);
  }

  function handleShipChange(value: string) {
    setShip(value);
    setDate("");
    setDates([]);
    setError("");
    setDatesLoading(!!value);
  }

  function handleFindSailing() {
    if (!line) {
      setError("Please select a cruise line.");
      return;
    }
    if (!ship) {
      setError("Please select a ship.");
      return;
    }
    if (!selectedShip || !selectedShip.hasSailings) {
      router.push(`/sailing/none?ship=${encodeURIComponent(selectedShip?.name ?? "")}`);
      return;
    }
    if (!date) {
      setError("Please select a departure date.");
      return;
    }
    router.push(`/sailing/${date}`);
  }

  return (
    <div className="mx-auto max-w-[560px] rounded-[22px] border-2 border-charcoal bg-white p-4 text-left shadow-[7px_7px_0_var(--color-teal-shadow)]">
      <div className="mb-3.5 font-display text-[13px] font-semibold tracking-[.04em] text-teal uppercase">
        Find your sailing
      </div>

      <div className="mb-3">
        <div className="mb-1.5 text-[11px] font-semibold tracking-[.06em] text-muted-2 uppercase">
          Cruise line
        </div>
        <select
          value={line}
          onChange={(e) => handleLineChange(e.target.value)}
          aria-label="Cruise line"
          className="select-chevron w-full cursor-pointer rounded-[11px] border-[1.5px] border-border bg-input py-3 pr-[34px] pl-[13px] font-sans text-sm text-charcoal"
        >
          <option value="">
            {lineNames.length === 0 ? "Loading…" : "Select a cruise line"}
          </option>
          {lineNames.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[11px] font-semibold tracking-[.06em] text-muted-2 uppercase">
            Cruise ship
          </div>
          <select
            value={ship}
            onChange={(e) => handleShipChange(e.target.value)}
            disabled={!line || shipsLoading}
            aria-label="Cruise ship"
            className="select-chevron w-full rounded-[11px] border-[1.5px] border-border bg-input py-3 pr-[34px] pl-[13px] font-sans text-sm text-charcoal disabled:cursor-not-allowed disabled:opacity-45"
          >
            <option value="">
              {!line ? "Select line first" : shipsLoading ? "Loading ships…" : "Select a ship"}
            </option>
            {ships.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.hasSailings ? "" : " - no sailings yet"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-semibold tracking-[.06em] text-muted-2 uppercase">
            Departure date
          </div>
          <select
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setError("");
            }}
            disabled={dates.length === 0 || datesLoading}
            aria-label="Departure date"
            className="select-chevron w-full rounded-[11px] border-[1.5px] border-border bg-input py-3 pr-[34px] pl-[13px] font-sans text-sm text-charcoal disabled:cursor-not-allowed disabled:opacity-45"
          >
            <option value="">
              {datesLoading
                ? "Loading dates…"
                : dates.length === 0
                  ? "Select ship first"
                  : "Select departure date"}
            </option>
            {dates.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} · {d.itinerary}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="mb-3 text-[12px] font-medium text-coral">{error}</div>
      ) : null}

      <button
        type="button"
        onClick={handleFindSailing}
        className="w-full rounded-[13px] border-none bg-teal py-3.5 font-sans text-[15px] font-semibold text-white transition-colors hover:bg-teal-dark"
      >
        Find my sailing →
      </button>
    </div>
  );
}
