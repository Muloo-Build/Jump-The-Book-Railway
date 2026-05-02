import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLibrary } from "@/context/LibraryContext";
import {
  CHAPTERS,
  DEMO_BOOKS,
  Scene,
  SCENE_IMAGES,
  UserLibraryItem,
} from "@/data/books";
import { useColors } from "@/hooks/useColors";
import {
  GeneratedScene,
  useGenerateScene,
  SceneProgress,
} from "@/hooks/useGenerateScene";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Mode = "comic" | "cinematic";

interface ResolvedScene {
  id: string;
  title: string;
  narration: string;
  summary: string;
  location: string;
  mood: string;
  characters: string[];
  gradientColors: string[];
  /** A static asset id (for demo books) */
  staticImage?: any;
  /** A base64 image string (for generated user books) */
  imageB64?: string | null;
}

// ─── Resolve scenes for either a demo book or a user book ──────────────────
function demoToResolved(s: Scene): ResolvedScene {
  return {
    id: s.id,
    title: s.title,
    narration: s.narration,
    summary: s.summary,
    location: s.location,
    mood: s.mood,
    characters: s.characters,
    gradientColors: s.gradientColors,
    staticImage: SCENE_IMAGES[s.id],
  };
}

function genToResolved(g: GeneratedScene, idx: number): ResolvedScene {
  return {
    id: `gen-${idx}`,
    title: g.title,
    narration: g.narration,
    summary: g.summary,
    location: g.location,
    mood: g.mood,
    characters: g.characters,
    gradientColors: g.gradientColors,
    imageB64: g.imageB64 ?? null,
  };
}

