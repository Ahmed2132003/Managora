import { Group, SegmentedControl, Stack, TextInput } from "@mantine/core";
import type { RangeOption } from "./range.ts";

const rangeOptions = [
  { label: "7 أيام", value: "7d" },
  { label: "30 يوم", value: "30d" },
  { label: "90 يوم", value: "90d" },
  { label: "مخصص", value: "custom" },
];

type RangeSelectorProps = {
  value: RangeOption;
  onChange: (value: RangeOption) => void;
  customStart?: string;
  customEnd?: string;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
};

export function RangeSelector({
  value,
  onChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: RangeSelectorProps) {
  return (
    <Stack gap="xs">
      <SegmentedControl
        value={value}
        onChange={(next) => onChange(next as RangeOption)}
        data={rangeOptions}
      />
      {value === "custom" && (
        <Group align="end">
          <TextInput
            label="من"
            type="date"
            value={customStart ?? ""}
            onChange={(event) => onCustomStartChange(event.currentTarget.value)}
          />
          <TextInput
            label="إلى"
            type="date"
            value={customEnd ?? ""}
            onChange={(event) => onCustomEndChange(event.currentTarget.value)}
          />
        </Group>
      )}
    </Stack>
  );
}