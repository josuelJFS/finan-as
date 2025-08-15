import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";

interface TooltipContent {
  x: number;
  y: number;
  title?: string;
  lines?: { label: string; value: string; color?: string }[];
  accentColor?: string;
  visible: boolean;
}

interface ChartTooltipContextValue {
  show: (cfg: Omit<TooltipContent, "visible">) => void;
  hide: () => void;
}

const ChartTooltipContext = createContext<ChartTooltipContextValue | undefined>(undefined);

export const useChartTooltip = () => {
  const ctx = useContext(ChartTooltipContext);
  if (!ctx) throw new Error("useChartTooltip must be used inside ChartTooltipProvider");
  return ctx;
};

export const ChartTooltipProvider = ({ children }: { children: ReactNode }) => {
  const [tooltip, setTooltip] = useState<TooltipContent | null>(null);

  const show: ChartTooltipContextValue["show"] = useCallback((cfg) => {
    const screen = Dimensions.get("window");
    const margin = 12;
    let tx = cfg.x;
    let ty = cfg.y;
    // Ajuste para bordas
    if (tx + 180 > screen.width - margin) tx = screen.width - 180 - margin;
    if (tx < margin) tx = margin;
    if (ty < margin) ty = margin;
    if (ty + 120 > screen.height - margin) ty = screen.height - 120 - margin;
    setTooltip({ ...cfg, x: tx, y: ty, visible: true });
  }, []);

  const hide = useCallback(() => setTooltip((t) => (t ? { ...t, visible: false } : t)), []);

  return (
    <ChartTooltipContext.Provider value={{ show, hide }}>
      {children}
      {tooltip?.visible && (
        <View pointerEvents="none" style={[styles.portal, { left: tooltip.x, top: tooltip.y }]}>
          <View style={[styles.card, { borderColor: tooltip.accentColor || "#3b82f6" }]}>
            {tooltip.title && <Text style={styles.title}>{tooltip.title}</Text>}
            {tooltip.lines?.map((l) => (
              <View key={l.label} style={styles.lineRow}>
                <View style={[styles.dot, { backgroundColor: l.color || "#6b7280" }]} />
                <Text style={styles.lineLabel}>{l.label}</Text>
                <Text style={styles.lineValue}>{l.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ChartTooltipContext.Provider>
  );
};

const styles = StyleSheet.create({
  portal: { position: "absolute", zIndex: 1000 },
  card: {
    maxWidth: 180,
    backgroundColor: "rgba(17,24,39,0.95)",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  title: { color: "white", fontWeight: "600", fontSize: 12, marginBottom: 4 },
  lineRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  lineLabel: { color: "#d1d5db", fontSize: 11, flex: 1 },
  lineValue: { color: "white", fontSize: 11, fontWeight: "600" },
});
