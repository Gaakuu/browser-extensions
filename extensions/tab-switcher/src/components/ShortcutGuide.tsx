import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getMessage } from '../utils/i18n';

const SHORTCUTS_URL = 'chrome://extensions/shortcuts';

function isMac(): boolean {
  return navigator.userAgent.includes('Mac');
}

interface OverrideEntry {
  commandName: string;
  keybinding: string;
  label: string;
}

const OVERRIDE_ENTRIES: OverrideEntry[] = [
  { commandName: 'show-tab-switcher', keybinding: 'Ctrl+Tab', label: 'Tab Switcher → Ctrl+Tab' },
  { commandName: 'search-tabs', keybinding: 'Ctrl+P', label: 'Search Tabs → Ctrl+P (Cmd+P)' },
];

function getDevtoolsConsoleCode(extensionId: string, entries: OverrideEntry[]): string {
  return entries
    .map(
      (e) => `chrome.developerPrivate.updateExtensionCommand({
  extensionId: "${extensionId}",
  commandName: "${e.commandName}",
  keybinding: "${e.keybinding}"
});`,
    )
    .join('\n\n');
}

export function ShortcutGuide() {
  const [commands, setCommands] = useState<chrome.commands.Command[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    chrome.commands.getAll().then(setCommands);
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SHORTCUTS_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const extensionId = chrome.runtime.id;
  const mac = isMac();
  const devtoolsShortcut = getMessage(mac ? 'devtoolsShortcutMac' : 'devtoolsShortcutOther');
  const alternative = getMessage(mac ? 'advancedCtrlTabAlternativeMac' : 'advancedCtrlTabAlternativeOther');

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold' }} gutterBottom>
        <KeyboardIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        {getMessage('optionsTitle')}
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* 現在のショートカット一覧 */}
      <Typography variant="h6" gutterBottom>
        {getMessage('currentShortcuts')}
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 4 }}>
        {commands.map((cmd) => (
          <Card key={cmd.name} variant="outlined">
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2">{cmd.description}</Typography>
              {cmd.shortcut ? (
                <Chip label={cmd.shortcut} size="small" variant="outlined" />
              ) : (
                <Chip label={getMessage('shortcutNotSet')} size="small" color="warning" variant="outlined" />
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* ショートカット変更ガイド */}
      <Typography variant="h6" gutterBottom>
        {getMessage('changeShortcuts')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {getMessage('changeShortcutsDesc')}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4, p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
          {SHORTCUTS_URL}
        </Typography>
        <Button variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={handleCopy}>
          {copied ? getMessage('copiedUrl') : getMessage('copyUrl')}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* 上級者向け: Ctrl+Tab */}
      <Typography variant="h6" gutterBottom>
        {getMessage('advancedCtrlTab')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {getMessage('advancedCtrlTabDesc')}
      </Typography>

      <Typography variant="subtitle2" gutterBottom>
        {getMessage('advancedCtrlTabSteps')}
      </Typography>
      <Box component="ol" sx={{ pl: 2.5, mb: 2, '& li': { mb: 1 } }}>
        <li>
          <Typography variant="body2">{getMessage('advancedCtrlTabStep1')}</Typography>
        </li>
        <li>
          <Typography variant="body2">{getMessage('advancedCtrlTabStep2', devtoolsShortcut)}</Typography>
        </li>
        <li>
          <Typography variant="body2">{getMessage('advancedCtrlTabStep3')}</Typography>
        </li>
      </Box>

      <Box
        data-testid="devtools-code"
        sx={{
          p: 2,
          bgcolor: 'grey.900',
          color: 'grey.100',
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: 12,
          whiteSpace: 'pre',
          overflow: 'auto',
          mb: 2,
        }}
      >
        {getDevtoolsConsoleCode(extensionId, OVERRIDE_ENTRIES)}
      </Box>

      <Alert severity="warning" icon={<WarningAmberIcon />}>
        <Typography variant="body2">
          {getMessage('advancedCtrlTabTradeoff', alternative)}
        </Typography>
      </Alert>
    </Container>
  );
}