export default function ExperienceScreen() {
  const { id, mode: modeParam, chapterId: chapterIdParam } = useLocalSearchParams<{
    id: string;
    mode?: string;
    chapterId?: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userLibrary } = useLibrary();
  const { generateScenesWithImages, readCachedScenes, isWorking, progress, error } =
    useGenerateScene();

  const [mode, setMode] = useState<Mode>(modeParam === "cinematic" ? "cinematic" : "comic");
  const [scenes, setScenes] = useState<ResolvedScene[]>([]);
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [bookTitle, setBookTitle] = useState<string>("");
  const [hasTriggered, setHasTriggered] = useState(false);
  const [localProgress, setLocalProgress] = useState<SceneProgress | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const demoBook = DEMO_BOOKS.find((b) => b.id === id);
  const userBook = userLibrary.find((b) => b.id === id);

  // ── Demo path: read pre-baked scenes from CHAPTERS ──────────────────────
  useEffect(() => {
    if (!demoBook) return;
    const chapters = CHAPTERS[demoBook.id] ?? [];
    const chapter =
      chapters.find((c) => c.id === chapterIdParam) ?? chapters[0];
    if (!chapter) return;
    setChapterTitle(chapter.title);
    setBookTitle(demoBook.title);
    setScenes(chapter.scenes.map(demoToResolved));
  }, [demoBook, chapterIdParam]);

  // ── User path: try cache first, then generate on first visit ──────────
  useEffect(() => {
    if (!userBook || hasTriggered) return;
    let cancelled = false;

    const load = async () => {
      setBookTitle(userBook.title);
      setChapterTitle(`Chapter ${userBook.currentChapter}`);
      setHasTriggered(true);

      const params = {
        bookTitle: userBook.title,
        author: userBook.author,
        chapterTitle: `Chapter ${userBook.currentChapter}`,
        chapterNumber: userBook.currentChapter,
        visualStyle: userBook.visualStyle,
        spoilerMode: userBook.spoilerMode,
      };

      const cached = await readCachedScenes(params);
      if (cancelled) return;
      if (cached && cached.length > 0) {
        setScenes(cached.map(genToResolved));
        return;
      }

      const result = await generateScenesWithImages(params, (p) => {
        if (!cancelled) setLocalProgress(p);
      });
      if (cancelled) return;
      if (result) {
        setScenes(result.scenes.map(genToResolved));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userBook, hasTriggered, readCachedScenes, generateScenesWithImages]);

  if (!demoBook && !userBook) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Book not found</Text>
      </View>
    );
  }

  // ── Loading / generating state for user books ───────────────────────────
  if (scenes.length === 0) {
    const pct =
      localProgress && localProgress.total > 0
        ? Math.round((localProgress.current / localProgress.total) * 100)
        : 0;
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background, paddingTop: topPad + 24 }]}>
        <View style={styles.loadingHeader}>
          <TouchableOpacity
            style={[styles.circleBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => router.back()}
          >
            <Feather name="x" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingBody}>
          <View style={[styles.loadingIconWrap, { backgroundColor: colors.accent + "20" }]}>
            {error ? (
              <Feather name="alert-circle" size={40} color={colors.destructive} />
            ) : (
              <ActivityIndicator size="large" color={colors.accent} />
            )}
          </View>
          <Text style={[styles.loadingTitle, { color: colors.foreground }]}>
            {error
              ? "Something went wrong"
              : localProgress?.stage === "writing"
              ? "Reading your chapter…"
              : localProgress?.stage === "painting"
              ? "Painting your scenes…"
              : "Preparing your book…"}
          </Text>
          <Text style={[styles.loadingSub, { color: colors.mutedForeground }]}>
            {error ?? localProgress?.message ?? "This usually takes about a minute."}
          </Text>
          {!error && localProgress && localProgress.total > 0 && (
            <View style={styles.progressBlock}>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.accent, width: `${pct}%` as any },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                Scene {localProgress.current} of {localProgress.total}
              </Text>
            </View>
          )}
          {error && (
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setHasTriggered(false);
                setLocalProgress(null);
              }}
            >
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
                Try again
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: topPad + 8,
            backgroundColor: mode === "cinematic" ? "transparent" : colors.background,
            borderBottomWidth: mode === "cinematic" ? 0 : StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.circleBtn,
            { backgroundColor: mode === "cinematic" ? "rgba(0,0,0,0.5)" : colors.card },
          ]}
          onPress={() => router.back()}
        >
          <Feather
            name="x"
            size={20}
            color={mode === "cinematic" ? "#fff" : colors.foreground}
          />
        </TouchableOpacity>
        <View
          style={[
            styles.modeToggle,
            { backgroundColor: mode === "cinematic" ? "rgba(0,0,0,0.45)" : colors.muted },
          ]}
        >
          <ModeToggleBtn
            label="Comic"
            icon="grid"
            active={mode === "comic"}
            onPress={() => setMode("comic")}
            cinematic={mode === "cinematic"}
            colors={colors}
          />
          <ModeToggleBtn
            label="Cinematic"
            icon="film"
            active={mode === "cinematic"}
            onPress={() => setMode("cinematic")}
            cinematic={mode === "cinematic"}
            colors={colors}
          />
        </View>
        <View style={[styles.circleBtn, { backgroundColor: "transparent" }]} />
      </View>

      {mode === "comic" ? (
        <ComicView
          scenes={scenes}
          bookTitle={bookTitle}
          chapterTitle={chapterTitle}
          colors={colors}
          topPad={topPad + 64}
          bottomPad={bottomPad + 24}
        />
      ) : (
        <CinematicView
          scenes={scenes}
          bookTitle={bookTitle}
          chapterTitle={chapterTitle}
          colors={colors}
          topPad={topPad}
          bottomPad={bottomPad}
        />
      )}
    </View>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Mode toggle button
