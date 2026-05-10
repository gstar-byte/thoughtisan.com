import React, { useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { 
  useEditorBridge, 
  RichText, 
  Toolbar, 
  EditorBridge,
  TenTapStartKit,
  BridgeExtension
} from '@10play/tentap-editor';

interface CapsuleEditorMobileProps {
  /** Initial content — either a Tiptap JSON string or legacy plain text. */
  content: string;
  onChange: (json: string, text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CapsuleEditorMobile({
  content,
  onChange,
  placeholder = 'Write your idea...',
  autoFocus = false,
}: CapsuleEditorMobileProps) {
  
  // Parse content for TenTap
  const getInitialContent = () => {
    if (!content) return '';
    try {
      const parsed = JSON.parse(content);
      if (parsed?.type === 'doc') return parsed;
    } catch {
      // plain text
    }
    return content;
  };

  const editor = useEditorBridge({
    autofocus: autoFocus,
    initialContent: getInitialContent(),
    bridgeExtensions: [
      ...TenTapStartKit,
    ],
  });

  // Handle updates
  useEffect(() => {
    const subscription = editor.on('update', async () => {
      const json = await editor.getJSON();
      const text = await editor.getText();
      onChange(JSON.stringify(json), text);
    });
    return () => subscription.unsubscribe();
  }, [editor, onChange]);

  return (
    <View style={styles.container}>
      <RichText 
        editor={editor} 
        style={styles.editor}
      />
      <Toolbar editor={editor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  editor: {
    flex: 1,
    padding: 8,
  },
});
