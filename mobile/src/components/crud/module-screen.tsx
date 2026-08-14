import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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

import { Button, ThemedText } from "@/components/ui";
import { brand, useThemeColors } from "@/lib/theme";
import { type FieldDef, type FormValue, renderField } from "./fields";

export interface RowModel {
  id: number;
}

export interface RowRender {
  title: string;
  subtitle?: string;
  right?: string;
  accent?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface ActionChip {
  label: string;
  active: boolean;
  onPress: () => void;
}

export interface ModuleScreenProps<T extends RowModel, TForm extends Record<string, FormValue>> {
  title: string;
  subtitle?: string;
  fields: FieldDef[];
  emptyForm: TForm;
  toForm: (item: T) => TForm;
  rows: T[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error?: unknown;
  canLoadMore?: boolean;
  onLoadMore?: () => void;
  onSearch?: (q: string) => void;
  onRefresh: () => void;
  onAdd: (form: TForm) => Promise<void>;
  onUpdate: (id: number, form: TForm) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  renderItem: (item: T) => RowRender;
  onItemPress?: (item: T) => void;
  actionChips?: (item: T) => ActionChip[];
  icon?: keyof typeof Ionicons.glyphMap;
  grid?: boolean;
  renderTile?: (item: T) => React.ReactNode;
  hideTitle?: boolean;
}

export function ModuleScreen<T extends RowModel, TForm extends Record<string, FormValue>>({
  title,
  subtitle,
  fields,
  emptyForm,
  toForm,
  rows,
  isLoading,
  isFetching,
  error,
  canLoadMore,
  onLoadMore,
  onSearch,
  onRefresh,
  onAdd,
  onUpdate,
  onDelete,
  renderItem,
  onItemPress,
  actionChips,
  icon,
  grid,
  renderTile,
  hideTitle,
}: ModuleScreenProps<T, TForm>) {
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<TForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSearchChange = (q: string) => {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => onSearch?.(q.trim()), 350);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalVisible(true);
  };

  const openEdit = (item: T) => {
    setEditing(item);
    setForm(toForm(item));
    setFormError("");
    setModalVisible(true);
  };

  const setField = (name: string, value: FormValue) =>
    setForm((f) => ({ ...f, [name]: value }));

  const handleSave = async () => {
    const missing = fields.some(
      (f) =>
        !f.optional &&
        f.type !== "switch" &&
        f.type !== "select" &&
        String(form[f.name] ?? "").trim() === "",
    );
    if (missing) {
      setFormError("Please fill out the required fields.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await onUpdate(editing.id, form);
      } else {
        await onAdd(form);
      }
      setModalVisible(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: T) => {
    Alert.alert("Delete", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(item.id).catch(() => {}),
      },
    ]);
  };

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={brand[600]} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center}>
          <ThemedText variant="caption" style={{ color: colors.danger, textAlign: "center" }}>
            Could not load. Pull down to retry.
          </ThemedText>
        </View>
      );
    }
    return null;
  }, [isLoading, error, colors]);

  const renderRow = ({ item }: { item: T }) => {
    const r = renderItem(item);
    return (
      <Pressable
        onPress={() => (onItemPress ? onItemPress(item) : openEdit(item))}
        onLongPress={() => handleDelete(item)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed ? { opacity: 0.85 } : null,
        ]}
      >
        <View style={styles.rowMain}>
          <View style={styles.rowTitleLine}>
            {r.icon ? (
              <Ionicons name={r.icon} size={16} color={brand[600]} style={{ marginRight: 6 }} />
            ) : null}
            <Text
              style={[styles.rowTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {r.title}
            </Text>
          </View>
          {r.subtitle ? (
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              {r.subtitle}
            </Text>
          ) : null}
          {actionChips ? (
            <View style={styles.chipRow}>
              {actionChips(item).map((c) => (
                <Pressable
                  key={c.label}
                  onPress={c.onPress}
                  style={[
                    styles.actionChip,
                    c.active
                      ? { backgroundColor: brand[600] }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  <Text style={[styles.actionChipText, { color: c.active ? "#fff" : colors.text }]}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.rowRight}>
          {r.right ? (
            <Text style={[styles.rowRightText, { color: r.accent ?? colors.text }]}>
              {r.right}
            </Text>
          ) : null}
          <Pressable onPress={() => handleDelete(item)} hitSlop={10} style={{ padding: 4, marginTop: r.right ? 6 : 0 }}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderGridTile = ({ item }: { item: T }) => {
    const r = renderItem(item);
    return (
      <Pressable
        onPress={() => (onItemPress ? onItemPress(item) : openEdit(item))}
        onLongPress={() => handleDelete(item)}
        style={({ pressed }) => [
          styles.tileWrap,
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed ? { opacity: 0.85 } : null,
        ]}
      >
        {renderTile ? renderTile(item) : (
          <>
            {r.icon ? (
              <View style={[styles.tileIcon, { backgroundColor: brand[50] }]}>
                <Ionicons name={r.icon} size={30} color={brand[600]} />
              </View>
            ) : null}
            <Text style={[styles.tileTitle, { color: colors.text }]} numberOfLines={1}>
              {r.title}
            </Text>
            {r.subtitle ? (
              <Text style={[styles.tileSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {r.subtitle}
              </Text>
            ) : null}
          </>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        {!hideTitle ? (
          <View style={styles.titleLine}>
            {icon ? <Ionicons name={icon} size={22} color={brand[600]} style={{ marginRight: 8 }} /> : null}
            <ThemedText variant="title" style={{ fontSize: 24 }}>
              {title}
            </ThemedText>
          </View>
        ) : null}
        {subtitle ? (
          <ThemedText variant="caption" style={{ marginTop: 2 }}>
            {subtitle}
          </ThemedText>
        ) : null}
        {onSearch ? (
          <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={onSearchChange}
              placeholder="Search"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
        ) : null}
      </View>

      {content}

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        numColumns={grid ? 3 : 1}
        columnWrapperStyle={grid ? styles.tileRow : undefined}
        renderItem={grid ? renderGridTile : renderRow}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={brand[600]} />
        }
        ListEmptyComponent={
          isLoading || error ? null : (
            <View style={styles.center}>
              <ThemedText variant="caption">Nothing here yet. Tap + to add.</ThemedText>
            </View>
          )
        }
        ListFooterComponent={
          canLoadMore ? (
            <Pressable onPress={onLoadMore} style={styles.loadMore}>
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
                {editing ? "Edit" : "Add"} {title}
              </ThemedText>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              {fields.map((f) => (
                <View key={f.name}>{renderField(f, form[f.name], setField, colors)}</View>
              ))}
              {formError ? (
                <ThemedText variant="caption" style={{ color: colors.danger, marginBottom: 10 }}>
                  {formError}
                </ThemedText>
              ) : null}
              <Button title="Save" onPress={handleSave} loading={saving} style={{ marginTop: 6 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  tileIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tileTitle: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  tileSubtitle: { fontSize: 11, textAlign: "center", marginTop: 2 },
  row: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  rowMain: { flex: 1 },
  rowTitleLine: { flexDirection: "row", alignItems: "center" },
  rowTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  rowSubtitle: { fontSize: 13, marginTop: 4 },
  rowRight: { alignItems: "flex-end", marginLeft: 10 },
  rowRightText: { fontSize: 14, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  actionChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  actionChipText: { fontSize: 12, fontWeight: "600" },
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
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalBody: { padding: 20 },
});