// ───────────────────────────────────────────────────────────────────────────
function ModeToggleBtn({
  label,
  icon,
  active,
  onPress,
  cinematic,
  colors,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  active: boolean;
  onPress: () => void;
  cinematic: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const activeBg = cinematic ? "#fff" : colors.primary;
  const activeFg = cinematic ? "#000" : colors.primaryForeground;
  const inactiveFg = cinematic ? "rgba(255,255,255,0.7)" : colors.foreground;
  return (
    <TouchableOpacity
      style={[styles.toggleBtn, { backgroundColor: active ? activeBg : "transparent" }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Feather name={icon} size={13} color={active ? activeFg : inactiveFg} />
      <Text style={[styles.toggleLabel, { color: active ? activeFg : inactiveFg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Comic view — vertical scroll of full-bleed panels
// ───────────────────────────────────────────────────────────────────────────
function ComicView({
  scenes,
  bookTitle,
  chapterTitle,
  colors,
  topPad,
  bottomPad,
}: {
  scenes: ResolvedScene[];
  bookTitle: string;
  chapterTitle: string;
  colors: ReturnType<typeof useColors>;
  topPad: number;
  bottomPad: number;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.comicHeader}>
        <Text style={[styles.comicChapter, { color: colors.mutedForeground }]}>{bookTitle}</Text>
        <Text style={[styles.comicTitle, { color: colors.foreground }]}>{chapterTitle}</Text>
      </View>

      {scenes.map((scene, idx) => (
        <ComicPanel key={scene.id} scene={scene} index={idx} colors={colors} />
      ))}

      <View style={[styles.endCard, { borderColor: colors.border }]}>
        <Feather name="check-circle" size={20} color={colors.accent} />
        <Text style={[styles.endText, { color: colors.foreground }]}>End of chapter</Text>
      </View>
    </ScrollView>
  );
}

function ComicPanel({
  scene,
  index,
  colors,
}: {
  scene: ResolvedScene;
  index: number;
  colors: ReturnType<typeof useColors>;
}) {
  const [imgError, setImgError] = useState(false);
  const hasImage = !imgError && (scene.staticImage || scene.imageB64);

  return (
    <View style={styles.panel}>
      <View style={[styles.panelImageWrap, { borderColor: colors.border }]}>
        {scene.staticImage ? (
          <Image
            source={scene.staticImage}
            style={styles.panelImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : scene.imageB64 ? (
          <Image
            source={{ uri: `data:image/png;base64,${scene.imageB64}` }}
            style={styles.panelImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <LinearGradient
            colors={scene.gradientColors as [string, string, ...string[]]}
            style={styles.panelImage}
          />
        )}
        {hasImage && (
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            style={styles.panelImageOverlay}
          />
        )}
        <View style={styles.panelNumber}>
          <Text style={styles.panelNumberText}>{String(index + 1).padStart(2, "0")}</Text>
        </View>
      </View>

      <View style={styles.panelBody}>
        <Text style={[styles.panelTitle, { color: colors.foreground }]}>{scene.title}</Text>
        <View style={[styles.narrationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.narrationText, { color: colors.foreground }]}>
            “{scene.narration}”
          </Text>
        </View>
        <Text style={[styles.panelSummary, { color: colors.mutedForeground }]}>{scene.summary}</Text>
        <View style={styles.panelMeta}>
          <View style={[styles.metaPill, { backgroundColor: colors.muted }]}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{scene.location}</Text>
          </View>
          <View style={[styles.metaPill, { backgroundColor: colors.muted }]}>
            <Feather name="wind" size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {scene.mood.split(",")[0]?.trim()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Cinematic view — full-screen with swipe sideways
// ───────────────────────────────────────────────────────────────────────────
function CinematicView({
  scenes,
  bookTitle,
  chapterTitle,
  colors,
  topPad,
  bottomPad,
}: {
  scenes: ResolvedScene[];
  bookTitle: string;
  chapterTitle: string;
  colors: ReturnType<typeof useColors>;
  topPad: number;
  bottomPad: number;
}) {
  const [current, setCurrent] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= scenes.length) return;
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, {
          toValue: next > current ? -30 : 30,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrent(next);
        slideAnim.setValue(next > current ? 30 : -30);
        Animated.parallel([
          Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
      });
    },
    [current, opacityAnim, scenes.length, slideAnim]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -50) animateTo(current + 1);
          else if (g.dx > 50) animateTo(current - 1);
        },
      }),
    [animateTo, current]
  );

  const scene = scenes[current];

  return (
    <View style={styles.cinematicRoot} {...panResponder.panHandlers}>
      {/* Background image OR gradient */}
      {scene.staticImage ? (
        <Image source={scene.staticImage} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : scene.imageB64 ? (
        <Image
          source={{ uri: `data:image/png;base64,${scene.imageB64}` }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={scene.gradientColors as [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Dark gradient overlay for text legibility */}
      <LinearGradient
        colors={["rgba(0,0,0,0.55)", "transparent", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Progress dots */}
      <View style={[styles.dotsRow, { top: topPad + 64 }]}>
        {scenes.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => animateTo(i)}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: i === current ? "#fff" : "rgba(255,255,255,0.4)",
                  width: i === current ? 24 : 6,
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Scene text */}
      <Animated.View
        style={[
          styles.cinematicBody,
          {
            paddingBottom: bottomPad + 96,
            opacity: opacityAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.cinematicTopMeta}>
          <Text style={styles.cinematicBook}>{bookTitle}</Text>
          <Text style={styles.cinematicChapter}>· {chapterTitle}</Text>
        </View>
        <Text style={styles.cinematicTitle}>{scene.title}</Text>
        <View style={styles.cinematicNarration}>
          <Text style={styles.cinematicNarrationText}>“{scene.narration}”</Text>
        </View>
        <View style={styles.cinematicMetaRow}>
          <View style={styles.cinematicMetaPill}>
            <Feather name="map-pin" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={styles.cinematicMetaText}>{scene.location}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom nav */}
      <View style={[styles.cinematicNav, { paddingBottom: bottomPad + 16 }]}>
        <TouchableOpacity
          style={[styles.navBtn, { opacity: current === 0 ? 0.3 : 1 }]}
          onPress={() => animateTo(current - 1)}
          disabled={current === 0}
        >
          <Feather name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.cinematicCount}>
          <Text style={styles.cinematicCountText}>
            {current + 1} / {scenes.length}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.navBtn, { opacity: current === scenes.length - 1 ? 0.3 : 1 }]}
          onPress={() => animateTo(current + 1)}
          disabled={current === scenes.length - 1}
        >
          <Feather name="chevron-right" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────────────────────────
const PANEL_HEIGHT = Math.round(SCREEN_WIDTH * 0.85);

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modeToggle: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    gap: 2,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  toggleLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // ── Loading screen ──────────────────────────────────────────────────
  loadingScreen: { flex: 1 },
  loadingHeader: { paddingHorizontal: 16, paddingBottom: 12 },
  loadingBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 14 },
  loadingIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  loadingTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  loadingSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  progressBlock: { width: "100%", marginTop: 24, gap: 8 },
  progressTrack: { width: "100%", height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  retryBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginTop: 16 },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // ── Comic view ──────────────────────────────────────────────────────
  comicHeader: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20, gap: 4 },
  comicChapter: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1 },
  comicTitle: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 36 },
  panel: { paddingHorizontal: 16, marginBottom: 28 },
  panelImageWrap: {
    height: PANEL_HEIGHT,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  panelImage: { width: "100%", height: "100%" },
  panelImageOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: "40%" },
  panelNumber: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  panelNumberText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1.5,
  },
  panelBody: { paddingTop: 14, gap: 10 },
  panelTitle: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 28 },
  narrationCard: { borderRadius: 14, padding: 14, borderWidth: 1 },
  narrationText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24, fontStyle: "italic" },
  panelSummary: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  panelMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  metaText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  endCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 24,
    paddingVertical: 22,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: 12,
  },
  endText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // ── Cinematic view ──────────────────────────────────────────────────
  cinematicRoot: { flex: 1 },
  dotsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    zIndex: 5,
  },
  dot: { height: 6, borderRadius: 3 },
  cinematicBody: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    gap: 12,
  },
  cinematicTopMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  cinematicBook: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  cinematicChapter: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)" },
  cinematicTitle: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 38 },
  cinematicNarration: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 14,
    padding: 14,
  },
  cinematicNarrationText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.95)",
    lineHeight: 24,
    fontStyle: "italic",
  },
  cinematicMetaRow: { flexDirection: "row", gap: 8 },
  cinematicMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  cinematicMetaText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.9)" },
  cinematicNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  navBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  cinematicCount: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  cinematicCountText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
