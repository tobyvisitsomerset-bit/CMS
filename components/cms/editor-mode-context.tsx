"use client";

import { createContext, useContext, useState } from "react";

export type EditorMode = "edit" | "preview" | "listing";

type Ctx = { mode: EditorMode; setMode: (m: EditorMode) => void };

const EditorModeContext = createContext<Ctx>({ mode: "edit", setMode: () => {} });

// Kentico 11 keeps the Edit / Preview / Listing switch above the content
// tree, not in the page header — so the mode lives above both the tree and
// the editor.
export function EditorModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<EditorMode>("edit");
  return <EditorModeContext.Provider value={{ mode, setMode }}>{children}</EditorModeContext.Provider>;
}

export function useEditorMode() {
  return useContext(EditorModeContext);
}
