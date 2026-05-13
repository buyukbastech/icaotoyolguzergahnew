import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { tollGates, passagePoints, routeSerbest_S1A_to_S5A } from "@/data/mapData";
import { backboneS5A_G1, backboneG1_Bridge_G5, backboneG5_Asia } from "@/data/highwayBackbone";
import { TollGate, PassagePoint } from "@/data/types";
import TollGateCard from "./TollGateCard";

// Fix Leaflet default icon issue in production
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  activeRoute: string | null;
  peakHourMode: boolean;
  selectedGroup: string | null;
}

// ─── YÜKSEK DOĞRULUKLU OTOYOL MOTORU (OSRM) ─────────────────────────────────
async function fetchOSRMRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<[number, number][]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 429) throw new Error("Çok fazla istek (OSRM Limit)");
      throw new Error("Rota sunucusuna erişilemedi");
    }
    const data = await resp.json();
    if (data.code !== "Ok") throw new Error("Yol verisi bulunamadı");
    return data.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    );
  } catch (err: any) {
    console.error("OSRM Error:", err);
    throw new Error(err.message || "Bağlantı hatası");
  }
}

// ─── NEON EFEKT MOTORU (SÜPER VERSION) ─────────────────────────────────────
function drawNeonPath(
  map: L.Map,
  coords: [number, number][],
  layers: L.Layer[],
  isStatic = false
): L.Polyline {
  const opMultiplier = isStatic ? 0.4 : 1; // Sabit katmanlar için daha sönük
  
  const outer = L.polyline(coords, { color: "#00bfff", weight: 16, opacity: 0.12 * opMultiplier, lineJoin: "round", lineCap: "round", className: isStatic ? "" : "route-glow-outer" }).addTo(map);
  const inner = L.polyline(coords, { color: "#3b82f6", weight: 8, opacity: 0.25 * opMultiplier, lineJoin: "round", lineCap: "round", className: isStatic ? "" : "route-glow-inner" }).addTo(map);
  const core = L.polyline(coords, { color: "#38bdf8", weight: 4.5, opacity: 1 * opMultiplier, lineJoin: "round", lineCap: "round", className: isStatic ? "" : "route-neon-line" }).addTo(map);
  
  layers.push(outer, inner, core);
  return core;
}

