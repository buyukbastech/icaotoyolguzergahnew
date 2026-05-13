import { useState } from "react";
import RouteSidebar from "@/components/dashboard/RouteSidebar";
import MapView from "@/components/dashboard/MapView";
import { motion } from "framer-motion";

const Index = () => {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [peakHourMode, setPeakHourMode] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex h-screen w-full overflow-hidden bg-background"
    >
      {/* Sidebar with animation */}
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <RouteSidebar
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          activeRoute={activeRoute}
          setActiveRoute={setActiveRoute}
          peakHourMode={peakHourMode}
          setPeakHourMode={setPeakHourMode}
        />
      </motion.div>

      {/* Map view with animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 relative overflow-hidden"
      >
        <MapView
          activeRoute={activeRoute}
          peakHourMode={peakHourMode}
          selectedGroup={selectedGroup}
        />
      </motion.div>
    </motion.div>
  );
};

export default Index;
