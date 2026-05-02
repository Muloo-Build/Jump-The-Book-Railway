import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { AmbientCompanion } from "@/components/AmbientCompanion";
import { CHAPTERS } from "@/data/books";

function findChapter(bookId: string, chapterId: string) {
  const chapters = CHAPTERS[bookId] ?? [];
  return chapters.find((c) => c.id === chapterId) ?? chapters[0] ?? null;
}

export default function AmbientCompanionScreen() {
  const { bookId, chapterId, sceneIndex } = useLocalSearchParams<{
    bookId: string;
    chapterId: string;
    sceneIndex?: string;
  }>();

  const chapter = findChapter(bookId ?? "", chapterId ?? "");
  const scenes = chapter?.scenes ?? [];
  const start = sceneIndex ? parseInt(sceneIndex, 10) : 0;

  return (
    <View style={StyleSheet.absoluteFill}>
      <AmbientCompanion
        scenes={scenes}
        chapterTitle={chapter?.title ?? ""}
        bookTitle=""
        bookId={bookId ?? ""}
        chapterId={chapterId ?? ""}
        initialSceneIndex={start}
        onExit={() => router.back()}
      />
    </View>
  );
}
