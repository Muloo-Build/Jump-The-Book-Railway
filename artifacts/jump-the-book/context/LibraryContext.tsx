import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { UserLibraryItem, VisualStyle, SpoilerMode } from "@/data/books";

const STORAGE_KEY = "@jump_the_book_library";
const SETTINGS_KEY = "@jump_the_book_settings";
const ACTIVE_BOOK_KEY = "@jump_the_book_active";

interface AppSettings {
  defaultVisualStyle: VisualStyle;
  spoilerMode: SpoilerMode;
  readingMode: "reading" | "listening" | "both";
}

interface LibraryContextType {
  userLibrary: UserLibraryItem[];
  settings: AppSettings;
  activeBookId: string | null;
  addBook: (item: Omit<UserLibraryItem, "id" | "createdAt">) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  updateProgress: (id: string, progress: number) => Promise<void>;
  setActiveBookId: (id: string | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: AppSettings = {
  defaultVisualStyle: "fantasy-illustration",
  spoilerMode: "no-spoilers",
  readingMode: "reading",
};

const LibraryContext = createContext<LibraryContextType | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [userLibrary, setUserLibrary] = useState<UserLibraryItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [libData, settingsData, activeData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(ACTIVE_BOOK_KEY),
        ]);
        if (libData) setUserLibrary(JSON.parse(libData));
        if (settingsData) setSettings(JSON.parse(settingsData));
        if (activeData) setActiveBookId(activeData);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const addBook = useCallback(
    async (item: Omit<UserLibraryItem, "id" | "createdAt">) => {
      const newItem: UserLibraryItem = {
        ...item,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      };
      const updated = [...userLibrary, newItem];
      setUserLibrary(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [userLibrary]
  );

  const removeBook = useCallback(
    async (id: string) => {
      const updated = userLibrary.filter((b) => b.id !== id);
      setUserLibrary(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [userLibrary]
  );

  const updateProgress = useCallback(
    async (id: string, progress: number) => {
      const updated = userLibrary.map((b) =>
        b.id === id ? { ...b, progress } : b
      );
      setUserLibrary(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [userLibrary]
  );

  const handleSetActiveBookId = useCallback((id: string | null) => {
    setActiveBookId(id);
    if (id) {
      AsyncStorage.setItem(ACTIVE_BOOK_KEY, id);
    } else {
      AsyncStorage.removeItem(ACTIVE_BOOK_KEY);
    }
  }, []);

  const updateSettings = useCallback(
    async (newSettings: Partial<AppSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    },
    [settings]
  );

  return (
    <LibraryContext.Provider
      value={{
        userLibrary,
        settings,
        activeBookId,
        addBook,
        removeBook,
        updateProgress,
        setActiveBookId: handleSetActiveBookId,
        updateSettings,
        isLoading,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
