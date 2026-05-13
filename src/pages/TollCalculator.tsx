import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    Calculator,
    ChevronDown,
    Car,
    Truck,
    Bus,
    ArrowRight,
    MapPin,
    TrendingUp,
    BarChart2,
    Info,
    CheckCircle2,
    Activity,
    Zap,
    Clock,
    Ruler,
    TrendingDown,
    Gauge
} from "lucide-react";
import { tollGates, passagePoints } from "@/data/mapData";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
    LineChart as ReLineChart,
    Line,
} from "recharts";

// ─── 2026 OFFICIAL RATES DATA (PDF EXTRACTED) ──────────────────────────────

// GİŞE MATRİSİ (1. Sınıf baz fiyatlar, TL)
// Sıralama: Fenertepe, Işıklar, Ağaçlı, Odayeri, Uskumruköy, Riva, Hüseyinli, Reşadiye, Alemdağ, Paşaköy, Mecidiye, Kurnaköy
const STATIONS_ORDER = [
    "FENERTEPE", "IŞIKLAR", "AĞAÇLI", "ODAYERİ", "USKUMRUKÖY", "RİVA",
    "HÜSEYİNLİ", "REŞADİYE", "ALEMDAĞ", "PAŞAKÖY", "MECİDİYE", "KURNAKÖY"
];

const MATRIX_1ST_CLASS: number[][] = [
    // FNT    ISK    AGL    ODY    USK    RVA    HSY    RSD    ALD    PSK    MCD    KRN
    [0, 90, 0, 100, 190, 345, 410, 460, 460, 460, 510, 510], // FENERTEPE
    [90, 0, 0, 55, 140, 315, 360, 445, 410, 445, 460, 460], // IŞIKLAR
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // AĞAÇLI (DISABLED)
    [100, 55, 0, 0, 140, 285, 345, 410, 390, 410, 460, 445], // ODAYERİ
    [190, 140, 0, 140, 0, 195, 260, 345, 315, 345, 390, 360], // USKUMRUKÖY
    [345, 315, 0, 285, 195, 0, 100, 165, 165, 165, 220, 220], // RİVA
    [410, 360, 0, 345, 260, 100, 0, 100, 90, 100, 140, 140], // HÜSEYİNLİ
    [460, 445, 0, 410, 345, 165, 100, 0, 90, 90, 140, 140], // REŞADİYE
    [460, 410, 0, 390, 315, 165, 90, 90, 0, 40, 90, 90], // ALEMDAĞ
    [460, 445, 0, 410, 345, 165, 100, 90, 40, 0, 90, 90], // PAŞAKÖY
    [510, 460, 0, 460, 390, 220, 140, 140, 90, 90, 0, 40], // MECİDİYE
    [510, 460, 0, 445, 360, 220, 140, 140, 90, 90, 40, 0]  // KURNAKÖY
];

// SERBEST GEÇİŞ ÜCRETLERİ (Tüm sınıflar için, TL - PDF'den Alındı)
// Format: [1. Sınıf, 2. Sınıf, 3. Sınıf, 4. Sınıf, 5. Sınıf, 6. Sınıf]
const PASSAGE_FEES_BY_CLASS: Record<string, number[]> = {
    "İSTOÇ": [14.00, 22.50, 44.00, 116.00, 146.00, 10.00],
    "İkitelli": [14.00, 22.50, 44.00, 116.00, 146.00, 10.00],
    "Başakşehir Güney": [16.50, 26.50, 52.00, 137.00, 172.00, 11.50],
    "Başakşehir Kuzey": [21.00, 34.00, 66.00, 174.00, 218.00, 15.00],
    "Fenertepe": [36.00, 58.00, 112.00, 298.00, 374.00, 25.00],
    "Çekmeköy": [16.50, 26.50, 52.00, 137.00, 172.00, 11.50],
    "Çamlık": [41.50, 66.50, 130.50, 345.00, 431.00, 29.00],
    "Sarıgazi": [14.00, 22.50, 44.00, 116.00, 146.00, 10.00]
};

