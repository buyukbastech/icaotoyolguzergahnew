import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Network,
  ChevronDown,
  MapPin,
  Zap,
  ArrowRight,
  ArrowDown,
  Info,
  CheckCircle2,
  Navigation,
  GitBranch,
  Search
} from "lucide-react";
import { tollGates, passagePoints } from "@/data/mapData";
import { getLegalEntries, getLegalExits } from "@/data/highwayTopology";

const ConnectivityAnalysis = () => {
  const navigate = useNavigate();
  const [selectedPointId, setSelectedPointId] = useState<string>("");
  const [direction, setDirection] = useState<"ankara" | "edirne">("ankara");

  // Combine all points for selection
  const allPoints = useMemo(() => {
    const gates = tollGates.map(g => ({ ...g, type: 'gate' as const }));
    const passages = passagePoints.map(p => ({ ...p, type: 'passage' as const }));
    return [...gates, ...passages].sort((a, b) => a.id.localeCompare(b.id));
  }, []);

  const selectedPoint = useMemo(() => 
    allPoints.find(p => p.id === selectedPointId), 
  [selectedPointId, allPoints]);

  const connections = useMemo(() => {
    if (!selectedPointId) return { entries: [], exits: [] };
    
    const entries = getLegalEntries(selectedPointId, direction).map(id => 
      allPoints.find(p => p.id === id)
    ).filter(Boolean);
    
    const exits = getLegalExits(selectedPointId, direction).map(id => 
      allPoints.find(p => p.id === id)
    ).filter(Boolean);

    return { entries, exits };
  }, [selectedPointId, direction, allPoints]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="glass-strong border-b border-glass px-6 py-4 flex items-center gap-4 sticky top-0 z-50">
        <button 
          onClick={() => navigate("/")} 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm">Haritaya Dön</span>
        </button>
        <div className="h-5 w-px bg-glass mx-1" />
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-500/15 rounded border border-blue-500/30">
            <GitBranch className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Giriş-Çıkış Analizi</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Nokta Bazlı Bağlantı Matrisi</p>
          </div>
        </div>
        <div className="ml-auto hidden md:flex items-center gap-2 text-[10px] text-muted-foreground">
          <Info className="w-3 h-3" />
          <span>Veriler otoyol topolojisine göre dinamik olarak hesaplanır.</span>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Controls Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-5 border border-glass space-y-4 relative z-40">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">Analiz Noktası Seçin</span>
            </div>
            <PointSelector 
              value={selectedPointId}
              onChange={setSelectedPointId}
              options={allPoints}
            />
          </div>

          <div className="glass rounded-2xl p-5 border border-glass space-y-4">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">Güzergah Yönü</span>
            </div>
            <div className="flex p-1 bg-secondary/30 rounded-xl border border-glass">
              <button
                onClick={() => setDirection("ankara")}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  direction === "ankara" 
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30 glow-blue" 
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                Ankara Yönü
              </button>
              <button
                onClick={() => setDirection("edirne")}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  direction === "edirne" 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 glow-emerald" 
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                Edirne Yönü
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {selectedPointId ? (
            <motion.div 
              key={`${selectedPointId}-${direction}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
            >
              {/* Entries Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-black uppercase tracking-tighter text-emerald-400 flex items-center gap-2">
                    <ArrowDown className="w-3 h-3" /> Nereden Gelebilir?
                  </h3>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {connections.entries.length} Giriş
                  </span>
                </div>
                <div className="space-y-2.5">
                  {connections.entries.length > 0 ? (
                    connections.entries.map((point: any) => (
                      <ConnectionCard key={point.id} point={point} type="entry" />
                    ))
                  ) : (
                    <EmptyState text="Bu yönde giriş bağlantısı bulunamadı." />
                  )}
                </div>
              </div>

              {/* Center Node */}
              <div className="flex flex-col items-center justify-center pt-8 lg:pt-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                  <div className="relative glass-strong rounded-3xl p-8 border-2 border-blue-500/50 flex flex-col items-center gap-4 text-center shadow-2xl scale-110">
                    <div className={`p-4 rounded-2xl ${selectedPoint?.type === 'gate' ? 'bg-destructive/20 border-destructive/30' : 'bg-amber-500/20 border-amber-500/30'} border shadow-lg`}>
                      {selectedPoint?.type === 'gate' ? <MapPin className="w-8 h-8 text-destructive" /> : <Zap className="w-8 h-8 text-amber-500" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-foreground tracking-tight">{selectedPoint?.id}</h2>
                      <p className="text-sm font-bold text-blue-400">{selectedPoint?.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
                        {selectedPoint?.type === 'gate' ? (selectedPoint as any).location : (selectedPoint as any).group}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="h-16 w-px bg-gradient-to-b from-blue-500/50 to-transparent mt-4 lg:hidden" />
              </div>

              {/* Exits Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-black uppercase tracking-tighter text-destructive flex items-center gap-2">
                    Nereye Gidebilir? <ArrowRight className="w-3 h-3" />
                  </h3>
                  <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full border border-destructive/20">
                    {connections.exits.length} Çıkış
                  </span>
                </div>
                <div className="space-y-2.5">
                  {connections.exits.length > 0 ? (
                    connections.exits.map((point: any) => (
                      <ConnectionCard key={point.id} point={point} type="exit" />
                    ))
                  ) : (
                    <EmptyState text="Bu yönde çıkış bağlantısı bulunamadı." />
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[50vh] glass rounded-3xl border border-glass text-center p-12">
              <div className="p-6 bg-blue-500/10 rounded-full border border-blue-500/20 mb-6 group animate-pulse">
                <Network className="w-16 h-16 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Analiz İçin Nokta Seçin</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Bir gişe veya serbest geçiş noktası seçerek, otoyol topolojisine göre tüm yasal giriş ve çıkış bağlantılarını analiz edebilirsiniz.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const ConnectionCard = ({ point, type }: { point: any; type: 'entry' | 'exit' }) => (
  <motion.div 
    whileHover={{ scale: 1.02, x: type === 'exit' ? 4 : -4 }}
    className="glass p-3.5 rounded-xl border border-glass flex items-center gap-4 group transition-all cursor-default"
  >
    <div className={`p-2 rounded-lg border ${
      point.type === 'gate' 
        ? 'bg-destructive/10 border-destructive/20 text-destructive' 
        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    }`}>
      {point.type === 'gate' ? <MapPin className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
    </div>
    <div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-black text-foreground">{point.id}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground border border-glass">
          {point.type === 'gate' ? 'Gişe' : 'SGS'}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground font-medium group-hover:text-blue-400 transition-colors uppercase tracking-tight truncate max-w-[140px]">
        {point.name}
      </p>
    </div>
    {type === 'exit' && <ArrowRight className="w-3 h-3 text-destructive/40 ml-auto group-hover:text-destructive group-hover:translate-x-1 transition-all" />}
    {type === 'entry' && <CheckCircle2 className="w-3 h-3 text-emerald-500/40 ml-auto group-hover:text-emerald-500 transition-all shadow-sm" />}
  </motion.div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="p-8 text-center glass rounded-2xl border border-dashed border-glass/50 bg-secondary/10">
    <p className="text-[11px] text-muted-foreground italic">{text}</p>
  </div>
);

const PointSelector = ({ value, onChange, options }: any) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const selected = options.find((o: any) => o.id === value);

  const filteredOptions = options.filter((o: any) => 
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    o.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)} 
        className={`w-full text-left px-4 py-3.5 rounded-xl bg-secondary/30 border border-glass flex items-center justify-between hover:bg-secondary/50 transition-all ${open ? 'border-blue-500/40 glow-blue' : ''}`}
      >
        {selected ? (
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${selected.type === 'gate' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-400'}`}>
              {selected.type === 'gate' ? <MapPin className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-foreground">{selected.id}</span>
              <span className="text-[10px] text-muted-foreground truncate">{selected.name}</span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Analiz edilmek istenen noktayı seçin...</span>
        )}
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="absolute top-full left-0 right-0 z-[100] mt-2 rounded-2xl glass-strong border border-glass shadow-2xl overflow-hidden"
          >
            <div className="p-3 border-b border-glass bg-secondary/20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ID veya isim ile ara..."
                  className="w-full bg-background/50 border border-glass rounded-lg pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:border-blue-500/50 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1.5 space-y-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt: any) => (
                  <button
                    key={opt.id}
                    onClick={() => { onChange(opt.id); setOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all group ${value === opt.id ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300' : 'text-foreground hover:bg-secondary/40 border border-transparent'}`}
                  >
                    <div className={`p-1.5 rounded-lg ${opt.type === 'gate' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-400'}`}>
                      {opt.type === 'gate' ? <MapPin className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black">{opt.id}</span>
                      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">{opt.name}</span>
                    </div>
                    {value === opt.id && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-blue-400" />}
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-[10px] text-muted-foreground uppercase tracking-widest italic">Sonuç bulunamadı</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConnectivityAnalysis;
