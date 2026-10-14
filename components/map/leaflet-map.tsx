"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// Leaflet's default marker icon URLs are relative paths meant for a classic
// script-tag setup and break under Next's bundler. Serving the icons as
// plain files from `public/leaflet/` (copied from leaflet/dist/images/) is
// more reliable here than a static `import ... from "leaflet/dist/images/*"`,
// which didn't resolve to a usable `.src` under this project's Turbopack
// config and rendered every marker as a broken image.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

export type MapPinData = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  href?: string;
  /** Short text (e.g. "£145") — when set the pin renders as a price pill instead of the default marker. */
  label?: string;
};

function pillIcon(label: string) {
  return L.divIcon({
    className: "",
    html: `<span style="display:inline-block;transform:translate(-50%,-50%);background:#fff;color:#1c1917;border:1px solid rgba(0,0,0,.12);border-radius:999px;padding:3px 9px;font:700 12px/1.2 system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.18);white-space:nowrap">${label.replace(/[<>&]/g, "")}</span>`,
    iconSize: [0, 0],
  });
}

function FitToPins({ pins }: { pins: MapPinData[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length > 1) {
      map.fitBounds(
        pins.map((p) => [p.lat, p.lng]),
        { padding: [32, 32], maxZoom: 14 },
      );
    }
  }, [pins, map]);
  return null;
}

export function LeafletMap({
  pins,
  center,
  zoom = 13,
  height = "24rem",
}: {
  pins: MapPinData[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}) {
  const initialCenter: [number, number] = center ?? (pins[0] ? [pins[0].lat, pins[0].lng] : [51.1, -2.9]);

  return (
    <div style={{ height }} className="h-full overflow-hidden rounded-2xl">
      <MapContainer center={initialCenter} zoom={zoom} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.length > 1 && <FitToPins pins={pins} />}
        <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
          {pins.map((pin) => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={pin.label ? pillIcon(pin.label) : undefined}>
              <Popup>
                {pin.href ? (
                  <Link href={pin.href} className="font-medium text-somerset-green hover:underline">
                    {pin.title}
                  </Link>
                ) : (
                  pin.title
                )}
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