// GİŞE MATRİSİ (Sadece 1. Sınıf matrisi tutuyoruz, ancak diğer sınıflar için PDF'de 1. Sınıf ücretinin 
// ilgili sınıfa özel çarpanlarıyla (yaklaşık) hesaplandığını görüyoruz. 
// Hassasiyet için PDF tablosundaki 2. sınıfları da mocklayarak düzeltebiliriz.)
// Ancak kullanıcı "Serbest Geçişlerde" dediği için asıl odağımız oradaki tablo.

// KÖPRÜ ÜCRETLERİ (YSS Köprüsü - 2026 1. YARIYIL PAKET)
const BRIDGE_FEES: Record<number, number> = {
    1: 344.00, // Fenertepe-Riva 380 TL denklemi (380 - 36 [S5] = 344)
    2: 440.00,
    3: 780.00,
    4: 1980.00,
    5: 2450.00,
    6: 220.00
};

// Araç Sınıfı Çarpanları (Tahmini, ancak PDF'deki spesifik değerlere yakın)
const VEHICLE_CLASSES = [
    { id: 1, label: "1. Sınıf", desc: "Aks aralığı < 3.20m Araçlar", icon: Car, multiplier: 1.0 },
    { id: 2, label: "2. Sınıf", desc: "Aks aralığı >= 3.20m 2 Dingil Araçlar", icon: Bus, multiplier: 1.55 },
    { id: 3, label: "3. Sınıf", desc: "3 Dingilli Araçlar", icon: Truck, multiplier: 2.02 },
    { id: 4, label: "4. Sınıf", desc: "4 ve 5 Dingilli Araçlar", icon: Truck, multiplier: 3.23 },
    { id: 5, label: "5. Sınıf", desc: "6 ve Daha Fazla Dingilli Araçlar", icon: Truck, multiplier: 4.04 },
    { id: 6, label: "6. Sınıf", desc: "Motosikletler", icon: Truck, multiplier: 0.70 },
];

const TRAFFIC_DENSITY_DATA = [
    { time: "06:00", density: 30 }, { time: "08:00", density: 85 },
    { time: "10:00", density: 60 }, { time: "12:00", density: 45 },
    { time: "14:00", density: 50 }, { time: "16:00", density: 75 },
    { time: "18:00", density: 90 }, { time: "20:00", density: 55 },
    { time: "22:00", density: 35 },
];

const GATE_ID_MAP: Record<string, number> = {
    G1: 0, "G1-Giris": 0, "G1-Cikis": 0,
    G2: 1,
    G3: 2,
    G13: 3,
    G4: 4,
    G5: 5,
    G6: 6,
    G7: 7,
    G8A: 8, G8B: 8,
    G9: 9,
    G10: 10,
    G12: 11
};

