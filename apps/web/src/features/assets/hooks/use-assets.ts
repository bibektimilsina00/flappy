"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { collectionNameSchema } from "../schemas/assets-schemas";
import {
  createCollection,
  deleteCollection,
  getCollections,
  getLibrary,
  updateCollection,
} from "../services/assets-api";
import { useAssetsStore } from "../stores/use-assets-store";
import type { Collection, LibraryAsset } from "../types";

export function useAssets() {
  const qc = useQueryClient();

  const query = useAssetsStore((s) => s.query);
  const setQuery = useAssetsStore((s) => s.setQuery);
  const activeCollectionId = useAssetsStore((s) => s.activeCollectionId);
  const setActiveCollectionId = useAssetsStore((s) => s.setActiveCollectionId);
  const renamingCollectionId = useAssetsStore((s) => s.renamingCollectionId);
  const setRenamingCollectionId = useAssetsStore((s) => s.setRenamingCollectionId);
  const previewAsset = useAssetsStore((s) => s.previewAsset);
  const setPreviewAsset = useAssetsStore((s) => s.setPreviewAsset);
  const typeFilter = useAssetsStore((s) => s.typeFilter);
  const setTypeFilter = useAssetsStore((s) => s.setTypeFilter);
  const sourceFilter = useAssetsStore((s) => s.sourceFilter);
  const setSourceFilter = useAssetsStore((s) => s.setSourceFilter);
  const sortOrder = useAssetsStore((s) => s.sortOrder);
  const setSortOrder = useAssetsStore((s) => s.setSortOrder);

  const libraryQuery = useQuery({
    queryKey: ["assets-library"],
    queryFn: getLibrary,
    staleTime: 60_000,
  });

  const collectionsQuery = useQuery({
    queryKey: ["collections"],
    queryFn: getCollections,
    staleTime: 60_000,
  });

  const assets = useMemo(() => libraryQuery.data ?? [], [libraryQuery.data]);
  const collections = useMemo(() => collectionsQuery.data ?? [], [collectionsQuery.data]);
  const byId = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  const assetsOf = (c: Collection) =>
    c.asset_ids.map((id) => byId.get(id)).filter((a): a is LibraryAsset => Boolean(a));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["collections"] });
    qc.invalidateQueries({ queryKey: ["assets-library"] });
  };

  const createMutation = useMutation({
    mutationFn: (rawName: string) => {
      const name = collectionNameSchema.parse(rawName);
      return createCollection(name);
    },
    onSuccess: (c) => {
      invalidate();
      setRenamingCollectionId(c.id);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create collection");
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name: rawName }: { id: string; name: string }) => {
      const name = collectionNameSchema.parse(rawName);
      return updateCollection(id, { name });
    },
    onSuccess: () => {
      invalidate();
      setRenamingCollectionId(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to rename collection");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCollection(id),
    onSuccess: () => {
      invalidate();
      toast.success("Folder deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete collection");
    },
  });

  const assignMutation = useMutation({
    mutationFn: (v: { id: string; add?: string[]; remove?: string[] }) =>
      updateCollection(v.id, { add: v.add, remove: v.remove }),
    onSuccess: () => invalidate(),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update folder assets");
    },
  });

  const categorized = useMemo(() => new Set(collections.flatMap((c) => c.asset_ids)), [collections]);
  const activeCollection = collections.find((c) => c.id === activeCollectionId) ?? null;
  const view = activeCollection ? assetsOf(activeCollection) : assets.filter((a) => !categorized.has(a.id));
  const q = query.trim().toLowerCase();

  const shownAssets = useMemo(() => {
    return view
      .filter(
        (a) =>
          (typeFilter === "all" || a.kind === typeFilter) &&
          (sourceFilter === "all" || a.source === sourceFilter) &&
          (!q || a.name.toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        sortOrder === "newest"
          ? b.created_at.localeCompare(a.created_at)
          : a.created_at.localeCompare(b.created_at),
      );
  }, [view, typeFilter, sourceFilter, q, sortOrder]);

  return {
    isLoading: libraryQuery.isLoading,
    collections,
    shownAssets,
    activeCollection,
    query,
    setQuery,
    activeCollectionId,
    setActiveCollectionId,
    renamingCollectionId,
    setRenamingCollectionId,
    previewAsset,
    setPreviewAsset,
    typeFilter,
    setTypeFilter,
    sourceFilter,
    setSourceFilter,
    sortOrder,
    setSortOrder,
    assetsOf,
    createCollection: createMutation.mutate,
    isCreatingCollection: createMutation.isPending,
    renameCollection: renameMutation.mutate,
    deleteCollection: deleteMutation.mutate,
    assignCollection: assignMutation.mutate,
  };
}
