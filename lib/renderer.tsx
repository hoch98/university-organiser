"use client";

import React from "react";
import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  type TextProps,
} from "@react-pdf/renderer";
import { University } from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 11,
    lineHeight: 1.5,
    fontFamily: "Helvetica",
  },
  paragraph: {
    lineHeight: 1.5,
    marginBottom: 10,
    fontSize: 12
  },
  h1: { fontSize: 18, fontWeight: "bold", marginTop: 12, marginBottom: 6 },
  h2: { fontSize: 15, fontWeight: "bold", marginTop: 10, marginBottom: 6 },
  h3: { fontSize: 13, fontWeight: "bold", marginTop: 8, marginBottom: 4 },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: "#9ca3af",
    paddingLeft: 10,
    marginVertical: 8,
    color: "#374151",
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 8,
  },
  bullet: {
    width: 14,
  },
  listContent: {
    flex: 1,
  },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
  underline: { textDecoration: "underline" },
  strike: { textDecoration: "line-through" },
});

interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
}

function collectInlineRuns(node: Node, inherited: Omit<InlineRun, "text"> = {}): InlineRun[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.textContent ?? "";
    if (!raw) return [];
    return [{ text: raw, ...inherited }];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === "br") {
    return [{ text: "\n", ...inherited }];
  }

  const nextStyle = {
    ...inherited,
    bold: inherited.bold || tag === "strong" || tag === "b" || el.style.fontWeight === "bold" || Number(el.style.fontWeight) >= 600,
    italic: inherited.italic || tag === "em" || tag === "i" || el.style.fontStyle === "italic",
    underline: inherited.underline || tag === "u" || el.style.textDecoration.includes("underline"),
    strike: inherited.strike || tag === "s" || tag === "strike" || el.style.textDecoration.includes("line-through"),
  };

  return Array.from(el.childNodes).flatMap((child) => collectInlineRuns(child, nextStyle));
}

function renderInlineRuns(runs: InlineRun[], keyPrefix: string) {
  return runs.map((run, idx) => {
    const style: NonNullable<TextProps["style"]> = [];
    if (run.bold) style.push(styles.bold);
    if (run.italic) style.push(styles.italic);
    if (run.underline) style.push(styles.underline);
    if (run.strike) style.push(styles.strike);

    return (
      <Text key={`${keyPrefix}-${idx}`} style={style.length > 0 ? style : undefined}>
        {run.text}
      </Text>
    );
  });
}

export function renderRichHtmlToPdfNodes(html: string): React.ReactNode[] {
  if (!html || typeof window === "undefined") {
    return [<Text key="empty" style={styles.paragraph}>No response written yet.</Text>];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes: React.ReactNode[] = [];

  Array.from(doc.body.childNodes).forEach((child, idx) => {
    const key = `block-${idx}`;

    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim();
      if (text) {
        nodes.push(<Text key={key} style={styles.paragraph}>{text}</Text>);
      }
      return;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "hr") {
      nodes.push(
        <View
          key={key}
          style={{ borderBottomWidth: 1, borderBottomColor: "#d1d5db", marginVertical: 10 }}
        />
      );
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === "li");
      items.forEach((li, liIdx) => {
        const marker = tag === "ol" ? `${liIdx + 1}.` : "•";
        const runs = collectInlineRuns(li);
        nodes.push(
          <View key={`${key}-li-${liIdx}`} style={styles.listItem}>
            <Text style={styles.bullet}>{marker}</Text>
            <Text style={styles.listContent}>{renderInlineRuns(runs, `${key}-li-${liIdx}`)}</Text>
          </View>
        );
      });
      return;
    }

    const runs = collectInlineRuns(el);
    const blockStyle =
      tag === "h1" ? styles.h1 :
      tag === "h2" ? styles.h2 :
      tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6" ? styles.h3 :
      tag === "blockquote" ? [styles.paragraph, styles.blockquote] :
      styles.paragraph;

    nodes.push(
      <Text key={key} style={blockStyle}>
        {renderInlineRuns(runs, key)}
      </Text>
    );
  });

  return nodes.length > 0
    ? nodes
    : [<Text key="empty" style={styles.paragraph}>No response written yet.</Text>];
}