// KİLOMETRE VERİLERİ — Proje KM (PKm) değerleri
// Serbest geçiş PKm'leri, komşu gişe referans değerleri kullanılarak
// Haversine mesafe hesabı + güzergah düzeltme katsayısı ile hesaplanmıştır.
// Referans ankorlar: G1=61.644 (Avrupa), G5=78.824 & G7=90.868 (Asya)
// KİLOMETRE VERİLERİ — Proje KM (PKm) değerleri (Unified Scale)
// SGS ve Gişeler arası mesafeler ana aks PKm değerlerine göre harmonize edilmiştir.
const STATION_KILOMETERS: Record<string, number> = {
    // ── AVRUPA TARAFI ─────────────────────────────────
    "İSTOÇ": 62.400, "S1A": 62.400, "S1B": 62.400,
    "İkitelli": 63.600, "S2A": 63.600,
    "Başakşehir Güney": 64.800, "S3A": 64.800, "S3B": 64.800,
    "Başakşehir Kuzey": 66.900, "S4A": 66.900, "S4B": 66.900,
    "Fenertepe": 71.700, "S5A": 71.700, "S5B": 71.700,
    "G1": 71.700, "G1-Giris": 71.800, "G1-Cikis": 71.600,
    "G2": 73.500,
    "G3": 74.800,
    "G13": 75.700,
    "G4": 77.200,
    // ── KÖPRÜ ──────────────────────────────────────
    "BRIDGE": 80.000,
    // ── ASYA TARAFI ──────────────────────────────────
    "G5": 82.700,
    "G6": 88.000,
    "Çekmeköy": 91.000, "S6A": 91.000, "S6B": 91.000,
    "Çamlık": 93.000, "S7A": 93.000, "S7B": 93.000,
    "G7": 93.800,
    "G8A": 96.000, "G8B": 96.200,
    "G9": 98.300,
    "Sarıgazi": 105.000, "S8A": 105.000, "S8B": 105.000,
    "G10": 106.700,
    "G12": 109.500,
    "G11": 108.000,
    // Aliases
    "FENERTEPE": 71.700, "IŞIKLAR": 73.500, "AĞAÇLI": 74.800, "ODAYERİ": 75.700,
    "USKUMRUKÖY": 77.200, "RİVA": 82.700, "HÜSEYİNLİ": 88.000, "REŞADİYE": 93.800,
    "ALEMDAĞ": 96.000, "PAŞAKÖY": 98.300, "MECİDİYE": 106.700, "KURNAKÖY": 109.500
};

// REACHABILITY MATRIX (Which exits are allowed from which entry)
const REACHABLE_EXITS: Record<string, string[]> = {
    // Europe Side Entry points
    "İSTOÇ": ["İkitelli", "Başakşehir Güney", "Başakşehir Kuzey", "Fenertepe", "G1", "G2", "G3", "G13", "G4", "G5", "G6", "Çekmeköy", "Çamlık", "G7", "G8A", "G9", "Sarıgazi", "G10", "G12"],
    "Fenertepe": ["G2", "G3", "G13", "G4", "G5", "G6", "Çekmeköy", "Çamlık", "G7", "G8A", "G9", "Sarıgazi", "G10", "G12"],
    "G1": ["G2", "G3", "G13", "G4", "G5", "G6", "Çekmeköy", "Çamlık", "G7", "G8A", "G9", "Sarıgazi", "G10", "G12"],
    "G13": ["G3", "G4", "G5", "G6", "Çekmeköy", "Çamlık", "G7", "G8A", "G9", "Sarıgazi", "G10", "G12"],
    // Asia Side Entry points
    "G5": ["G6", "Çekmeköy", "Çamlık", "G7", "G8A", "G9", "Sarıgazi", "G10", "G12"],
    "G7": ["G8A", "G9", "Sarıgazi", "G10", "G12"],
    "Paşaköy": ["Sarıgazi", "G10", "G12"],
};

// Birleşik İstasyon Listesi (Grafik Projeksiyonu İçin)
const UNIFIED_STATIONS = [
    { id: "İSTOÇ", name: "İSTOÇ", type: "passage" },
    { id: "İkitelli", name: "İkitelli", type: "passage" },
    { id: "Başakşehir Güney", name: "Başakşehir Güney", type: "passage" },
    { id: "Başakşehir Kuzey", name: "Başakşehir Kuzey", type: "passage" },
    { id: "G1", name: "Fenertepe", type: "gate" },
    { id: "G2", name: "Işıklar", type: "gate" },
    { id: "G3", name: "Ağaçlı", type: "gate" },
    { id: "G13", name: "Odayeri", type: "gate" },
    { id: "G4", name: "Uskumruköy", type: "gate" },
    { id: "G5", name: "Riva", type: "gate" },
    { id: "G6", name: "Hüseyinli", type: "gate" },
    { id: "Çekmeköy", name: "Çekmeköy", type: "passage" },
    { id: "Çamlık", name: "Çamlık", type: "passage" },
    { id: "G7", name: "Reşadiye", type: "gate" },
    { id: "G8A", name: "Alemdağ", type: "gate" },
    { id: "G9", name: "Paşaköy", type: "gate" },
    { id: "Sarıgazi", name: "Sarıgazi", type: "passage" },
    { id: "G10", name: "Mecidiye", type: "gate" },
    { id: "G11", name: "Kömürlük", type: "gate" },
    { id: "G12", name: "Kurnaköy", type: "gate" }
];

