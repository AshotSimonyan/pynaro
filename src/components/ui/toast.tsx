import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { borderWidth, colors, radius, shadows, spacing, typography } from "@/theme";

export type ToastTone = "info" | "success" | "error";

export type ToastOptions = {
  message: string;
  tone?: ToastTone;
  /** Milliseconds before the toast hides itself. */
  duration?: number;
};

type ToastApi = {
  show: (options: ToastOptions) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/**
 * One toast at a time: a second `show` replaces the first rather than queueing,
 * which is what the prototype's sonner calls do in practice.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Required<ToastOptions> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    ({ message, tone = "info", duration = 3200 }: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, tone, duration });
      timer.current = setTimeout(() => setToast(null), duration);
    },
    [],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastHost toast={toast} onDismiss={hide} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside a ToastProvider");
  return api;
}

function ToastHost({
  toast,
  onDismiss,
}: {
  toast: Required<ToastOptions> | null;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  // A state initialiser rather than a ref: the value is read during render.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: toast ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [toast, progress]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        { top: insets.top + spacing.sm },
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-16, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable accessibilityRole="alert" onPress={onDismiss} style={styles.toast}>
        <View style={[styles.dot, { backgroundColor: toneColors[toast.tone] }]} />
        <Text style={styles.message}>{toast.message}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: spacing.lg, right: spacing.lg, zIndex: 100 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: borderWidth.hairline,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  message: { ...typography.bodyStrong, flexShrink: 1 },
});

const toneColors: Record<ToastTone, string> = {
  info: colors.primary,
  success: colors.success,
  error: colors.danger,
};
