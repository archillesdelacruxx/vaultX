import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandTile } from "@/components/brand-tile";
import { Button, ThemedText } from "@/components/ui";
import { uploadFile } from "@/lib/upload";
import { api, trpcClient } from "@/lib/trpc";
import { getPreviewUrl } from "@/lib/preview";
import { brand, useThemeColors } from "@/lib/theme";

interface DocRow {
  id: number;
  name: string;
  filePath: string | null;
  fileType: string | null;
  fileSize: number;
  description: string | null;
}

type DocForm = {
  name: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  description: string;
}

const EMPTY: DocForm = { name: "", filePath: "", fileType: "", fileSize: "", description: "" };

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsScreen({ title = "Documents", hideTitle }: { title?: string; hideTitle?: boolean }) {
  const colors = useThemeColors();
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, refetch } = api.documents.list.useQuery({
    q: q || undefined,
    page,
  });
  const rows = data?.rows ?? [];
  const canLoadMore = (data?.page ?? 1) < (data?.pages ?? 1);

  const [modalVisible, setModalVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [editing, setEditing] = useState<DocRow | null>(null);
  const [form, setForm] = useState<DocForm>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const invalidate = async () => {
    await utils.documents.list.invalidate();
    await utils.dashboard.overview.invalidate();
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setModalVisible(true);
  };

  const openEdit = (item: DocRow) => {
    setEditing(item);
    setForm({
      name: item.name,
      filePath: item.filePath ?? "",
      fileType: item.fileType ?? "",
      fileSize: item.fileSize ? String(item.fileSize) : "",
      description: item.description ?? "",
    });
    setError("");
    setModalVisible(true);
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) return;
      setUploading(true);
      setError("");
      try {
        const mime = file.mimeType ?? "application/octet-stream";
        const { url, size } = await uploadFile(file.uri, file.name, mime);
        setForm((f) => ({
          ...f,
          filePath: url,
          fileType: file.mimeType ?? file.name.split(".").pop() ?? "file",
          fileSize: String(size),
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    } catch {
      setError("Could not open the file picker.");
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Please enter a name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const input = {
        name: form.name,
        filePath: form.filePath || null,
        fileType: form.fileType || null,
        fileSize: parseInt(form.fileSize || "0", 10) || 0,
        description: form.description || null,
      };
      if (editing) {
        await trpcClient.documents.update.mutate({ id: editing.id, ...input });
      } else {
        await trpcClient.documents.create.mutate(input);
      }
      await invalidate();
      setModalVisible(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: DocRow) => {
    Alert.alert("Delete", `Delete "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await trpcClient.documents.remove.mutate({ id: item.id });
          await invalidate();
        },
      },
    ]);
  };

  const openFile = (item: DocRow) => {
    const url = item.filePath;
    if (!url) {
      Alert.alert("No file", "This document has no link attached.");
      return;
    }
    if (/^https?:\/\//i.test(url)) {
      Linking.openURL(url).catch(() => {});
    } else {
      Alert.alert("File", url);
    }
  };

  const handleItemPress = (item: DocRow) => {
    const preview = getPreviewUrl(item.filePath ?? "");
    if (preview) {
      setPreviewUri(preview);
      return;
    }
    Alert.alert(item.name, undefined, [
      { text: "Open file", onPress: () => openFile(item) },
      { text: "Edit", onPress: () => openEdit(item) },
      { text: "Delete", style: "destructive", onPress: () => handleDelete(item) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const renderTile = ({ item }: { item: DocRow }) => (
    <Pressable
      onPress={() => handleItemPress(item)}
      onLongPress={() => handleDelete(item)}
      style={({ pressed }) => [
        styles.tileWrap,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <BrandTile
        label={item.name}
        subtitle={item.fileType ?? undefined}
        url={item.filePath?.startsWith("http") ? item.filePath : undefined}
        imageUrl={getPreviewUrl(item.filePath ?? "") ?? undefined}
        match={`${item.name} ${item.fileType ?? ""} ${item.filePath ?? ""}`}
      />
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        {!hideTitle ? (
          <View style={styles.titleLine}>
            <Ionicons name="folder-open" size={22} color={brand[600]} style={{ marginRight: 8 }} />
            <ThemedText variant="title" style={{ fontSize: 24 }}>
              {title}
            </ThemedText>
          </View>
        ) : null}
        <ThemedText variant="caption" style={{ marginTop: 2 }}>
          {data?.total ?? 0} saved
        </ThemedText>
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        columnWrapperStyle={styles.tileRow}
        renderItem={renderTile}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={brand[600]} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={brand[600]} style={styles.center} />
          ) : (
            <View style={styles.center}>
              <ThemedText variant="caption">Nothing here yet. Tap + to add.</ThemedText>
            </View>
          )
        }
        ListFooterComponent={
          canLoadMore ? (
            <Pressable
              onPress={() => setPage((p) => (p < (data?.pages ?? 1) ? p + 1 : p))}
              style={styles.loadMore}
            >
              <Text style={{ color: brand[600], fontWeight: "600" }}>Load more</Text>
            </Pressable>
          ) : null
        }
      />

      <Pressable
        onPress={openAdd}
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <ThemedText variant="subtitle" style={{ fontSize: 18 }}>
                {editing ? "Edit" : "Add"} document
              </ThemedText>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <ThemedText variant="label">Name</ThemedText>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Contract.pdf"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              />

              <Button
                title={uploading ? "Uploading…" : "📎 Choose file to upload"}
                onPress={pickFile}
                loading={uploading}
                variant="secondary"
                style={{ marginTop: 6, marginBottom: 4 }}
              />

              <ThemedText variant="label" style={{ marginTop: 8 }}>
                Or paste a link
              </ThemedText>
              <TextInput
                value={form.filePath}
                onChangeText={(v) => setForm((f) => ({ ...f, filePath: v }))}
                placeholder="https://drive.google.com/…"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              />

              {form.filePath && /^https?:\/\//i.test(form.filePath) && form.fileType ? (
                <ThemedText variant="caption" style={{ marginTop: 4 }}>
                  Uploaded: {form.fileType} · {formatSize(parseInt(form.fileSize || "0", 10))}
                </ThemedText>
              ) : null}

              <ThemedText variant="label" style={{ marginTop: 12 }}>
                Description
              </ThemedText>
              <TextInput
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder="Optional note"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.multiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              />

              {error ? (
                <ThemedText variant="caption" style={{ color: colors.danger, marginBottom: 8 }}>
                  {error}
                </ThemedText>
              ) : null}

              <Button title="Save" onPress={handleSave} loading={saving} style={{ marginTop: 8 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!previewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewUri(null)}>
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
          <Pressable style={styles.previewClose} onPress={() => setPreviewUri(null)} hitSlop={10}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  titleLine: { flexDirection: "row", alignItems: "center" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15 },
  listContent: { paddingHorizontal: 20, paddingBottom: 120, gap: 10 },
  center: { paddingVertical: 60, alignItems: "center" },
  tileRow: { gap: 10 },
  tileWrap: {
    flex: 1,
    maxWidth: "31%",
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMore: { alignItems: "center", paddingVertical: 14 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 120,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brand[600],
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  previewImage: { width: "100%", height: "85%" },
  previewClose: {
    position: "absolute",
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, maxHeight: "90%" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalBody: { padding: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginTop: 6,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
});