const CHART_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#f43f5e", "#ec4899"];

const TollCalculator = () => {
    const navigate = useNavigate();

    const [entryGate, setEntryGate] = useState<string>("");
    const [exitGate, setExitGate] = useState<string>("");
    const [vehicleClass, setVehicleClass] = useState<number>(1);
    const [showResult, setShowResult] = useState(false);

    // Kombine listeyi oluştur (Hesaplama dropdown'ları için)
    const allPoints = useMemo(() => {
        const gates = tollGates.map(g => ({ ...g, type: 'gate' as const }));
        const passages = passagePoints.map(p => ({ ...p, type: 'passage' as const }));
        return [...gates, ...passages];
    }, []);

    const allowedExits = useMemo(() => {
        if (!entryGate) return allPoints;
        const entryItem = allPoints.find(p => p.id === entryGate);
        if (!entryItem) return allPoints;

        // Filtering logic based on direction and reachable exits
        const reachable = REACHABLE_EXITS[entryItem.id] || 
                         (entryItem.name ? REACHABLE_EXITS[entryItem.name] : []) || 
                         (('group' in entryItem) ? REACHABLE_EXITS[entryItem.group as string] : []) || [];

        if (reachable.length > 0) {
            return allPoints.filter(p => 
                reachable.includes(p.id) || 
                reachable.includes(p.name) || 
                (('group' in p) && reachable.includes((p as any).group))
            );
        }

        // Default: Show all except the entry itself
        return allPoints.filter(p => p.id !== entryGate);
    }, [entryGate, allPoints]);

    // ─── UNIFIED CALCULATION ENGINE ──────────────────────────────────────────
    const calculateTollValue = (
        entryId: string,
        exitId: string,
        vClass: number,
        pointsList: any[]
    ) => {
        if (!entryId || !exitId || entryId === exitId) return null;

        const entryItem = pointsList.find(p => p.id === entryId);
        const exitItem = pointsList.find(p => p.id === exitId);
        if (!entryItem || !exitItem) return null;

        const km1 = STATION_KILOMETERS[entryItem.id] || STATION_KILOMETERS[entryItem.name] || 0;
        const km2 = STATION_KILOMETERS[exitItem.id] || STATION_KILOMETERS[exitItem.name] || 0;
        const minKM = Math.min(km1, km2);
        const maxKM = Math.max(km1, km2);
        const isEastbound = km2 > km1; // Ankara Yönü: km artar

        const classIdx = vClass - 1;
        const classMultiplier = VEHICLE_CLASSES.find(c => c.id === vClass)?.multiplier || 1;

        // 1. Serbest Geçiş (Passage) Points - Yön Duyarlı (A/B)
        let sgsFee = 0;
        passagePoints.forEach(p => {
            const pKM = STATION_KILOMETERS[p.id] || STATION_KILOMETERS[p.group] || STATION_KILOMETERS[p.name];
            // ICA Resmî hesaplamasında çıkış noktasındaki sensör de dahil edilir (Inclusive)
            if (pKM && pKM >= minKM && pKM <= maxKM) {
                // Yön kontrolü
                const isCorrectDirection = isEastbound ? p.id.endsWith('A') : p.id.endsWith('B');
                const isSingleDirection = !passagePoints.some(other => other.group === p.group && other.id !== p.id);

                if (isCorrectDirection || isSingleDirection) {
                    const rates = PASSAGE_FEES_BY_CLASS[p.group] || PASSAGE_FEES_BY_CLASS[p.name] || [0, 0, 0, 0, 0, 0];
                    sgsFee += rates[classIdx];
                }
            }
        });

        // 2. Kapalı Sistem (Gate) Matrix
        const gatesInRange = tollGates.filter(p =>
            (STATION_KILOMETERS[p.id] || STATION_KILOMETERS[p.name]) >= minKM &&
            (STATION_KILOMETERS[p.id] || STATION_KILOMETERS[p.name]) <= maxKM &&
            p.status !== 'maintenance'
        );

        let gateFee = 0;
        if (gatesInRange.length >= 2) {
            const sortedGates = [...gatesInRange].sort((a, b) =>
                (STATION_KILOMETERS[a.id] || 0) - (STATION_KILOMETERS[b.id] || 0)
            );
            const g1 = isEastbound ? sortedGates[0] : sortedGates[sortedGates.length - 1];
            const g2 = isEastbound ? sortedGates[sortedGates.length - 1] : sortedGates[0];

            const idx1 = GATE_ID_MAP[g1.id] ?? (('location' in g1) ? GATE_ID_MAP[g1.location] : undefined);
            const idx2 = GATE_ID_MAP[g2.id] ?? (('location' in g2) ? GATE_ID_MAP[g2.location] : undefined);

            if (idx1 !== undefined && idx2 !== undefined) {
                gateFee = MATRIX_1ST_CLASS[idx1][idx2] * classMultiplier;
            }
        }

        const total = sgsFee + gateFee;

        // Bridge Detection
        const crossesBridge = minKM < 80 && maxKM > 80;
        const bridgePrice = crossesBridge ? (BRIDGE_FEES[vClass] || 0) : 0;

        // Distance & Time
        const distance = Math.abs(km2 - km1);
        const timeMinutes = Math.round((distance / 100) * 60 + 2);

        // CO2
        const emissionRates: Record<number, number> = { 1: 120, 2: 180, 3: 250, 4: 450, 5: 750, 6: 60 };
        const co2Kg = ((distance * (emissionRates[vClass] || 120)) / 1000).toFixed(1);

        return {
            total,
            highway: total - bridgePrice,
            bridge: bridgePrice,
            distance,
            timeMinutes,
            co2Kg,
            direction: isEastbound ? "Ankara İstikameti" : "Edirne İstikameti"
        };
    };

    const result = useMemo(() => {
        return calculateTollValue(entryGate, exitGate, vehicleClass, allPoints);
    }, [entryGate, exitGate, vehicleClass, allPoints]);

    const costBreakdown = useMemo(() => {
        if (!result) return [];
        const data = [
            { name: "Otoyol", value: result.highway, color: "#f59e0b" },
        ];
        if (result.bridge > 0) {
            data.push({ name: "Köprü", value: result.bridge, color: "#3b82f6" });
        }
        return data;
    }, [result]);

    const comparisonData = useMemo(() => {
        if (!entryGate || !exitGate) return [];
        return VEHICLE_CLASSES.map((cls) => {
            const res = calculateTollValue(entryGate, exitGate, cls.id, allPoints);
            return { name: cls.label, Ücret: res?.total || 0 };
        });
    }, [entryGate, exitGate, allPoints]);

    const routeProjection = useMemo(() => {
        if (!entryGate) return [];
        return UNIFIED_STATIONS
            .filter(s => {
                const gateItem = tollGates.find(g => g.id === s.id);
                return !gateItem || gateItem.status !== 'maintenance';
            })
            .map((station) => {
                const res = calculateTollValue(entryGate, station.id, vehicleClass, allPoints);
                return {
                    name: station.name,
                    Ücret: res?.total || 0
                };
            });
    }, [entryGate, vehicleClass, allPoints]);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <div className="glass-strong border-b border-glass px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
                <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span className="text-sm">Haritaya Dön</span>
                </button>
                <div className="h-5 w-px bg-glass mx-1" />
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-amber-500/15 rounded border border-amber-500/30">
                        <Calculator className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-foreground">Ücret Hesapla</h1>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">2026 Resmî Tarife Verileri</p>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Info className="w-3 h-3" />
                    <span>Fiyatlara KDV dahildir. (01/01/2026)</span>
                </div>
            </div>

            <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-5">
                        <div className="glass rounded-xl p-5 border border-glass space-y-3 relative z-[60]">
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-bold text-foreground uppercase tracking-wide">Giriş Noktası</span>
                            </div>
                            <SelectDropdown
                                value={entryGate}
                                onChange={(v) => { setEntryGate(v); setShowResult(false); }}
                                options={allPoints}
                                placeholder="Giriş gişesi/alanı seçin..."
                                accentColor="text-emerald-400"
                            />
                        </div>

                        <div className="flex justify-center"><ArrowRight className="w-4 h-4 text-muted-foreground" /></div>

                        <div className="glass rounded-xl p-5 border border-glass space-y-3 relative z-[50]">
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin className="w-4 h-4 text-destructive" />
                                <span className="text-xs font-bold text-foreground uppercase tracking-wide">Çıkış / Geçiş Noktası</span>
                            </div>
                            <SelectDropdown
                                value={exitGate}
                                onChange={(v: string) => { setExitGate(v); setShowResult(false); }}
                                options={allowedExits}
                                placeholder={entryGate ? "Ulaşılabilir çıkış seçin..." : "Önce giriş noktası seçin"}
                                accentColor="text-destructive"
                                disabled={!entryGate}
                            />
                        </div>

                        <div className="glass rounded-xl p-5 border border-glass space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Car className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-bold text-foreground uppercase tracking-wide">Araç Sınıfı</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {VEHICLE_CLASSES.map((cls) => (
                                    <button
                                        key={cls.id}
                                        onClick={() => { setVehicleClass(cls.id); setShowResult(false); }}
                                        className={`text-left p-2.5 rounded-lg flex items-center gap-3 transition-all border ${vehicleClass === cls.id ? "bg-amber-500/10 border-amber-500/40 glow-gold" : "border-transparent hover:bg-secondary/40"
                                            }`}
                                    >
                                        <cls.icon className={`w-4 h-4 ${vehicleClass === cls.id ? "text-amber-400" : "text-muted-foreground"}`} />
                                        <div>
                                            <p className={`text-xs font-semibold ${vehicleClass === cls.id ? "text-amber-300" : "text-foreground"}`}>{cls.label}</p>
                                            <p className="text-[9px] text-muted-foreground">{cls.desc}</p>
                                        </div>
                                        {vehicleClass === cls.id && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setShowResult(true)}
                            disabled={!entryGate || !exitGate || entryGate === exitGate}
                            className="w-full py-4 rounded-xl font-bold text-sm bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 hover:glow-gold disabled:opacity-20 transition-all font-display"
                        >
                            HESAPLA
                        </button>
                    </div>

                    <div className="lg:col-span-2 space-y-5">
                        <AnimatePresence mode="wait">
                            {showResult && result ? (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SummaryCard 
                                            label="Toplam Ücret" 
                                            value={`₺${result.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                                            color="text-amber-400" 
                                            icon={<Zap className="w-4 h-4" />} 
                                            bold 
                                        />
                                        <SummaryCard label="İstikamet" value={result.direction} color="text-cyan-400" icon={<TrendingUp className="w-4 h-4" />} />
                                    </div>

                                    <div className="glass rounded-xl p-5 border border-glass">
                                        <p className="text-xs font-bold text-foreground mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-amber-400" /> Güzergah Boyu Ücret Projeksiyonu (1. Sınıf Bazlı)</p>
                                        <ResponsiveContainer width="100%" height={260}>
                                            <ReLineChart data={routeProjection}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} />
                                                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} />
                                                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} itemStyle={{ color: "#f59e0b" }} />
                                                <Line type="monotone" dataKey="Ücret" stroke="#f59e0b" strokeWidth={3} dot={{ fill: "#f59e0b", r: 4 }} activeDot={{ r: 6 }} />
                                            </ReLineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="grid grid-cols-1 gap-5">
                                        <div className="glass rounded-xl p-5 border border-glass">
                                            <p className="text-xs font-bold text-foreground mb-4">Araç Sınıfları Karşılaştırması</p>
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={comparisonData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                                                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} />
                                                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                                                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" }} />
                                                    <Bar dataKey="Ücret" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full min-h-[400px] glass rounded-3xl border border-glass p-12 text-center">
                                    <div className="p-6 bg-amber-500/10 rounded-full border border-amber-500/20 mb-6">
                                        <Calculator className="w-12 h-12 text-amber-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-2">Hesaplamaya Başlayın</h3>
                                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">2026 Resmî Ücret Tarifesi üzerinden otoyol ve serbest geçiş ücretlerini anında hesaplayın.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SelectDropdown = ({ value, onChange, options, placeholder, accentColor }: any) => {
    const [open, setOpen] = useState(false);
    const selected = options.find((o: any) => o.id === value);

    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)} className="w-full text-left px-4 py-3 rounded-xl bg-secondary/30 border border-glass flex items-center justify-between hover:bg-secondary/50 transition-all">
                {selected ? (
                    <div className="flex items-center gap-2">
                        {selected.type === 'gate' ? <MapPin className={`w-3 h-3 ${accentColor}`} /> : <Zap className={`w-3 h-3 text-amber-400`} />}
                        <span className={`text-xs font-semibold ${accentColor}`}>{selected.name}</span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">{placeholder}</span>
                )}
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        className="absolute top-full left-0 right-0 z-[9999] mt-2 rounded-xl glass-strong border border-glass shadow-2xl overflow-hidden"
                        style={{ maxHeight: '320px' }}
                    >
                        <div className="overflow-y-auto max-h-[318px] custom-scrollbar">
                            <div className="p-2 text-[10px] uppercase tracking-widest text-amber-400 font-black bg-amber-500/5 sticky top-0 z-10 backdrop-blur-md border-b border-glass mb-1">Gişeler</div>
                            <div className="p-1 space-y-0.5">
                                {options.filter((o: any) => o.type === 'gate').map((opt: any) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { onChange(opt.id); setOpen(false); }}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all text-xs group ${value === opt.id ? 'bg-emerald-500/20 text-emerald-300' : 'text-foreground hover:bg-secondary/80'}`}
                                    >
                                        <MapPin className={`w-3.5 h-3.5 ${value === opt.id ? 'text-emerald-400' : 'text-muted-foreground group-hover:text-emerald-400'}`} />
                                        <span className="font-medium">{opt.name}</span>
                                        {value === opt.id && <CheckCircle2 className="w-3 h-3 ml-auto text-emerald-400" />}
                                    </button>
                                ))}
                            </div>

                            <div className="p-2 text-[10px] uppercase tracking-widest text-blue-400 font-black bg-blue-500/5 sticky top-0 z-10 backdrop-blur-md border-y border-glass mt-2 mb-1">Serbest Geçişler</div>
                            <div className="p-1 space-y-0.5">
                                {options.filter((o: any) => o.type === 'passage').map((opt: any) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { onChange(opt.id); setOpen(false); }}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all text-xs group ${value === opt.id ? 'bg-blue-500/20 text-blue-300' : 'text-foreground hover:bg-secondary/80'}`}
                                    >
                                        <Zap className={`w-3.5 h-3.5 ${value === opt.id ? 'text-blue-400' : 'text-muted-foreground group-hover:text-blue-400'}`} />
                                        <span className="font-medium">{opt.name}</span>
                                        {value === opt.id && <CheckCircle2 className="w-3 h-3 ml-auto text-blue-400" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SummaryCard = ({ label, value, color, icon, bold }: any) => (
    <div className={`glass rounded-2xl p-5 border border-glass flex flex-col gap-2 relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
        <div className={`flex items-center gap-2 ${color} opacity-80 group-hover:opacity-100 transition-opacity`}>
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <p className={`${bold ? "text-2xl" : "text-xl"} font-display font-bold ${color}`}>{value}</p>
        <div className={`absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity`}>
            {icon}
        </div>
    </div>
);

export default TollCalculator;
