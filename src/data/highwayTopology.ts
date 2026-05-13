// Kuzey Marmara Otoyolu (ICA Kesimi) - Toplam Güzergah Akışları
// Avrupa: Mahmutbey -> Başakşehir -> Fenertepe -> Odayeri -> Işıklar -> Ağaçlı -> Uskumruköy -> Köprü
// Asya Main: Köprü -> Riva -> Reşadiye
// Asya Ayrım 1: Reşadiye -> Hüseyinli -> Kömürlük (Ankara Yönü Ana Gövde)
// Asya Ayrım 2: Reşadiye -> Çamlık -> Çekmeköy -> Alemdağ -> Sarıgazi -> Paşaköy -> Mecidiye -> Kurnaköy (Bağlantı Yolu)

const PATHS_ANKARA = [
  // Kol 1 (Ankara Ana Gövde)
  ["S1A", "S2A", "S3A", "S4A", "S5A", "G1", "G13", "G2", "G3", "G4", "BRIDGE", "G5", "G7", "G6", "G11"],
  // Kol 2 (Paşaköy/Kurtköy Bağlantı Yolu)
  ["S1A", "S2A", "S3A", "S4A", "S5A", "G1", "G13", "G2", "G3", "G4", "BRIDGE", "G5", "G7", "S7A", "S6A", "G8B", "S8A", "G9", "G10", "G12"]
];

const PATHS_EDIRNE = [
  // Kol 1'den Geliş
  ["G11", "G6", "G7", "G5", "BRIDGE", "G4", "G3", "G2", "G13", "G1", "S5B", "S4B", "S3B", "S1B"],
  // Kol 2'den Geliş
  ["G12", "G10", "G9", "S8B", "G8A", "S6B", "S7B", "G7", "G5", "BRIDGE", "G4", "G3", "G2", "G13", "G1", "S5B", "S4B", "S3B", "S1B"]
];

export const ENTRY_EXIT_MAP: Record<string, "entry" | "exit" | "both"> = {
  // Avrupa Serbest
  "S1A": "both", "S1B": "both", "S2A": "both", "S3A": "both", "S3B": "both", 
  "S4A": "both", "S4B": "both", "S5A": "both", "S5B": "both",
  // Asya Serbest
  "S6A": "both", "S6B": "both", "S7A": "both", "S7B": "both", "S8A": "both", "S8B": "both",
  // Gişeler
  "G1": "both", "G1-Giris": "entry", "G1-Cikis": "exit",
  "G2": "both", "G3": "both", "G4": "both", "G5": "both", "G6": "both", 
  "G7": "both", "G8A": "exit", "G8B": "entry", "G9": "both", "G10": "both", 
  "G11": "both", "G12": "both", "G13": "both"
};

// ID Normalizasyonu (G1-Cikis -> G1 gibi)
function normalizeForChain(id: string, chain: string[]): string {
  if (chain.includes(id)) return id;
  if (id.includes("-")) {
    const base = id.split("-")[0];
    if (chain.includes(base)) return base;
  }
  return id;
}

export function getLegalExits(originId: string, direction: "ankara" | "edirne" = "ankara"): string[] {
  const paths = direction === "ankara" ? PATHS_ANKARA : PATHS_EDIRNE;
  const originType = ENTRY_EXIT_MAP[originId] || "both";
  if (originType === "exit") return []; 

  const results = new Set<string>();
  
  paths.forEach(chain => {
    const searchId = normalizeForChain(originId, chain);
    const idx = chain.indexOf(searchId);
    if (idx !== -1) {
      chain.slice(idx + 1).forEach(id => {
        const type = ENTRY_EXIT_MAP[id] || "both";
        if (type === "both" || type === "exit") {
          results.add(id);
        }
      });
    }
  });

  return Array.from(results);
}

export function getLegalEntries(targetId: string, direction: "ankara" | "edirne" = "ankara"): string[] {
  const paths = direction === "ankara" ? PATHS_ANKARA : PATHS_EDIRNE;
  const targetType = ENTRY_EXIT_MAP[targetId] || "both";
  if (targetType === "entry") return []; 

  const results = new Set<string>();
  
  paths.forEach(chain => {
    const searchId = normalizeForChain(targetId, chain);
    const idx = chain.indexOf(searchId);
    if (idx !== -1) {
      chain.slice(0, idx).forEach(id => {
        const type = ENTRY_EXIT_MAP[id] || "both";
        if (type === "both" || type === "entry") {
          results.add(id);
        }
      });
    }
  });

  return Array.from(results);
}



