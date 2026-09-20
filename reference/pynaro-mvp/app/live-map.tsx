"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import type { Business, Technician } from "@/lib/pynaro-data";

type Coordinate = [number, number];

type LiveMapProps = {
  technicians: Technician[];
  businesses: Business[];
  selectedTechId?: string;
  activeTechId?: string;
  onSelectTech?: (technician: Technician) => void;
  compact?: boolean;
  useDeviceLocation?: boolean;
};

const VAN_NUYS: Coordinate = [34.1867, -118.4489];
const offsets: Coordinate[] = [
  [0.0062, -0.0048],
  [-0.0048, 0.0064],
  [0.0091, 0.0078],
  [-0.0082, -0.0068],
  [0.0028, 0.0112],
  [-0.011, 0.0032],
  [0.012, -0.0102],
  [-0.006, -0.0124],
  [0.0055, 0.015],
  [-0.0135, 0.0105],
];

const statusText: Record<Technician["status"], string> = {
  available: "Available now",
  driving: "Driving",
  on_job: "On a job",
  break: "On break",
  offline: "Offline",
};

function createPositions(technicians: Technician[], center: Coordinate) {
  return Object.fromEntries(
    technicians.map((technician, index) => {
      const offset = offsets[index % offsets.length];
      return [technician.id, [center[0] + offset[0], center[1] + offset[1]] as Coordinate];
    }),
  ) as Record<string, Coordinate>;
}

export function LiveMap({ technicians, businesses, selectedTechId, activeTechId, onSelectTech, compact = false, useDeviceLocation = true }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const customerMarkerRef = useRef<Marker | null>(null);
  const routeRef = useRef<Polyline | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [center, setCenter] = useState<Coordinate>(VAN_NUYS);
  const [positions, setPositions] = useState<Record<string, Coordinate>>(() => createPositions(technicians, VAN_NUYS));
  const [locationState, setLocationState] = useState<"default" | "locating" | "live" | "denied">("default");
  const visibleTechnicians = useMemo(() => technicians.filter((technician) => technician.status !== "offline"), [technicians]);

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next: Coordinate = [coords.latitude, coords.longitude];
        setCenter(next);
        setPositions(createPositions(technicians, next));
        mapRef.current?.flyTo(next, 13, { duration: 0.8 });
        setLocationState("live");
      },
      () => setLocationState("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  };

  useEffect(() => {
    if (!useDeviceLocation || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next: Coordinate = [coords.latitude, coords.longitude];
        setCenter(next);
        setPositions(createPositions(technicians, next));
        mapRef.current?.flyTo(next, 13, { duration: 0.8 });
        setLocationState("live");
      },
      () => setLocationState("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }, [technicians, useDeviceLocation]);

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true, minZoom: 3 }).setView(VAN_NUYS, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: "topright" }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapReady) return;

    if (customerMarkerRef.current) customerMarkerRef.current.remove();
    customerMarkerRef.current = L.marker(center, {
      icon: L.divIcon({ className: "pynaro-customer-marker-wrap", html: '<span class="pynaro-customer-marker"><i></i></span>', iconSize: [34, 34], iconAnchor: [17, 17] }),
      interactive: false,
      zIndexOffset: 800,
    }).addTo(map);

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = visibleTechnicians.map((technician) => {
      const point = positions[technician.id] ?? center;
      const business = businesses.find((item) => item.id === technician.businessId);
      const selected = technician.id === selectedTechId;
      const marker = L.marker(point, {
        icon: L.divIcon({
          className: "pynaro-tech-marker-wrap",
          html: `<button class="pynaro-tech-marker ${selected ? "selected" : ""} status-${technician.status}" type="button" aria-label="${technician.name}, ${statusText[technician.status]}"><span>${technician.initials}</span><i></i></button><em>${technician.eta} min</em>`,
          iconSize: [54, 63],
          iconAnchor: [27, 32],
        }),
        title: `${technician.name} · ${business?.name ?? "Pynaro Pro"}`,
        zIndexOffset: selected ? 700 : 200,
      }).addTo(map);
      marker.on("click", () => onSelectTech?.(technician));
      return marker;
    });

    routeRef.current?.remove();
    if (activeTechId && positions[activeTechId]) {
      routeRef.current = L.polyline([positions[activeTechId], center], { color: "#075cf2", weight: 5, opacity: 0.9, dashArray: "1 10", lineCap: "round" }).addTo(map);
      map.fitBounds(L.latLngBounds([positions[activeTechId], center]), { padding: [46, 46], maxZoom: 14 });
    }
  }, [activeTechId, businesses, center, mapReady, onSelectTech, positions, selectedTechId, visibleTechnicians]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPositions((current) => {
        const next = { ...current };
        visibleTechnicians.forEach((technician, index) => {
          const point = current[technician.id];
          if (!point) return;
          if (technician.id === activeTechId || technician.status === "driving") {
            next[technician.id] = [point[0] + (center[0] - point[0]) * 0.035, point[1] + (center[1] - point[1]) * 0.035];
          } else if (technician.status === "available") {
            const direction = index % 2 ? 1 : -1;
            next[technician.id] = [point[0] + direction * 0.000025, point[1] - direction * 0.00002];
          }
        });
        return next;
      });
    }, 3500);
    return () => window.clearInterval(timer);
  }, [activeTechId, center, visibleTechnicians]);

  return (
    <div className={`live-map-shell ${compact ? "compact" : ""}`}>
      <div ref={containerRef} className="live-map-canvas" aria-label="Interactive map of live technicians" />
      <div className="live-map-status"><i />Live · {visibleTechnicians.length} pros nearby</div>
      <button className="live-map-locate" type="button" onClick={locate} aria-label="Use my current location" title="Use my current location"><LocateFixed size={18} /></button>
      {locationState === "denied" && <div className="live-map-notice">Using Van Nuys until location access is enabled.</div>}
    </div>
  );
}
