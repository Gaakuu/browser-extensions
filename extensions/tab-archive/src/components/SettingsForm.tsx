import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Typography,
} from '@mui/material';
import { type Settings, THRESHOLD_CHOICES } from '../types';
import { getMessage } from '../utils/i18n';

export function thresholdLabel(hours: number): string {
  if (hours === 0) return getMessage('thresholdOff');
  if (hours % 24 === 0) return getMessage('thresholdDays', String(hours / 24));
  return getMessage('thresholdHours', String(hours));
}

export interface SettingsFormProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export function SettingsForm({ settings, onChange }: SettingsFormProps) {
  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', p: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {getMessage('optionsTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {getMessage('optionsDescription')}
      </Typography>

      <FormControl fullWidth size="small" sx={{ mb: 3 }}>
        <InputLabel id="threshold-label">{getMessage('thresholdLabel')}</InputLabel>
        <Select
          labelId="threshold-label"
          label={getMessage('thresholdLabel')}
          value={settings.thresholdHours}
          onChange={(e) => onChange({ ...settings, thresholdHours: Number(e.target.value) })}
        >
          {THRESHOLD_CHOICES.map((hours) => (
            <MenuItem key={hours} value={hours}>
              {thresholdLabel(hours)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Switch
            checked={settings.archiveGroupedTabs}
            onChange={(e) => onChange({ ...settings, archiveGroupedTabs: e.target.checked })}
          />
        }
        label={getMessage('archiveGroupedTabsLabel')}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 6 }}>
        {getMessage('archiveGroupedTabsHelp')}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        {getMessage('omniboxHelp')}
      </Typography>
    </Box>
  );
}