const MapView = ({ activeRoute, peakHourMode, selectedGroup }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayers = useRef<L.Layer[]>([]);
  const sidebarLayers = useRef<L.Layer[]>([]);
  const staticBackboneLayers = useRef<L.Layer[]>([]);

  const [selectedGate, setSelectedGate] = useState<TollGate | PassagePoint | null>(null);
  const [points, setPoints] = useState<(TollGate | PassagePoint)[]>([]);
  const [status, setStatus] = useState("");
  const [mapMode, setMapMode] = useState<"satellite" | "light" | "dark">("satellite");

  const MAP_TILES = {
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  };

  // Otoyolun tamamını gösteren omurga
  const fullBackbone = useMemo<[number, number][]>(() => [
    ...routeSerbest_S1A_to_S5A,
    ...backboneS5A_G1.slice(1),
    ...backboneG1_Bridge_G5.slice(1),
    ...backboneG5_Asia.slice(1)
  ], []);

  const clearAll = useCallback(() => {
    if (!mapInstance.current) return;
    [...routeLayers.current, ...sidebarLayers.current].forEach(l => mapInstance.current!.removeLayer(l));
    routeLayers.current = [];
    sidebarLayers.current = [];
    setPoints([]);
    setStatus("");
    setSelectedGate(null);
  }, []);

  const onMarkerClick = useCallback((p: TollGate | PassagePoint) => {
    setSelectedGate(p);
    setPoints(prev => {
      if (prev.length >= 2) return [p];
      if (prev.length === 1 && prev[0].id === p.id) return [];
      return [...prev, p];
    });
  }, []);

  // Harita Init
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { 
      center: [41.12, 29.05], 
      zoom: 10, 
      zoomControl: true, 
      attributionControl: false 
    });
    
    // Kullanıcı isteği üzerine varsayılan olarak Uydu (Satellite) ile başla
    tileLayerRef.current = L.tileLayer(MAP_TILES.satellite, { 
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(map);

    tileLayerRef.current.on('tileerror', () => {
      setStatus("⚠️ Harita katmanı yüklenemedi. Farklı bir mod deneyin.");
    });

    // Sabit Omurga Işığı (İstediğiniz o kırmızı hattı ve tüm ağı loşça aydınlatır)
    L.polyline(fullBackbone, { 
      color: "#38bdf8", weight: 6, opacity: 0.08, 
      lineJoin: "round", lineCap: "round", className: "backbone-glow" 
    }).addTo(map);

    [...tollGates, ...passagePoints].forEach(p => {
      const isG = "location" in p;
      const c = isG ? (p.id === "G3" ? "#a855f7" : "#ef4444") : "#10b981";
      const icon = L.divIcon({ 
        className: "p-m", 
        html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;width:34px;height:34px;border-radius:50%;background:${c};opacity:0.25;" class="pulse-ring"></div><div style="width:26px;height:26px;border-radius:50%;background:hsl(225,20%,10%);border:2.2px solid ${c};display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px ${c}60;cursor:pointer;"><span style="color:white;font-size:7px;font-weight:700;">${p.id}</span></div></div>`, 
        iconSize: [34, 34], iconAnchor: [17, 17] 
      });
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
      
      const tooltipContent = `
        <div class="tooltip-container" style="border-left: 2px solid ${c};">
          <div class="tooltip-header" style="color: ${c};">${p.id}</div>
          <div class="tooltip-name">${p.name}</div>
          <div class="tooltip-subtext" style="margin-top: 4px; display: flex; flex-direction: column; gap: 1px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="opacity: 0.6;">Konum:</span>
              <span style="color: white; font-weight: 600;">${isG ? (p as TollGate).location : (p as PassagePoint).group}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="opacity: 0.6;">Yön:</span>
              <span style="color: ${c}; font-weight: 800;">${isG ? (p as TollGate).direction : (p as PassagePoint).subtitle}</span>
            </div>
          </div>
        </div>
      `;



      marker.bindTooltip(tooltipContent, {
        permanent: false,
        direction: "top",
        offset: [0, -15],
        className: "gate-tooltip",
        opacity: 0.98
      });

      marker.on("click", () => onMarkerClick(p));
    });


    mapInstance.current = map;
  }, [onMarkerClick, fullBackbone]);

  // Harita Modu Değişimi
  useEffect(() => {
    if (!mapInstance.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(MAP_TILES[mapMode]);
  }, [mapMode]);

  // Sidebar Kontrolü
  useEffect(() => {
    if (!selectedGroup || !activeRoute || !mapInstance.current) return;
    clearAll(); 
    const pt = [...tollGates, ...passagePoints].find(p => p.id === activeRoute);
    if (!pt) return;
    
    if (selectedGroup === "serbest" && activeRoute.startsWith("S") && activeRoute.length <= 3) {
      drawNeonPath(mapInstance.current, routeSerbest_S1A_to_S5A, sidebarLayers.current);
      mapInstance.current.fitBounds(L.polyline(routeSerbest_S1A_to_S5A).getBounds(), { padding: [80, 80] });
    } else {
      mapInstance.current.flyTo([pt.lat, pt.lng], 16, { duration: 1.2 });
    }
    setSelectedGate(pt);
  }, [activeRoute, selectedGroup, clearAll]);

  // Manuel Rota Çizimi
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    routeLayers.current.forEach(l => map.removeLayer(l));
    routeLayers.current = [];

    if (points.length === 1) {
      const p = points[0];
      const halo = L.circleMarker([p.lat, p.lng], { radius: 15, color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.25, weight: 3, className: "p-pulse" }).addTo(map);
      routeLayers.current.push(halo);
      setStatus(`📍 ${p.id} Seçildi → Varış seçin`);
    }

    if (points.length === 2) {
      const [from, to] = points;
      setStatus("🔄 Çiziliyor...");
      fetchOSRMRoute(from, to).then(coords => {
        if (!mapInstance.current) return;
        const line = drawNeonPath(mapInstance.current, coords, routeLayers.current);
        const dist = (coords.length * 0.02).toFixed(1);
        setStatus(`✅ ${from.id} → ${to.id} | Mesafe: ~${dist} km`);
        mapInstance.current.fitBounds(line.getBounds(), { padding: [100, 100] });
      }).catch(() => setStatus("❌ Rota bulunamadı"));
    }
  }, [points]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Harita Modu Seçici */}
      <div className="absolute top-6 left-20 z-[1000] flex flex-col gap-2">


        <div className="glass rounded-2xl p-1.5 border border-white/10 shadow-2xl flex flex-col gap-1.5 backdrop-blur-xl">
          {(["satellite", "light", "dark"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setMapMode(mode)}
              className={`
                px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300
                ${mapMode === mode 
                  ? "bg-sky-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.4)]" 
                  : "text-white/50 hover:text-white hover:bg-white/5"
                }
              `}
            >
              {mode === "satellite" ? "UYDU" : mode === "light" ? "BEYAZ" : "SİYAH"}
            </button>
          ))}
        </div>
      </div>
      
      {status && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3">
          <div className="glass rounded-xl px-6 py-3 border border-sky-500/40 shadow-2xl">
            <span className="text-[11px] text-sky-200 font-bold uppercase tracking-widest">{status}</span>
          </div>
          <button 
            onClick={clearAll}
            className="glass rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all shadow-lg"
          >TEMİZLE</button>
        </div>
      )}

      <TollGateCard gate={selectedGate} onClose={() => setSelectedGate(null)} />

      {/* Harita Bilgisi (Lejant) — Sağ alt köşeye geri alındı */}
      <div className="absolute bottom-10 right-10 z-[1000] flex flex-col gap-3">
        <div className="glass rounded-2xl p-4 border border-white/10 shadow-2xl backdrop-blur-xl min-w-[200px]">
          <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[2px] mb-3">Harita Bilgisi</h4>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 group cursor-default">
              <div className="w-3 h-3 rounded-full bg-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-white/20" />
              <span className="text-[11px] font-bold text-white/80 group-hover:text-white transition-colors">Bariyerli Geçişler</span>
            </div>
            <div className="flex items-center gap-3 group cursor-default">
              <div className="w-3 h-3 rounded-full bg-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.5)] border border-white/20" />
              <span className="text-[11px] font-bold text-white/80 group-hover:text-white transition-colors">Kapalı Olan Gişeler</span>
            </div>
            <div className="flex items-center gap-3 group cursor-default">
              <div className="w-3 h-3 rounded-full bg-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.5)] border border-white/20" />
              <span className="text-[11px] font-bold text-white/80 group-hover:text-white transition-colors">Serbest Geçişler (SGS)</span>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .route-neon-line { filter:drop-shadow(0 0 5px #38bdf8) drop-shadow(0 0 12px #0ea5e9); animation: neon-m 2s infinite; }
        .route-glow-outer { animation: breathe-m 3s infinite; }
        .backbone-glow { filter: blur(1px); animation: heartbeat 4s infinite ease-in-out; }
        
        @keyframes neon-m { 0%,100%{opacity:1;} 50%{opacity:0.75;} }
        @keyframes breathe-m { 0%,100%{opacity:0.12;} 50%{opacity:0.25;} }
        @keyframes heartbeat { 0%,100%{opacity:0.06;} 50%{opacity:0.14;} }
        
        .pulse-ring { animation: p-ring-m 2.5s infinite; }
        @keyframes p-ring-m { 0% { transform: scale(1); opacity: 0.3; } 100% { transform: scale(1.6); opacity: 0; } }
        .p-pulse { animation: p-marker-m 1.4s infinite; }
        @keyframes p-marker-m { 0%,100%{opacity:1;} 50%{opacity:0.5;} }

        .gate-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; cursor: default !important; }
        .gate-tooltip::before { display: none !important; }
        .tooltip-container { 
          background: rgba(13, 17, 23, 0.95); 
          backdrop-filter: blur(8px); 
          padding: 10px 14px; 
          border-radius: 12px; 
          border: 1px solid rgba(255,255,255,0.1); 
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          display: flex; 
          flex-direction: column; 
          gap: 2px;
          min-width: 140px;
        }
        .tooltip-header { font-family: 'Inter', sans-serif; font-weight: 900; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
        .tooltip-name { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13px; color: white; }
        .tooltip-subtext { font-family: 'Inter', sans-serif; font-size: 9px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; }
      `}</style>

    </div>
  );
};

export default MapView;
