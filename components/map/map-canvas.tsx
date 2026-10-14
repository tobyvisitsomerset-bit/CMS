"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

export type CanvasPin = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  slug: string;
  town: string | null;
  heroImageUrl: string | null;
  categoryLabel: string;
  dateLabel: string | null;
  inTrip: boolean;
};

function numberIcon(n: number) {
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;transform:translate(-50%,-50%);background:#6f266f;color:#fff;border:2px solid #fff;border-radius:999px;font:700 13px/1 system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.3)">${n}</span>`,
    iconSize: [0, 0],
  });
}

function Fit({ pins, focus }: { pins: { lat: number; lng: number }[]; focus: { lat: number; lng: number; zoom: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) {
      map.setView([focus.lat, focus.lng], focus.zoom);
      return;
    }
    if (pins.length > 1) {
      map.fitBounds(
        pins.map((p) => [p.lat, p.lng]),
        { padding: [40, 40], maxZoom: 13 },
      );
    }
  }, [pins, focus, map]);
  return null;
}

export function MapCanvas({
  pins,
  route,
  focus,
  me,
  onToggleTrip,
}: {
  pins: CanvasPin[];
  route: { id: string; lat: number; lng: number; title: string }[];
  focus: { lat: number; lng: number; zoom: number } | null;
  me: { lat: number; lng: number } | null;
  onToggleTrip: (pin: CanvasPin) => void;
}) {
  const routeIds = new Set(route.map((r) => r.id));
  return (
    <MapContainer center={[51.1, -2.9]} zoom={9} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Fit pins={pins} focus={focus} />
      <MarkerClusterGroup chunkedLoading maxClusterRadius={55}>
        {pins
          .filter((p) => !routeIds.has(p.id))
          .map((pin) => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]}>
              <Popup>
                <div className="w-52 space-y-1.5">
                  {pin.heroImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pin.heroImageUrl} alt="" className="h-24 w-full rounded-lg object-cover" />
                  )}
                  <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
                    {[pin.categoryLabel, pin.town].filter(Boolean).join(" · ")}
                  </p>
                  <p className="font-serif text-base leading-tight font-black text-stone-900">{pin.title}</p>
                  {pin.dateLabel && <p className="text-xs text-stone-600">{pin.dateLabel}</p>}
                  <div className="flex gap-2 pt-1">
                    <Link href={`/${pin.slug}`} className="rounded-full bg-somerset-green px-3 py-1.5 text-xs font-bold text-white">
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => onToggleTrip(pin)}
                      className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-800"
                    >
                      {pin.inTrip ? "In your trip ✓" : "Add to trip"}
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MarkerClusterGroup>
      {route.map((r, i) => (
        <Marker key={`route-${r.id}`} position={[r.lat, r.lng]} icon={numberIcon(i + 1)}>
          <Popup>{r.title}</Popup>
        </Marker>
      ))}
      {route.length > 1 && <Polyline positions={route.map((r) => [r.lat, r.lng] as [number, number])} pathOptions={{ color: "#6f266f", weight: 3, dashArray: "6 6" }} />}
      {me && (
        <Marker
          position={[me.lat, me.lng]}
          icon={L.divIcon({
            className: "",
            html: '<span style="display:block;width:16px;height:16px;transform:translate(-50%,-50%);background:#3d685b;border:3px solid #fff;border-radius:999px;box-shadow:0 0 0 4px rgba(61,104,91,.25)"></span>',
            iconSize: [0, 0],
          })}
        />
      )}
    </MapContainer>
  );
}
